'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import SearchableDropdown from '@/components/SearchableDropdown'

interface Category {
  id: string
  name: string
  icon?: string
}

interface Brand {
  id: string
  name: string
}

interface Item {
  id: string
  name: string
  icon?: string
  category: Category
  companies: Array<{ company: Brand }>
  _count?: {
    listings: number
    specifications: number
  }
}

export default function AdminItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    companyIds: [] as string[],
    icon: ''
  })
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    item: Item | null
    transferOptions: Array<{ id: string; name: string }>
  }>({
    isOpen: false,
    item: null,
    transferOptions: []
  })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [replaceModal, setReplaceModal] = useState<{
    isOpen: boolean
    existingItem: Item | null
    newItemData: { name: string; categoryId: string; companyIds: string[]; icon: string | null } | null
  }>({
    isOpen: false,
    existingItem: null,
    newItemData: null
  })

  useLayoutEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [itemsRes, categoriesRes, brandsRes] = await Promise.all([
        fetch('/api/admin/items', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' }),
        fetch('/api/admin/brands', { cache: 'no-store' })
      ])

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }
      if (brandsRes.ok) {
        const data = await brandsRes.json()
        setBrands(data.companies || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingItem(null)
    setFormData({ name: '', categoryId: '', companyIds: [], icon: '' })
    setShowModal(true)
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      categoryId: item.category.id,
      companyIds: item.companies.map(c => c.company.id),
      icon: item.icon || ''
    })
    setShowModal(true)
  }

  const handleReplaceItem = async (overwrite: boolean) => {
    if (!replaceModal.existingItem || !replaceModal.newItemData) return

    try {
      if (overwrite) {
        // Update existing item with new data
        const res = await fetch(`/api/admin/items/${replaceModal.existingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: replaceModal.newItemData.name,
            categoryId: replaceModal.newItemData.categoryId,
            companyIds: replaceModal.newItemData.companyIds,
            icon: replaceModal.newItemData.icon
          })
        })

        if (res.ok) {
          setReplaceModal({ isOpen: false, existingItem: null, newItemData: null })
          setShowModal(false)
          fetchData()
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to update item')
        }
      } else {
        // Cancel - just close modals
        setReplaceModal({ isOpen: false, existingItem: null, newItemData: null })
      }
    } catch (error) {
      console.error('Error replacing item:', error)
      alert('Failed to replace item')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingItem
        ? `/api/admin/items/${editingItem.id}`
        : '/api/admin/items'
      const method = editingItem ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId,
          companyIds: formData.companyIds,
          icon: formData.icon || null
        })
      })

      const data = await res.json()

      if (res.ok) {
        setShowModal(false)
        fetchData()
      } else if (res.status === 409 && data.conflict) {
        // Item already exists - show replace/overwrite modal
        setReplaceModal({
          isOpen: true,
          existingItem: data.item,
          newItemData: {
            name: formData.name,
            categoryId: formData.categoryId,
            companyIds: formData.companyIds,
            icon: formData.icon || null
          }
        })
      } else {
        const errorMessage = data.error || data.message || 'Failed to save item'
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error saving item:', error)
      alert('Failed to save item')
    }
  }

  const handleDeleteClick = async (item: Item) => {
    // Check if item has associated data
    const hasData = (item._count?.listings || 0) > 0 || (item._count?.specifications || 0) > 0
    
    if (!hasData) {
      // No data, delete directly without notification
      try {
        const res = await fetch(`/api/admin/items/${item.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })

        if (res.ok) {
          fetchData()
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to delete item')
        }
      } catch (error) {
        console.error('Error deleting item:', error)
        alert('Failed to delete item')
      }
      return
    }

    // Has data, show modal with transfer options
    const otherItems = items.filter(i => i.id !== item.id && i.category.id === item.category.id)
    setDeleteModal({
      isOpen: true,
      item,
      transferOptions: otherItems.map(i => ({ id: i.id, name: i.name }))
    })
  }

  const handleDeleteConfirm = async (transferToId?: string) => {
    if (!deleteModal.item) return

    try {
      const res = await fetch(`/api/admin/items/${deleteModal.item.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferToId ? { transferTo: transferToId } : {})
      })

      if (res.ok) {
        setDeleteModal({ isOpen: false, item: null, transferOptions: [] })
        const newSelected = new Set(selectedItems)
        newSelected.delete(deleteModal.item.id)
        setSelectedItems(newSelected)
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const handleToggleSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(i => i.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    
    const itemsToDelete = items.filter(i => selectedItems.has(i.id))
    const hasData = itemsToDelete.some(i => (i._count?.listings || 0) > 0 || (i._count?.specifications || 0) > 0)
    
    if (hasData) {
      alert('Some selected items have associated listings or specifications. Please delete them individually to transfer data.')
      return
    }
    
    const deletePromises = Array.from(selectedItems).map(id =>
      fetch(`/api/admin/items/${id}`, { method: 'DELETE' })
    )
    
    await Promise.all(deletePromises)
    setSelectedItems(new Set())
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">Items</h1>
            {items.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode)
                    if (selectionMode) {
                      setSelectedItems(new Set())
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
                    {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectionMode && selectedItems.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete ({selectedItems.size})
              </button>
            )}
            <button
              onClick={handleNew}
              className="px-4 py-2 text-sm bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 font-medium"
            >
              + Add Item
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F56A34] border-t-transparent"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-sm text-gray-500">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all p-3 relative group ${
                  selectedItems.has(item.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-[#F56A34]'
                }`}
              >
                {selectionMode && (
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleToggleSelection(item.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.name}</h3>
                    <p className="text-xs text-gray-500 mb-1">{item.category.name}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.companies.slice(0, 2).map((c) => (
                        <span key={c.company.id} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {c.company.name}
                        </span>
                      ))}
                      {item.companies.length > 2 && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          +{item.companies.length - 2}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>{item._count?.listings || 0} listings</span>
                      <span>{item._count?.specifications || 0} specs</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(item)}
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit Item' : 'New Item'}
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
                  <SearchableDropdown
                    label="Category"
                    options={categories.map(c => ({ id: c.id, name: c.name, icon: c.icon || undefined }))}
                    value={formData.categoryId || ''}
                    onChange={(value) => setFormData({ ...formData, categoryId: (value as string) || '' })}
                    placeholder="Select category"
                    required
                  />
                </div>
                <div className="mb-4">
                  <SearchableDropdown
                    label="Brands"
                    options={brands.map(b => ({ id: b.id, name: b.name }))}
                    value={formData.companyIds || []}
                    onChange={(value) => setFormData({ ...formData, companyIds: Array.isArray(value) ? value : (value ? [value] : []) })}
                    placeholder="Select brands"
                    multiple
                    required
                  />
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
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Replace/Overwrite Confirmation Modal */}
        {replaceModal.isOpen && replaceModal.existingItem && replaceModal.newItemData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Item Already Exists
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  An item with the name <strong>"{replaceModal.existingItem.name}"</strong> already exists.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <p className="text-xs text-gray-500 mb-1">Existing Item:</p>
                  <p className="text-sm font-medium">{replaceModal.existingItem.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Category: {replaceModal.existingItem.category.name}</p>
                  {replaceModal.existingItem.icon && (
                    <img src={replaceModal.existingItem.icon} alt={replaceModal.existingItem.name} className="mt-2 w-12 h-12 object-contain" />
                  )}
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">New Item Data:</p>
                  <p className="text-sm font-medium">{replaceModal.newItemData.name}</p>
                  {replaceModal.newItemData.icon && (
                    <img src={replaceModal.newItemData.icon} alt={replaceModal.newItemData.name} className="mt-2 w-12 h-12 object-contain" />
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Would you like to <strong>overwrite</strong> the existing item with the new data?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleReplaceItem(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReplaceItem(true)}
                  className="px-4 py-2 text-sm bg-[#F56A34] text-white rounded-lg hover:bg-orange-600"
                >
                  Overwrite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, item: null, transferOptions: [] })}
          onConfirm={handleDeleteConfirm}
          title="Delete Item"
          message={`Are you sure you want to delete "${deleteModal.item?.name}"?`}
          hasData={(deleteModal.item?._count?.listings || 0) > 0 || (deleteModal.item?._count?.specifications || 0) > 0}
          dataCount={(deleteModal.item?._count?.listings || 0) + (deleteModal.item?._count?.specifications || 0)}
          dataType="listings"
          transferOptions={deleteModal.transferOptions}
          transferLabel="Transfer listings and specifications to"
        />
      </div>
    </div>
  )
}