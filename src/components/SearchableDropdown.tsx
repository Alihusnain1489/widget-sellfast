'use client'

import { useState, useRef, useLayoutEffect } from 'react'

interface SearchableDropdownProps {
  options: Array<{ id: string; name: string; icon?: string | null }>
  value: string | string[]
  onChange: (value: string | string[]) => void
  placeholder?: string
  multiple?: boolean
  label?: string
  required?: boolean
  disabled?: boolean
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Search and select...',
  multiple = false,
  label,
  required = false,
  disabled = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter(option =>
    option.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedValues = multiple
    ? (Array.isArray(value) ? value : [])
    : (value ? [value] : [])

  const handleSelect = (optionId: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.includes(optionId)) {
        onChange(currentValues.filter(id => id !== optionId))
      } else {
        onChange([...currentValues, optionId])
      }
    } else {
      onChange(optionId)
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  const handleRemove = (optionId: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      onChange(currentValues.filter(id => id !== optionId))
    }
  }

  useLayoutEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOptions = options.filter(opt => selectedValues.includes(opt.id))

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Selected values display */}
      {multiple && selectedOptions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedOptions.map(opt => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
            >
              {opt.icon && <span>{opt.icon}</span>}
              <span>{opt.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(opt.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
      >
        {multiple ? (
          <span className="text-gray-500">
            {selectedOptions.length > 0
              ? `${selectedOptions.length} selected`
              : placeholder}
          </span>
        ) : (
          <span className={selectedOptions[0] ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOptions[0] ? (
              <span className="flex items-center gap-2">
                {selectedOptions[0].icon && <span>{selectedOptions[0].icon}</span>}
                <span>{selectedOptions[0].name}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
        )}
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                      isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    {multiple && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mr-2"
                        readOnly
                      />
                    )}
                    {option.icon && <span>{option.icon}</span>}
                    <span>{option.name}</span>
                    {isSelected && !multiple && (
                      <span className="ml-auto text-blue-600">✓</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

