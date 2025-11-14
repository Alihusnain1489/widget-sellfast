'use client'

import { useState, useRef } from 'react'

interface IconSelectorProps {
  iconType: 'default' | 'url' | 'image'
  icon: string
  onIconTypeChange: (type: 'default' | 'url' | 'image') => void
  onIconChange: (icon: string) => void
}

export default function IconSelector({ iconType, icon, onIconTypeChange, onIconChange }: IconSelectorProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(icon && iconType === 'image' ? icon : null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pasteInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImagePreview(base64String)
        onIconChange(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64String = reader.result as string
            setImagePreview(base64String)
            onIconChange(base64String)
          }
          reader.readAsDataURL(file)
        }
      } else if (items[i].type === 'text/plain') {
        items[i].getAsString((text) => {
          // Check if it's a data URL or image URL
          if (text.startsWith('data:image/') || text.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
            setImagePreview(text)
            onIconChange(text)
          }
        })
      }
    }
  }

  const handleImageUrlChange = (url: string) => {
    onIconChange(url)
    if (url.startsWith('data:') || url.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">  Icon label </label>
      <div className="mb-2">
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => onIconTypeChange('image')}
            className={`px-3 py-1 text-sm rounded ${iconType === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Image
          </button>
          <button
            type="button"
            onClick={() => onIconTypeChange('url')}
            className={`px-3 py-1 text-sm rounded ${iconType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Image URL
          </button>
        </div>

        {iconType === 'image' ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">Paste image here or upload</p>
            <input
              ref={pasteInputRef}
              type="text"
              placeholder="Paste image (Ctrl+V or Cmd+V)"
              onPaste={handlePaste}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <p className="text-xs text-gray-400 mt-2">OR</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {imagePreview && (
              <div className="mt-4">
                <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded mx-auto" />
              </div>
            )}
          </div>
        ) : iconType === 'url' ? (
          <input
            type="url"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={icon}
            onChange={(e) => handleImageUrlChange(e.target.value)}
            placeholder="https://example.com/icon.png"
          />
        ) : null}
      </div>
    </div>
  )
}