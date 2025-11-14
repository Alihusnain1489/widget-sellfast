'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import CategoryIconSelector from '@/components/CategoryIconSelector'
import { DEFAULT_ICONS } from '@/lib/default-icons'

interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  _count?: {
    items: number
  }
}

export default function AdminCategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    iconType: 'default' as 'default' | 'url' | 'image' | 'public'
  })
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    category: Category | null
    transferOptions: Array<{ id: string; name: string }>
  }>({
    isOpen: false,
    category: null,
    transferOptions: []
  })
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [replaceModal, setReplaceModal] = useState<{
    isOpen: boolean
    existingCategory: Category | null
    newCategoryData: { name: string; description: string; icon: string | null } | null
  }>({
    isOpen: false,
    existingCategory: null,
    newCategoryData: null
  })

  useLayoutEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingCategory(null)
    setFormData({ name: '', description: '', icon: '', iconType: 'image' }) // New categories only use image upload
    setShowModal(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    // Determine icon type: check if it's from public folder
    let iconType: 'default' | 'url' | 'image' | 'public' = 'default'
    if (category.icon) {
      if (category.icon.startsWith('data:')) {
        iconType = 'image'
      } else if (category.icon.startsWith('http') || category.icon.startsWith('/')) {
        // Check if it's from public folder (starts with /)
        if (category.icon.startsWith('/')) {
          iconType = 'public'
        } else {
          iconType = 'url'
        }
      }
    }
    setFormData({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '',
      iconType
    })
    setShowModal(true)
  }

  const handleReplaceCategory = async (overwrite: boolean) => {
    if (!replaceModal.existingCategory || !replaceModal.newCategoryData) return

    try {
      if (overwrite) {
        // Update existing category with new data
        const res = await fetch(`/api/admin/categories/${replaceModal.existingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: replaceModal.newCategoryData.name,
            description: replaceModal.newCategoryData.description,
            icon: replaceModal.newCategoryData.icon
          })
        })

        if (res.ok) {
          setReplaceModal({ isOpen: false, existingCategory: null, newCategoryData: null })
          setShowModal(false)
          fetchCategories()
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to update category')
        }
      } else {
        // Cancel - just close modals
        setReplaceModal({ isOpen: false, existingCategory: null, newCategoryData: null })
      }
    } catch (error) {
      console.error('Error replacing category:', error)
      alert('Failed to replace category')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories'
      const method = editingCategory ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          icon: formData.icon || null
        })
      })

      const data = await res.json()

      if (res.ok) {
        setShowModal(false)
        fetchCategories()
      } else if (res.status === 409 && data.conflict) {
        // Category already exists - show replace/overwrite modal
        setReplaceModal({
          isOpen: true,
          existingCategory: data.category,
          newCategoryData: {
            name: formData.name,
            description: formData.description,
            icon: formData.icon || null
          }
        })
      } else {
        const errorMessage = data.error || data.message || 'Failed to save category'
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Failed to save category')
    }
  }

  const handleDeleteClick = async (category: Category) => {
    // Check if category has associated data
    const hasData = (category._count?.items || 0) > 0
    
    if (!hasData) {
      // No data, delete directly without notification
      try {
        const res = await fetch(`/api/admin/categories/${category.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })

        if (res.ok) {
          fetchCategories()
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to delete category')
        }
      } catch (error) {
        console.error('Error deleting category:', error)
        alert('Failed to delete category')
      }
      return
    }

    // Has data, show modal with transfer options
    const otherCategories = categories.filter(c => c.id !== category.id)
    setDeleteModal({
      isOpen: true,
      category,
      transferOptions: otherCategories.map(c => ({ id: c.id, name: c.name }))
    })
  }

  const handleDeleteConfirm = async (transferToId?: string) => {
    if (!deleteModal.category) return

    try {
      const res = await fetch(`/api/admin/categories/${deleteModal.category.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferToId ? { transferTo: transferToId } : {})
      })

      if (res.ok) {
        setDeleteModal({ isOpen: false, category: null, transferOptions: [] })
        const newSelected = new Set(selectedCategories)
        newSelected.delete(deleteModal.category.id)
        setSelectedCategories(newSelected)
        fetchCategories()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    }
  }

  const handleToggleSelection = (categoryId: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategories(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedCategories.size === categories.length) {
      setSelectedCategories(new Set())
    } else {
      setSelectedCategories(new Set(categories.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCategories.size === 0) return
    
    const categoriesToDelete = categories.filter(c => selectedCategories.has(c.id))
    const hasData = categoriesToDelete.some(c => (c._count?.items || 0) > 0)
    
    if (hasData) {
      alert('Some selected categories have associated items. Please delete them individually to transfer data.')
      return
    }
    
    const deletePromises = Array.from(selectedCategories).map(id =>
      fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    )
    
    await Promise.all(deletePromises)
    setSelectedCategories(new Set())
    fetchCategories()
  }

  const renderIcon = (iconName: string) => {
    const icon = DEFAULT_ICONS.find(i => i.name === iconName)
    if (icon) {
      return (
        <svg className="w-6 h-6 text-[#F56A34]" fill="currentColor" viewBox="0 0 24 24">
          <path d={icon.svg.replace(/<path d="|"\/>/g, '')} />
        </svg>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">Categories</h1>
            {categories.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode)
                    if (selectionMode) {
                      setSelectedCategories(new Set())
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                >
                  {selectionMode ? 'Cancel Select' : 'Select'}
                </button>
                {selectionMode && (
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    {selectedCategories.size === categories.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectionMode && selectedCategories.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete ({selectedCategories.size})
              </button>
            )}
            <button
              onClick={handleNew}
              className="px-4 py-2 text-sm bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 font-medium"
            >
              + Add Category
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F56A34] border-t-transparent"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-sm text-gray-500">No categories found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all p-3 relative group text-center ${
                  selectedCategories.has(category.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-[#F56A34]'
                }`}
              >
                {selectionMode && (
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(category.id)}
                      onChange={() => handleToggleSelection(category.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                )}
                <div className="mb-2 flex items-center justify-center">
                  {category.icon ? (
                    category.icon.startsWith('/') || category.icon.startsWith('http') || category.icon.startsWith('data:') ? (
                      <img src={category.icon} alt={category.name} className="w-12 h-12 object-contain" />
                    ) : (
                      renderIcon(category.icon)
                    )
                  ) : (
                    renderIcon(category.name.toLowerCase())
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{category.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{category._count?.items || 0} items</p>
                <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(category)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(category)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit/Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80  h-full w-full ">
            <div className="relative top-4 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value || '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value || '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  {editingCategory ? (
                    // For existing categories: show public folder images, default icons, and image upload
                    <CategoryIconSelector
                      iconType={formData.iconType}
                      icon={formData.icon}
                      onIconTypeChange={(type) => setFormData({ ...formData, iconType: type })}
                      onIconChange={(icon) => setFormData({ ...formData, icon })}
                      allowPublicFolder={true}
                    />
                  ) : (
                    // For new categories: only image upload (max 2MB)
                    <CategoryIconSelector
                      iconType={formData.iconType}
                      icon={formData.icon}
                      onIconTypeChange={(type) => setFormData({ ...formData, iconType: type })}
                      onIconChange={(icon) => setFormData({ ...formData, icon })}
                      allowPublicFolder={false}
                    />
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#F56A34] text-white rounded-md hover:bg-orange-600"
                  >
                    {editingCategory ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, category: null, transferOptions: [] })}
          onConfirm={handleDeleteConfirm}
          title="Delete Category"
          message={`Are you sure you want to delete "${deleteModal.category?.name}"?`}
          hasData={(deleteModal.category?._count?.items || 0) > 0}
          dataCount={deleteModal.category?._count?.items || 0}
          dataType="items"
          transferOptions={deleteModal.transferOptions}
          transferLabel="Transfer items to"
        />
      </div>
    </div>
  )
}

