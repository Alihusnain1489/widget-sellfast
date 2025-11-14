'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { DEFAULT_BRANDS, getDefaultBrand } from '@/lib/default-brands'

interface Brand {
  id: string
  name: string
  icon?: string
  _count?: {
    items: number
    listings: number
  }
}

export default function AdminBrandsPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    icon: '' as string,
    iconType: 'url' as 'default' | 'url' | 'image'
  })
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    brand: Brand | null
    transferOptions: Array<{ id: string; name: string }>
  }>({
    isOpen: false,
    brand: null,
    transferOptions: []
  })
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [replaceModal, setReplaceModal] = useState<{
    isOpen: boolean
    existingBrand: Brand | null
    newBrandData: { name: string; icon: string | null } | null
  }>({
    isOpen: false,
    existingBrand: null,
    newBrandData: null
  })

  useLayoutEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/brands', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setBrands(data.companies || [])
      }
    } catch (error) {
      console.error('Error fetching brands:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingBrand(null)
    setFormData({ name: '', icon: '', iconType: 'url' })
    setShowModal(true)
  }

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setFormData({
      name: brand.name || '',
      icon: brand.icon || '',
      iconType: brand.icon?.startsWith('data:') ? 'image' : 'url'
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingBrand
        ? `/api/admin/brands/${editingBrand.id}`
        : '/api/admin/brands'
      const method = editingBrand ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          icon: formData.icon || null
        })
      })

      const data = await res.json()

      if (res.ok) {
        setShowModal(false)
        fetchBrands()
        // Show info message if brand already existed
        if (data.message && data.message.includes('already exists')) {
          // Don't show alert, just silently use existing brand
          console.log('Brand already exists, using existing brand')
        }
      } else if (res.status === 409 && data.conflict) {
        // Brand already exists - show replace/overwrite modal
        setReplaceModal({
          isOpen: true,
          existingBrand: data.company,
          newBrandData: {
            name: formData.name,
            icon: formData.icon || null
          }
        })
      } else {
        // Handle error response
        const errorMessage = data.error || data.message || 'Failed to save brand'
        // If it's a conflict but didn't trigger the modal, show it now
        if (res.status === 409 || data.conflict) {
          // Try to show replace modal if we have the data
          if (data.company) {
            setReplaceModal({
              isOpen: true,
              existingBrand: data.company,
              newBrandData: {
                name: formData.name,
                icon: formData.icon || null
              }
            })
          } else {
            alert(errorMessage)
          }
        } else {
          alert(errorMessage)
        }
      }
    } catch (error) {
      console.error('Error saving brand:', error)
      alert('Failed to save brand')
    }
  }

  const handleDeleteClick = async (brand: Brand) => {
    const hasData = (brand._count?.items || 0) > 0 || (brand._count?.listings || 0) > 0
    
    if (!hasData) {
      try {
        const res = await fetch(`/api/admin/brands/${brand.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })

        if (res.ok) {
          fetchBrands()
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to delete brand')
        }
      } catch (error) {
        console.error('Error deleting brand:', error)
        alert('Failed to delete brand')
      }
      return
    }

    const otherBrands = brands.filter(b => b.id !== brand.id)
    setDeleteModal({
      isOpen: true,
      brand,
      transferOptions: otherBrands.map(b => ({ id: b.id, name: b.name }))
    })
  }

  const handleDeleteConfirm = async (transferToId?: string) => {
    if (!deleteModal.brand) return

    try {
      const res = await fetch(`/api/admin/brands/${deleteModal.brand.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferToId ? { transferTo: transferToId } : {})
      })

      if (res.ok) {
        setDeleteModal({ isOpen: false, brand: null, transferOptions: [] })
        const newSelected = new Set(selectedBrands)
        newSelected.delete(deleteModal.brand.id)
        setSelectedBrands(newSelected)
        fetchBrands()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete brand')
      }
    } catch (error) {
      console.error('Error deleting brand:', error)
      alert('Failed to delete brand')
    }
  }

  const handleToggleSelection = (brandId: string) => {
    const newSelected = new Set(selectedBrands)
    if (newSelected.has(brandId)) {
      newSelected.delete(brandId)
    } else {
      newSelected.add(brandId)
    }
    setSelectedBrands(newSelected)
  }

  const handleReplaceBrand = async (overwrite: boolean) => {
    if (!replaceModal.existingBrand || !replaceModal.newBrandData) return

    try {
      if (overwrite) {
        // Update existing brand with new data
        const res = await fetch(`/api/admin/brands/${replaceModal.existingBrand.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: replaceModal.newBrandData.name,
            icon: replaceModal.newBrandData.icon
          })
        })

        if (res.ok) {
          setReplaceModal({ isOpen: false, existingBrand: null, newBrandData: null })
          setShowModal(false)
          fetchBrands()
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to update brand')
        }
      } else {
        // Cancel - just close modals
        setReplaceModal({ isOpen: false, existingBrand: null, newBrandData: null })
      }
    } catch (error) {
      console.error('Error replacing brand:', error)
      alert('Failed to replace brand')
    }
  }

  const handleSelectAll = () => {
    if (selectedBrands.size === brands.length) {
      setSelectedBrands(new Set())
    } else {
      setSelectedBrands(new Set(brands.map(b => b.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedBrands.size === 0) return
    
    const brandsToDelete = brands.filter(b => selectedBrands.has(b.id))
    const hasData = brandsToDelete.some(b => (b._count?.items || 0) > 0 || (b._count?.listings || 0) > 0)
    
    if (hasData) {
      alert('Some selected brands have associated items or listings. Please delete them individually to transfer data.')
      return
    }
    
    const deletePromises = Array.from(selectedBrands).map(id =>
      fetch(`/api/admin/brands/${id}`, { method: 'DELETE' })
    )
    
    await Promise.all(deletePromises)
    setSelectedBrands(new Set())
    fetchBrands()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">Brands</h1>
            {brands.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode)
                    if (selectionMode) {
                      setSelectedBrands(new Set())
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
                    {selectedBrands.size === brands.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectionMode && selectedBrands.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete ({selectedBrands.size})
              </button>
            )}
            <button
              onClick={handleNew}
              className="px-4 py-2 text-sm bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 font-medium"
            >
              + Add Brand
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F56A34] border-t-transparent"></div>
          </div>
        ) : brands.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-sm text-gray-500">No brands found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {brands.map((brand) => {
              const defaultBrand = getDefaultBrand(brand.name)
              return (
                <div
                  key={brand.id}
                  className={`bg-white rounded-lg shadow-sm border-2 transition-all p-3 relative group ${
                    selectedBrands.has(brand.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-[#F56A34]'
                  }`}
                >
                  {selectionMode && (
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={selectedBrands.has(brand.id)}
                        onChange={() => handleToggleSelection(brand.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div className="text-center">
                    {defaultBrand?.logo ? (
                      <img src={defaultBrand.logo} alt={brand.name} className="w-12 h-12 mx-auto mb-1.5 object-contain" />
                    ) : brand.icon ? (
                      <img src={brand.icon} alt={brand.name} className="w-12 h-12 mx-auto mb-1.5 object-contain" />
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-1.5 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs font-semibold">{brand.name[0]}</span>
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{brand.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{brand._count?.items || 0} items</p>
                    <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(brand)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(brand)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Edit/Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingBrand ? 'Edit Brand' : 'New Brand'}
              </h3>
              <div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value || '' })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, iconType: 'url' })}
                      className={`px-3 py-1 text-xs rounded ${formData.iconType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, iconType: 'image' })}
                      className={`px-3 py-1 text-xs rounded ${formData.iconType === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                      Upload Image
                    </button>
                  </div>
                  {formData.iconType === 'url' ? (
                    <input
                      type="url"
                      value={formData.icon ?? ''}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value || '' })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                    />
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setFormData({ ...formData, icon: reader.result as string })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  )}
                  {formData.icon && (
                    <img src={formData.icon} alt="Preview" className="mt-2 w-16 h-16 object-contain border rounded" />
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-4 py-2 text-sm bg-[#F56A34] text-white rounded-lg hover:bg-orange-600"
                  >
                    {editingBrand ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Replace/Overwrite Confirmation Modal */}
        {replaceModal.isOpen && replaceModal.existingBrand && replaceModal.newBrandData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Brand Already Exists
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  A brand with the name <strong>"{replaceModal.existingBrand.name}"</strong> already exists.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <p className="text-xs text-gray-500 mb-1">Existing Brand:</p>
                  <p className="text-sm font-medium">{replaceModal.existingBrand.name}</p>
                  {replaceModal.existingBrand.icon && (
                    <img src={replaceModal.existingBrand.icon} alt={replaceModal.existingBrand.name} className="mt-2 w-12 h-12 object-contain" />
                  )}
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">New Brand Data:</p>
                  <p className="text-sm font-medium">{replaceModal.newBrandData.name}</p>
                  {replaceModal.newBrandData.icon && (
                    <img src={replaceModal.newBrandData.icon} alt={replaceModal.newBrandData.name} className="mt-2 w-12 h-12 object-contain" />
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Would you like to <strong>overwrite</strong> the existing brand with the new data?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleReplaceBrand(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReplaceBrand(true)}
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
          onClose={() => setDeleteModal({ isOpen: false, brand: null, transferOptions: [] })}
          onConfirm={handleDeleteConfirm}
          title="Delete Brand"
          message={`Are you sure you want to delete "${deleteModal.brand?.name}"?`}
          hasData={(deleteModal.brand?._count?.listings || 0) > 0 || (deleteModal.brand?._count?.items || 0) > 0}
          dataCount={(deleteModal.brand?._count?.listings || 0) + (deleteModal.brand?._count?.items || 0)}
          dataType="listings"
          transferOptions={deleteModal.transferOptions}
          transferLabel="Transfer listings and items to"
        />
      </div>
    </div>
  )
}