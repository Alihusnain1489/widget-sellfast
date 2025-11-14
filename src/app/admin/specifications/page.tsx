'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import SearchableDropdown from '@/components/SearchableDropdown'
import IconSelector from '@/components/IconSelector'

interface Item {
  id: string
  name: string
  category: {
    id: string
    name: string
  }
  companies?: Array<{
    company: {
      id: string
      name: string
    }
  }>
}

interface Category {
  id: string
  name: string
}

interface Specification {
  id: string
  name: string
  valueType: string
  options?: string
  icon?: string
  item?: Item
  category?: Category
  type: 'item' | 'category'
  _count?: {
    listings: number
  }
}

export default function AdminSpecificationsPage() {
  const router = useRouter()
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    valueType: 'text',
    options: '',
    type: 'item' as 'item' | 'category',
    itemId: '',
    categoryId: '',
    icon: '',
    iconType: 'default' as 'default' | 'url' | 'image'
  })
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    specification: Specification | null
    transferOptions: Array<{ id: string; name: string }>
  }>({
    isOpen: false,
    specification: null,
    transferOptions: []
  })
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterItem, setFilterItem] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [filterValueType, setFilterValueType] = useState<string>('all')
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])

  useLayoutEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [specsRes, itemsRes, categoriesRes, brandsRes] = await Promise.all([
        fetch('/api/admin/specifications', { cache: 'no-store' }),
        fetch('/api/admin/items', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' }),
        fetch('/api/admin/brands', { cache: 'no-store' })
      ])

      if (specsRes.ok) {
        const data = await specsRes.json()
        setSpecifications(data.specifications || [])
      }
      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
        console.log('Items loaded:', data.items?.length || 0)
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
        console.log('Categories loaded:', data.categories?.length || 0)
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
    setEditingSpec(null)
    setFormData({
      name: '',
      valueType: 'text',
      options: '',
      type: 'item',
      itemId: '',
      categoryId: '',
      icon: '',
      iconType: 'default'
    })
    setShowModal(true)
  }

  const handleEdit = (spec: Specification) => {
    setEditingSpec(spec)
    setFormData({
      name: spec.name,
      valueType: spec.valueType,
      options: spec.options ? JSON.parse(spec.options).join(', ') : '',
      type: spec.type || (spec.item ? 'item' : 'category'),
      itemId: spec.item?.id || '',
      categoryId: spec.category?.id || '',
      icon: spec.icon || '',
      iconType: spec.icon?.startsWith('data:') ? 'image' : spec.icon?.startsWith('http') ? 'url' : 'default'
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const optionsArray = formData.options
        ? formData.options.split(',').map(opt => opt.trim()).filter(Boolean)
        : []

      if (formData.type === 'item' && !formData.itemId) {
        alert('Please select an item')
        return
      }
      if (formData.type === 'category' && !formData.categoryId) {
        alert('Please select a category')
        return
      }

      const url = editingSpec
        ? `/api/admin/specifications/${editingSpec.id}`
        : '/api/admin/specifications'
      const method = editingSpec ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          valueType: formData.valueType,
          options: optionsArray.length > 0 ? JSON.stringify(optionsArray) : null,
          type: formData.type,
          itemId: formData.type === 'item' ? formData.itemId : null,
          categoryId: formData.type === 'category' ? formData.categoryId : null,
          icon: formData.icon || null
        })
      })

      if (res.ok) {
        setShowModal(false)
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save specification')
      }
    } catch (error) {
      console.error('Error saving specification:', error)
      alert('Failed to save specification')
    }
  }

  const handleDeleteClick = async (spec: Specification) => {
    // Fetch other specifications for the same item/category for transfer options
    const otherSpecs = specifications.filter(s => {
      if (s.id === spec.id || s.name === spec.name) return false
      if (spec.type === 'item' && s.type === 'item' && s.item?.id === spec.item?.id) return true
      if (spec.type === 'category' && s.type === 'category' && s.category?.id === spec.category?.id) return true
      return false
    })
    setDeleteModal({
      isOpen: true,
      specification: spec,
      transferOptions: otherSpecs.map(s => ({ id: s.id, name: s.name }))
    })
  }

  const handleDeleteConfirm = async (transferToId?: string) => {
    if (!deleteModal.specification) return

    try {
      const res = await fetch(`/api/admin/specifications/${deleteModal.specification.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferToId ? { transferTo: transferToId } : {})
      })

      if (res.ok) {
        setDeleteModal({ isOpen: false, specification: null, transferOptions: [] })
        const newSelected = new Set(selectedSpecs)
        newSelected.delete(deleteModal.specification.id)
        setSelectedSpecs(newSelected)
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete specification')
      }
    } catch (error) {
      console.error('Error deleting specification:', error)
      alert('Failed to delete specification')
    }
  }

  const handleToggleSelection = (specId: string) => {
    const newSelected = new Set(selectedSpecs)
    if (newSelected.has(specId)) {
      newSelected.delete(specId)
    } else {
      newSelected.add(specId)
    }
    setSelectedSpecs(newSelected)
  }

  // Get filtered specifications
  const getFilteredSpecifications = () => {
    return specifications.filter(spec => {
      const matchesSearch = !searchTerm || 
        spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (spec.item && spec.item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (spec.item && spec.item.category.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (spec.category && spec.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesItem = filterItem === 'all' || 
        (spec.type === 'item' && spec.item?.id === filterItem) ||
        (spec.type === 'category' && spec.category?.id === filterItem)
      
      const matchesCategory = filterCategory === 'all' ||
        (spec.type === 'item' && spec.item?.category.id === filterCategory) ||
        (spec.type === 'category' && spec.category?.id === filterCategory)
      
      const matchesBrand = filterBrand === 'all' || 
        (spec.type === 'item' && spec.item && 
         spec.item.companies?.some((ic: any) => ic.company?.id === filterBrand))
      
      const matchesType = filterValueType === 'all' || spec.valueType === filterValueType
      
      return matchesSearch && matchesItem && matchesCategory && matchesBrand && matchesType
    })
  }

  const handleSelectAll = () => {
    const filteredSpecs = getFilteredSpecifications()
    const filteredIds = new Set(filteredSpecs.map(s => s.id))
    const allFilteredSelected = filteredSpecs.length > 0 && 
      filteredSpecs.every(spec => selectedSpecs.has(spec.id))
    
    if (allFilteredSelected) {
      // Deselect all filtered items
      const newSelected = new Set(selectedSpecs)
      filteredIds.forEach(id => newSelected.delete(id))
      setSelectedSpecs(newSelected)
    } else {
      // Select all filtered items
      const newSelected = new Set(selectedSpecs)
      filteredIds.forEach(id => newSelected.add(id))
      setSelectedSpecs(newSelected)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedSpecs.size === 0) return
    
    const deletePromises = Array.from(selectedSpecs).map(id =>
      fetch(`/api/admin/specifications/${id}`, { method: 'DELETE' })
    )
    
    await Promise.all(deletePromises)
    setSelectedSpecs(new Set())
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Specifications</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage product specifications</p>
            </div>
            {specifications.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode)
                    if (selectionMode) {
                      setSelectedSpecs(new Set())
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
                    {(() => {
                      const filteredSpecs = getFilteredSpecifications()
                      const allFilteredSelected = filteredSpecs.length > 0 && 
                        filteredSpecs.every(spec => selectedSpecs.has(spec.id))
                      return allFilteredSelected ? 'Deselect All' : 'Select All'
                    })()}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectionMode && selectedSpecs.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete ({selectedSpecs.size})
              </button>
            )}
            <button
              onClick={handleNew}
              className="px-6 py-3 bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 font-semibold"
            >
              + Add Specification
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34]"></div>
          </div>
        ) : (
          <>
            {/* Filters and Search Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search Bar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  />
                </div>
                
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Brand Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Brand
                  </label>
                  <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  >
                    <option value="all">All Brands</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                
                {/* Value Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Type
                  </label>
                  <select
                    value={filterValueType}
                    onChange={(e) => setFilterValueType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="text">Text</option>
                    <option value="select">Select</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                </div>
              </div>
              
              {/* Clear Filters Button */}
              {(searchTerm || filterItem !== 'all' || filterCategory !== 'all' || filterBrand !== 'all' || filterValueType !== 'all') && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setFilterItem('all')
                      setFilterCategory('all')
                      setFilterBrand('all')
                      setFilterValueType('all')
                    }}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* Specifications Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                  <tr>
                    {selectionMode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={(() => {
                            const filteredSpecs = getFilteredSpecifications()
                            return filteredSpecs.length > 0 && 
                              filteredSpecs.every(spec => selectedSpecs.has(spec.id))
                          })()}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                    )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item/Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Options
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Listings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredSpecifications().map((spec) => (
                  <tr 
                    key={spec.id}
                    className={selectedSpecs.has(spec.id) ? 'bg-blue-50' : ''}
                    >
                      {selectionMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSpecs.has(spec.id)}
                            onChange={() => handleToggleSelection(spec.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                      )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{spec.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 capitalize">{spec.valueType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {spec.type === 'item' && spec.item ? (
                          <>
                            <span className="font-medium">{spec.item.name}</span>
                            <span className="text-gray-400"> ({spec.item.category.name})</span>
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Item</span>
                          </>
                        ) : spec.type === 'category' && spec.category ? (
                          <>
                            <span className="font-medium">{spec.category.name}</span>
                            <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">Category</span>
                          </>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {spec.options ? JSON.parse(spec.options).join(', ') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {spec._count?.listings || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(spec)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(spec)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {getFilteredSpecifications().length === 0 && (
                  <tr>
                    <td colSpan={selectionMode ? 7 : 6} className="px-6 py-4 text-center text-gray-500">
                      {specifications.length === 0 
                        ? 'No specifications found' 
                        : 'No specifications match your filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Edit/Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSpec ? 'Edit Specification' : 'New Specification'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specification Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'item' | 'category'
                      setFormData({ 
                        ...formData, 
                        type: newType,
                        itemId: newType === 'item' ? formData.itemId : '',
                        categoryId: newType === 'category' ? formData.categoryId : ''
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  >
                    <option value="item">Item Specification</option>
                    <option value="category">Category Specification</option>
                  </select>
                </div>
                {formData.type === 'item' ? (
                  <div className="mb-4">
                    <SearchableDropdown
                      label="Item"
                      options={items.length > 0 ? items.map(i => ({ id: i.id, name: `${i.name} (${i.category.name})` })) : []}
                      value={formData.itemId}
                      onChange={(value) => setFormData({ ...formData, itemId: value as string })}
                      placeholder={items.length === 0 ? "Loading items..." : "Select item"}
                      required
                      disabled={items.length === 0}
                    />
                    {items.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No items available. Please create items first.</p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <SearchableDropdown
                      label="Category"
                      options={categories.length > 0 ? categories.map(c => ({ id: c.id, name: c.name })) : []}
                      value={formData.categoryId}
                      onChange={(value) => setFormData({ ...formData, categoryId: value as string })}
                      placeholder={categories.length === 0 ? "Loading categories..." : "Select category"}
                      required
                      disabled={categories.length === 0}
                    />
                    {categories.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No categories available. Please create categories first.</p>
                    )}
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.valueType}
                    onChange={(e) => setFormData({ ...formData, valueType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  >
                    <option value="text">Text</option>
                    <option value="select">Select</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                {formData.valueType === 'select' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.options}
                      onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                      placeholder="e.g., 4GB, 8GB, 16GB"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                    />
                  </div>
                )}
                <div className="mb-4">
                  <IconSelector
                    iconType={formData.iconType}
                    icon={formData.icon}
                    onIconTypeChange={(type) => setFormData({ ...formData, iconType: type })}
                    onIconChange={(icon) => setFormData({ ...formData, icon })}
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
                    {editingSpec ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, specification: null, transferOptions: [] })}
          onConfirm={handleDeleteConfirm}
          title="Delete Specification"
          message={`Are you sure you want to delete "${deleteModal.specification?.name}"?`}
          hasData={(deleteModal.specification?._count?.listings || 0) > 0}
          dataCount={deleteModal.specification?._count?.listings || 0}
          dataType="specifications"
          transferOptions={deleteModal.transferOptions}
          transferLabel="Transfer listing values to"
        />
      </div>
    </div>
  )
}

