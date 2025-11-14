'use client'

import { useState, useRef } from 'react'
import { DEFAULT_ICONS } from '@/lib/default-icons'

interface CategoryIconSelectorProps {
  iconType: 'default' | 'url' | 'image' | 'public'
  icon: string
  onIconTypeChange: (type: 'default' | 'url' | 'image' | 'public') => void
  onIconChange: (icon: string) => void
  allowPublicFolder: boolean
}

// Public folder images available for categories
const PUBLIC_CATEGORY_IMAGES = [
  { name: 'laptop', path: '/laptop-C6ph2krw.webp', label: 'Laptop' },
  { name: 'phone', path: '/phone-Nn2FaDfg.webp', label: 'Phone' },
  { name: 'tablet', path: '/tablet-D3VKCiEs.webp', label: 'Tablet' },
  { name: 'watch', path: '/watch-BLVa_7Dj.webp', label: 'Watch' },
]

export default function CategoryIconSelector({ 
  iconType, 
  icon, 
  onIconTypeChange, 
  onIconChange,
  allowPublicFolder 
}: CategoryIconSelectorProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(icon && iconType === 'image' ? icon : null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pasteInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (2MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      alert('Image size must be less than 2MB')
      return
    }

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
          // Check file size
          const maxSize = 2 * 1024 * 1024
          if (file.size > maxSize) {
            alert('Image size must be less than 2MB')
            return
          }

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
          if (text.startsWith('data:image/')) {
            // Check data URL size (approximate)
            const base64Data = text.split(',')[1]
            if (base64Data && base64Data.length * 0.75 > 2 * 1024 * 1024) {
              alert('Image size must be less than 2MB')
              return
            }
            setImagePreview(text)
            onIconChange(text)
          } else if (text.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
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

  const handlePublicImageSelect = (imagePath: string) => {
    onIconChange(imagePath)
    setImagePreview(null) // Clear preview for public images
  }

  return (
    <div>
      <div className="mb-2">
        {!allowPublicFolder ? (
          // For new categories: only show image upload option
          <div className="text-sm text-gray-600 mb-2">
            Upload an image (Max 2MB) or use default icon based on category name
          </div>
        ) : (
          // For existing categories: show all options
          <div className="flex gap-2 mb-2 flex-wrap">
            <button
              type="button"
              onClick={() => onIconTypeChange('public')}
              className={`px-3 py-1 text-sm rounded ${iconType === 'public' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Public Images
            </button>
            <button
              type="button"
              onClick={() => onIconTypeChange('default')}
              className={`px-3 py-1 text-sm rounded ${iconType === 'default' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Default Icons
            </button>
            <button
              type="button"
              onClick={() => onIconTypeChange('image')}
              className={`px-3 py-1 text-sm rounded ${iconType === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => onIconTypeChange('url')}
              className={`px-3 py-1 text-sm rounded ${iconType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Image URL
            </button>
          </div>
        )}
        
        {iconType === 'public' && allowPublicFolder ? (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
            {PUBLIC_CATEGORY_IMAGES.map((img) => (
              <button
                key={img.path}
                type="button"
                onClick={() => handlePublicImageSelect(img.path)}
                className={`p-2 border-2 rounded hover:bg-gray-100 ${
                  icon === img.path ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                title={img.label}
              >
                <img src={img.path} alt={img.label} className="w-8 h-8 object-contain mx-auto" />
              </button>
            ))}
          </div>
        ) : iconType === 'default' && allowPublicFolder ? (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
            {DEFAULT_ICONS.map((defaultIcon) => (
              <button
                key={defaultIcon.name}
                type="button"
                onClick={() => onIconChange(defaultIcon.name)}
                className={`p-2 border-2 rounded hover:bg-gray-100 ${
                  icon === defaultIcon.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                title={defaultIcon.label}
              >
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: defaultIcon.svg }} />
              </button>
            ))}
          </div>
        ) : iconType === 'image' ? (
          <div className="space-y-2">
            <div className="border border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center">
              {imagePreview ? (
                <div className="relative w-full">
                  <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null)
                      onIconChange('')
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-2">Paste image here or upload (Max 2MB)</p>
                  <input
                    ref={pasteInputRef}
                    type="text"
                    placeholder="Paste image (Ctrl+V or Cmd+V)"
                    onPaste={handlePaste}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                </div>
              )}
            </div>
          </div>
        ) : (
          <input
            type="url"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={icon}
            onChange={(e) => handleImageUrlChange(e.target.value)}
            placeholder="https://example.com/icon.png"
          />
        )}
      </div>
    </div>
  )
}

