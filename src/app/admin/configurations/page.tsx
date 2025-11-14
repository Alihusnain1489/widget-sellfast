'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  icon?: string
}

interface CategorySpecification {
  id?: string
  name: string
  valueType: string
  options?: string | string[]
  icon?: string
  order?: number
  isRequired: boolean
}

// Fallback common specs if no database specs are available
const FALLBACK_COMMON_SPECS = [
  { name: 'RAM', valueType: 'select', options: ['4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB'] },
  { name: 'Storage (SSD)', valueType: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB', '4TB'] },
  { name: 'Storage (HDD)', valueType: 'select', options: ['500GB', '1TB', '2TB', '4TB', '8TB'] },
  { name: 'Processor', valueType: 'select', options: [] },
  { name: 'Screen Size', valueType: 'select', options: [] },
  { name: 'Weight', valueType: 'select', options: [] },
  { name: 'Battery Life', valueType: 'select', options: [] },
  { name: 'Graphics Card', valueType: 'select', options: [] },
  { name: 'Operating System', valueType: 'select', options: [] },
  { name: 'Display Resolution', valueType: 'select', options: [] },
  { name: 'Camera', valueType: 'select', options: [] },
  { name: 'Front Camera', valueType: 'select', options: [] },
  { name: 'Connectivity', valueType: 'select', options: [] },
  { name: 'Network', valueType: 'select', options: [] },
  { name: 'SIM Card', valueType: 'select', options: [] },
  { name: 'Storage Type', valueType: 'select', options: [] },
  { name: 'Display Type', valueType: 'select', options: [] },
  { name: 'Refresh Rate', valueType: 'select', options: [] },
  { name: 'Color', valueType: 'select', options: [] },
  { name: 'Warranty', valueType: 'select', options: [] },
  { name: 'Condition', valueType: 'select', options: [] }
]

export default function AdminConfigurationsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [specifications, setSpecifications] = useState<CategorySpecification[]>([])
  const [commonSpecs, setCommonSpecs] = useState<Array<{ name: string; valueType: string; options?: string | string[]; icon?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // New spec form
  const [showNewSpec, setShowNewSpec] = useState(false)
  const [newSpec, setNewSpec] = useState<CategorySpecification>({
    name: '',
    valueType: 'select',
    options: [],
    isRequired: false
  })
  const [newSpecOption, setNewSpecOption] = useState('')
  const [availableOptions, setAvailableOptions] = useState<string[]>([])
  const [showOptionSelector, setShowOptionSelector] = useState(false)
  
  // Editing
  const [editingSpec, setEditingSpec] = useState<CategorySpecification | null>(null)
  
  // Multiple selection
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set())

  useLayoutEffect(() => {
    fetchCategories()
    fetchCommonSpecs()
  }, [])

  useLayoutEffect(() => {
    if (selectedCategory) {
      fetchSpecifications()
      fetchAllOptions()
      fetchCommonSpecs() // Refresh common specs when category changes
      setSelectedSpecs(new Set()) // Clear selection when category changes
    } else {
      setSpecifications([])
      setSelectedSpecs(new Set())
      setAvailableOptions([])
    }
  }, [selectedCategory])

  // Refresh common specs when window regains focus (user might have created new specs)
  useLayoutEffect(() => {
    const handleFocus = () => {
      fetchCommonSpecs()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const fetchAllOptions = async () => {
    try {
      const res = await fetch('/api/admin/category-specifications')
      if (res.ok) {
        const data = await res.json()
        const allOptions = new Set<string>()
        ;(data.specifications || []).forEach((spec: any) => {
          if (spec.options) {
            try {
              const parsed = typeof spec.options === 'string' ? JSON.parse(spec.options) : spec.options
              if (Array.isArray(parsed)) {
                parsed.forEach((opt: string) => allOptions.add(opt))
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        })
        setAvailableOptions(Array.from(allOptions).sort())
      }
    } catch (error) {
      console.error('Error fetching all options:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchCommonSpecs = async () => {
    try {
      const res = await fetch('/api/admin/specifications', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const specs = (data.specifications || []).map((spec: any) => {
          let options: string[] = []
          if (spec.options) {
            try {
              options = typeof spec.options === 'string' ? JSON.parse(spec.options) : spec.options
            } catch (e) {
              options = []
            }
          }
          return {
            name: spec.name,
            valueType: spec.valueType,
            options: options,
            icon: spec.icon
          }
        })
        // Remove duplicates by name
        const uniqueSpecs: Array<{ name: string; valueType: string; options?: string | string[]; icon?: string }> = Array.from(
          new Map(specs.map((s: any) => [s.name, s])).values()
        ) as Array<{ name: string; valueType: string; options?: string | string[]; icon?: string }>
        setCommonSpecs(uniqueSpecs.length > 0 ? uniqueSpecs : FALLBACK_COMMON_SPECS)
      } else {
        // Fallback to default specs if API fails
        setCommonSpecs(FALLBACK_COMMON_SPECS)
      }
    } catch (error) {
      console.error('Error fetching common specs:', error)
      // Fallback to default specs on error
      setCommonSpecs(FALLBACK_COMMON_SPECS)
    }
  }

  const fetchSpecifications = async () => {
    if (!selectedCategory) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/category-specifications?categoryId=${selectedCategory.id}`)
      if (res.ok) {
        const data = await res.json()
        const specs = (data.specifications || []).map((spec: any) => ({
          id: spec.id,
          name: spec.name,
          valueType: spec.valueType,
          options: spec.options ? (typeof spec.options === 'string' ? JSON.parse(spec.options) : spec.options) : [],
          icon: spec.icon,
          order: spec.order,
          isRequired: spec.isRequired
        }))
        setSpecifications(specs.sort((a: CategorySpecification, b: CategorySpecification) => {
          const orderA = a.order ?? 999
          const orderB = b.order ?? 999
          return orderA - orderB
        }))
      }
    } catch (error) {
      console.error('Error fetching specifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCommonSpec = (spec: { name: string; valueType: string; options?: string | string[]; icon?: string }) => {
    const exists = specifications.some(s => s.name === spec.name)
    if (exists) {
      alert('This specification already exists')
      return
    }

    const newSpec: CategorySpecification = {
      name: spec.name,
      valueType: spec.valueType,
      options: spec.options || [],
      isRequired: false,
      order: specifications.length + 1
    }
    setSpecifications([...specifications, newSpec])
  }

  const handleAddNewSpec = () => {
    if (!newSpec.name.trim()) {
      alert('Please enter a specification name')
      return
    }

    const exists = specifications.some(s => s.name === newSpec.name)
    if (exists) {
      alert('This specification already exists')
      return
    }

    const specToAdd: CategorySpecification = {
      ...newSpec,
      order: specifications.length + 1
    }
    setSpecifications([...specifications, specToAdd])
    setNewSpec({ name: '', valueType: 'select', options: [], isRequired: false })
    setNewSpecOption('')
    setShowNewSpec(false)
  }

  const handleAddOption = () => {
    if (!newSpecOption.trim()) return
    const options = Array.isArray(newSpec.options) ? [...newSpec.options] : []
    if (!options.includes(newSpecOption.trim())) {
      setNewSpec({ ...newSpec, options: [...options, newSpecOption.trim()] })
      setNewSpecOption('')
      // Add to available options if not already there
      if (!availableOptions.includes(newSpecOption.trim())) {
        setAvailableOptions([...availableOptions, newSpecOption.trim()].sort())
      }
    }
  }

  const handleSelectExistingOption = (option: string) => {
    const options = Array.isArray(newSpec.options) ? [...newSpec.options] : []
    if (!options.includes(option)) {
      setNewSpec({ ...newSpec, options: [...options, option] })
    }
    setShowOptionSelector(false)
  }

  const handleRemoveOption = (option: string) => {
    const options = Array.isArray(newSpec.options) ? newSpec.options.filter(o => o !== option) : []
    setNewSpec({ ...newSpec, options })
  }

  const handleEditSpec = (spec: CategorySpecification) => {
    setEditingSpec({ ...spec })
    setNewSpec({ ...spec })
    setShowNewSpec(true)
  }

  const handleUpdateSpec = () => {
    if (!editingSpec || !newSpec.name.trim()) {
      alert('Please enter a specification name')
      return
    }

    const otherSpecs = specifications.filter(s => s.id !== editingSpec.id)
    const exists = otherSpecs.some(s => s.name === newSpec.name)
    if (exists) {
      alert('This specification name already exists')
      return
    }

    setSpecifications(specifications.map(s => 
      s.id === editingSpec.id ? { ...newSpec, id: editingSpec.id } : s
    ))
    setEditingSpec(null)
    setNewSpec({ name: '', valueType: 'select', options: [], isRequired: false })
    setNewSpecOption('')
    setShowNewSpec(false)
  }

  const handleDeleteSpec = (spec: CategorySpecification) => {
    if (spec.id) {
      // Delete from database
      fetch(`/api/admin/category-specifications/${spec.id}`, {
        method: 'DELETE'
      }).then(() => {
        setSpecifications(specifications.filter(s => s.id !== spec.id))
        // Remove from selection if selected
        const newSelected = new Set(selectedSpecs)
        newSelected.delete(spec.id || spec.name)
        setSelectedSpecs(newSelected)
      }).catch(error => {
        console.error('Error deleting specification:', error)
        alert('Failed to delete specification')
      })
    } else {
      // Remove from local state
      setSpecifications(specifications.filter(s => s.name !== spec.name))
      // Remove from selection if selected
      const newSelected = new Set(selectedSpecs)
      newSelected.delete(spec.name)
      setSelectedSpecs(newSelected)
    }
  }

  const handleToggleSpecSelection = (spec: CategorySpecification) => {
    const specKey = spec.id || spec.name
    const newSelected = new Set(selectedSpecs)
    if (newSelected.has(specKey)) {
      newSelected.delete(specKey)
    } else {
      newSelected.add(specKey)
    }
    setSelectedSpecs(newSelected)
  }

  const handleSelectAllOptional = () => {
    const optionalSpecs = specifications.filter(s => !s.isRequired)
    if (optionalSpecs.length === 0) return
    
    const allOptionalSelected = optionalSpecs.every(s => selectedSpecs.has(s.id || s.name))
    
    const newSelected = new Set(selectedSpecs)
    if (allOptionalSelected) {
      // Deselect all optional
      optionalSpecs.forEach(s => newSelected.delete(s.id || s.name))
    } else {
      // Select all optional
      optionalSpecs.forEach(s => newSelected.add(s.id || s.name))
    }
    setSelectedSpecs(newSelected)
  }

  const handleBulkDelete = () => {
    if (selectedSpecs.size === 0) return
    
    const specsToDelete = specifications.filter(s => selectedSpecs.has(s.id || s.name))
    
    // Delete all selected specs
    const deletePromises = specsToDelete.map(spec => {
      if (spec.id) {
        return fetch(`/api/admin/category-specifications/${spec.id}`, {
          method: 'DELETE'
        }).catch(error => {
          console.error(`Error deleting specification ${spec.name}:`, error)
          return null
        })
      }
      return Promise.resolve(null)
    })
    
    Promise.all(deletePromises).then(() => {
      setSpecifications(specifications.filter(s => !selectedSpecs.has(s.id || s.name)))
      setSelectedSpecs(new Set())
    })
  }

  const handleBulkToggleRequired = () => {
    if (selectedSpecs.size === 0) return
    
    const specsToUpdate = specifications.filter(s => selectedSpecs.has(s.id || s.name))
    const allAreRequired = specsToUpdate.every(s => s.isRequired)
    const newRequiredStatus = !allAreRequired
    
    setSpecifications(specifications.map(s => {
      if (selectedSpecs.has(s.id || s.name)) {
        return { ...s, isRequired: newRequiredStatus }
      }
      return s
    }))
  }

  const handleToggleRequired = (spec: CategorySpecification) => {
    setSpecifications(specifications.map(s =>
      s.id === spec.id ? { ...s, isRequired: !s.isRequired } : s
    ))
  }

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    const newSpecs = [...specifications]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newSpecs.length) return

    const temp = newSpecs[index]
    newSpecs[index] = newSpecs[targetIndex]
    newSpecs[targetIndex] = temp

    // Update order numbers
    newSpecs.forEach((spec, idx) => {
      spec.order = idx + 1
    })

    setSpecifications(newSpecs)
  }

  const handleSave = async () => {
    if (!selectedCategory) {
      alert('Please select a category')
      return
    }

    if (specifications.length === 0) {
      if (!confirm('No specifications configured. Do you want to save anyway?')) {
        return
      }
    }

    setSaving(true)
    try {
      const specsToSave = specifications.map((spec, index) => {
        // Handle options - ensure it's in the right format
        let optionsValue: string | null = null
        if (spec.options) {
          if (Array.isArray(spec.options)) {
            optionsValue = JSON.stringify(spec.options)
          } else if (typeof spec.options === 'string') {
            // If it's already a JSON string, use it as is
            // Otherwise, try to parse it first
            try {
              JSON.parse(spec.options)
              optionsValue = spec.options
            } catch {
              // If it's not valid JSON, treat as a single value array
              optionsValue = JSON.stringify([spec.options])
            }
          }
        }
        
        return {
          name: spec.name,
          valueType: spec.valueType,
          options: optionsValue,
          icon: spec.icon || null,
          order: spec.order ?? index + 1,
          isRequired: spec.isRequired === true
        }
      })

      console.log('Saving specifications:', JSON.stringify(specsToSave, null, 2))

      const res = await fetch('/api/admin/category-specifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          specifications: specsToSave
        })
      })

      const responseData = await res.json()

      if (res.ok) {
        alert('Configuration saved successfully!')
        setSelectedSpecs(new Set()) // Clear selection after save
        fetchSpecifications()
        fetchAllOptions() // Refresh available options
      } else {
        console.error('Save error response:', responseData)
        alert(`Failed to save: ${responseData.error || responseData.details || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error saving configuration:', error)
      alert(`Failed to save configuration: ${error.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6 xl:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Category Specifications Configuration
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Configure default and optional specifications for each category
          </p>
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Category
          </label>
          <select
            value={selectedCategory?.id || ''}
            onChange={(e) => {
              const category = categories.find(c => c.id === e.target.value)
              setSelectedCategory(category || null)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          >
            <option value="">-- Select a category --</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <>
            {/* Common Specifications */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Common Specifications
                </h2>
                <button
                  onClick={() => {
                    window.open('/admin/specifications', '_blank')
                  }}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Create New Specification
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Select from existing specifications or create new ones in the Specifications page
              </p>
              <div className="flex flex-wrap gap-2">
                {commonSpecs.map(spec => {
                  const exists = specifications.some(s => s.name === spec.name)
                  return (
                    <button
                      key={spec.name}
                      onClick={() => handleAddCommonSpec(spec)}
                      disabled={exists}
                      className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-1 ${
                        exists
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {spec.icon && <span>{spec.icon}</span>}
                      <span>{spec.name}</span>
                      {exists && <span>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Specifications List */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Configured Specifications
                  </h2>
                  {specifications.filter(s => !s.isRequired).length > 0 && (
                    <button
                      onClick={handleSelectAllOptional}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      {specifications.filter(s => !s.isRequired).every(s => selectedSpecs.has(s.id || s.name))
                        ? 'Deselect All Optional'
                        : 'Select All Optional'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedSpecs.size > 0 && (
                    <>
                      <button
                        onClick={handleBulkToggleRequired}
                        className="px-3 py-1.5 text-xs bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Toggle Required ({selectedSpecs.size})
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete ({selectedSpecs.size})
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setEditingSpec(null)
                      setNewSpec({ name: '', valueType: 'select', options: [], isRequired: false })
                      setNewSpecOption('')
                      setShowNewSpec(true)
                    }}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    + New Specification
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : specifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No specifications configured. Add some to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {specifications.map((spec, index) => (
                    <div
                      key={spec.id || spec.name}
                      className={`border rounded-lg p-3 sm:p-4 flex items-start justify-between gap-3 ${
                        selectedSpecs.has(spec.id || spec.name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2 flex-shrink-0">
                        {!spec.isRequired && (
                          <input
                            type="checkbox"
                            checked={selectedSpecs.has(spec.id || spec.name)}
                            onChange={() => handleToggleSpecSelection(spec)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm sm:text-base text-gray-900">
                            {spec.name}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            spec.isRequired
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {spec.isRequired ? 'Required' : 'Optional'}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({spec.valueType})
                          </span>
                        </div>
                        {Array.isArray(spec.options) && spec.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {spec.options.slice(0, 5).map((opt, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {opt}
                              </span>
                            ))}
                            {spec.options.length > 5 && (
                              <span className="px-2 py-0.5 text-gray-500 text-xs">
                                +{spec.options.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleReorder(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleReorder(index, 'down')}
                          disabled={index === specifications.length - 1}
                          className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleToggleRequired(spec)}
                          className={`px-2 py-1 text-xs rounded ${
                            spec.isRequired
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {spec.isRequired ? 'Required' : 'Optional'}
                        </button>
                        <button
                          onClick={() => handleEditSpec(spec)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSpec(spec)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white text-sm sm:text-base rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}

        {/* New/Edit Spec Modal */}
        {showNewSpec && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingSpec ? 'Edit Specification' : 'Add New Specification'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specification Name *
                  </label>
                  <input
                    type="text"
                    value={newSpec.name}
                    onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    placeholder="e.g., RAM, Storage, Processor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value Type *
                  </label>
                  <select
                    value={newSpec.valueType}
                    onChange={(e) => setNewSpec({ ...newSpec, valueType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  >
                    <option value="select">Select (Dropdown)</option>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                </div>

                {/* Options section - available for all value types */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Options {newSpec.valueType === 'select' && '(for dropdown)'}
                    </label>
                    {availableOptions.length > 0 && (
                      <button
                        onClick={() => setShowOptionSelector(!showOptionSelector)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {showOptionSelector ? 'Hide' : 'Select from existing'} ({availableOptions.length})
                      </button>
                    )}
                  </div>
                  
                  {/* Existing options selector */}
                  {showOptionSelector && availableOptions.length > 0 && (
                    <div className="mb-2 p-2 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                      <div className="flex flex-wrap gap-1">
                        {availableOptions
                          .filter(opt => !Array.isArray(newSpec.options) || !newSpec.options.includes(opt))
                          .map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectExistingOption(opt)}
                              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300 text-gray-700"
                            >
                              {opt}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSpecOption}
                      onChange={(e) => setNewSpecOption(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      placeholder="Enter new option and press Enter"
                    />
                    <button
                      onClick={handleAddOption}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                    >
                      Add
                    </button>
                  </div>
                  
                  {Array.isArray(newSpec.options) && newSpec.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newSpec.options.map((opt, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                        >
                          {opt}
                          <button
                            onClick={() => handleRemoveOption(opt)}
                            className="text-blue-700 hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={newSpec.isRequired}
                    onChange={(e) => setNewSpec({ ...newSpec, isRequired: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isRequired" className="text-sm font-medium text-gray-700">
                    Required (Default Specification)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowNewSpec(false)
                      setEditingSpec(null)
                      setNewSpec({ name: '', valueType: 'select', options: [], isRequired: false })
                      setNewSpecOption('')
                      setShowOptionSelector(false)
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingSpec ? handleUpdateSpec : handleAddNewSpec}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                  >
                    {editingSpec ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

