'use client'

import { useState, useLayoutEffect, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Chat {
  id: string
  buyer: {
    id: string
    name: string
    image?: string
  }
  seller: {
    id: string
    name: string
    image?: string
  }
  listing: {
    id: string
    title: string
  }
        deal?: {
          id: string
          amount: number
          status: string
          isSuccess?: boolean | null
        }
  messages: ChatMessage[]
}

interface ChatMessage {
  id: string
  senderId: string
  message?: string
  latitude?: number
  longitude?: number
  isLocation: boolean
  isBlocked: boolean
  blockReason?: string
  createdAt: string
}

export default function ChatsPage() {
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sharingLocation, setSharingLocation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
        } catch (e) {
          console.error('Error parsing user data:', e)
          router.push('/login')
        }
      } else {
        router.push('/login')
      }
    }
    checkUser()
  }, [router])

  useLayoutEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user])

  useEffect(() => {
    if (selectedChat) {
      scrollToBottom()
      // Poll for new messages every 3 seconds
      const interval = setInterval(() => {
        fetchChatMessages(selectedChat.id)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedChat])

  const fetchChats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/chats', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setChats(data.chats || [])
        if (data.chats && data.chats.length > 0 && !selectedChat) {
          setSelectedChat(data.chats[0])
          fetchChatMessages(data.chats[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchChatMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === chatId 
              ? { ...chat, messages: data.messages || [] }
              : chat
          )
        )
        if (selectedChat?.id === chatId) {
          setSelectedChat(prev => 
            prev ? { ...prev, messages: data.messages || [] } : null
          )
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat) return

    setSending(true)
    try {
      const res = await fetch(`/api/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      })

      if (res.ok) {
        setMessage('')
        fetchChatMessages(selectedChat.id)
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleMarkDealComplete = async (dealId: string, isSuccess: boolean) => {
    if (!confirm(`Are you sure you want to mark this deal as ${isSuccess ? 'successful' : 'unsuccessful'}?`)) {
      return
    }

    try {
      const res = await fetch(`/api/deals/${dealId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuccess })
      })

      if (res.ok) {
        alert(`Deal marked as ${isSuccess ? 'successful' : 'unsuccessful'}`)
        fetchChats()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to mark deal')
      }
    } catch (error) {
      console.error('Error marking deal:', error)
      alert('Failed to mark deal')
    }
  }

  const handleShareLocation = async () => {
    if (!selectedChat) return

    setSharingLocation(true)
    try {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser')
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch(`/api/chats/${selectedChat.id}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                isLocation: true
              })
            })

            if (res.ok) {
              fetchChatMessages(selectedChat.id)
            } else {
              alert('Failed to share location')
            }
          } catch (error) {
            console.error('Error sharing location:', error)
            alert('Failed to share location')
          } finally {
            setSharingLocation(false)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Failed to get your location')
          setSharingLocation(false)
        }
      )
    } catch (error) {
      console.error('Error sharing location:', error)
      setSharingLocation(false)
    }
  }

  const getOtherUser = (chat: Chat) => {
    return user.id === chat.buyer.id ? chat.seller : chat.buyer
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Chat List */}
      <div className="w-1/3 border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Chats</h2>
        </div>
        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
          {chats.length > 0 ? (
            chats.map(chat => {
              const otherUser = getOtherUser(chat)
              const lastMessage = chat.messages && chat.messages.length > 0
                ? chat.messages[chat.messages.length - 1]
                : null
              
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setSelectedChat(chat)
                    fetchChatMessages(chat.id)
                  }}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedChat?.id === chat.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {otherUser.image ? (
                      <img
                        src={otherUser.image}
                        alt={otherUser.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600">{otherUser.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{otherUser.name}</div>
                      <div className="text-sm text-gray-600 truncate">
                        {lastMessage?.isLocation ? '📍 Shared location' :
                         lastMessage?.isBlocked ? '⚠️ Message blocked' :
                         lastMessage?.message || 'No messages yet'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-4 text-center text-gray-500">
              No chats yet
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const otherUser = getOtherUser(selectedChat)
                    return (
                      <>
                        {otherUser.image ? (
                          <img
                            src={otherUser.image}
                            alt={otherUser.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600">{otherUser.name.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold">{otherUser.name}</div>
                          <div className="text-sm text-gray-600">{selectedChat.listing.title}</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
                {selectedChat.deal && (
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Deal Amount</div>
                    <div className="font-semibold text-lg text-[#F56A34]">
                      ${selectedChat.deal.amount.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-100" style={{ height: 'calc(100vh - 200px)' }}>
              {selectedChat.messages && selectedChat.messages.length > 0 ? (
                selectedChat.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`mb-4 flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.senderId === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900'
                    } ${msg.isBlocked ? 'opacity-50' : ''}`}>
                      {msg.isBlocked ? (
                        <div className="text-sm">
                          ⚠️ Message blocked: {msg.blockReason || 'Contains prohibited content'}
                        </div>
                      ) : msg.isLocation ? (
                        <div>
                          <div className="text-sm mb-2">📍 Shared location</div>
                          <a
                            href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline"
                          >
                            View on Google Maps
                          </a>
                        </div>
                      ) : (
                        <div>{msg.message}</div>
                      )}
                      <div className={`text-xs mt-1 ${
                        msg.senderId === user.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                />
                <button
                  onClick={handleShareLocation}
                  disabled={sharingLocation}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  title="Share location"
                >
                  {sharingLocation ? '...' : '📍'}
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !message.trim()}
                  className="px-6 py-2 bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}

