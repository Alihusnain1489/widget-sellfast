'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDefaultBrand } from '@/lib/default-brands'

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
  icon?: string
}

interface Specification {
  id: string
  name: string
  valueType: string
  options?: string
}

interface Product {
  id: string
  name: string
  icon?: string
  category: Category
  companies: Array<{
    company: Brand
  }>
  specifications: Specification[]
  _count: {
    listings: number
  }
}

export default function ProductListPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  useLayoutEffect(() => {
    fetchCategories()
    fetchBrands()
    fetchProducts()
  }, [])

  useLayoutEffect(() => {
    fetchProducts()
  }, [selectedCategory, selectedBrand])

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

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/admin/brands', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setBrands(data.companies || [])
      }
    } catch (error) {
      console.error('Error fetching brands:', error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory)
      }
      if (selectedBrand !== 'all') {
        params.append('companyId', selectedBrand)
      }
      
      const res = await fetch(`/api/admin/products?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (res.ok) {
        const newSelected = new Set(selectedProducts)
        newSelected.delete(productId)
        setSelectedProducts(newSelected)
        fetchProducts()
      } else {
        if (data.hasListings) {
          alert(`Cannot delete product. It has ${data.listingCount} active listings.`)
        } else {
          alert(data.error || data.message || 'Failed to delete product')
        }
      }
    } catch (error: any) {
      console.error('Error deleting product:', error)
      alert(`Failed to delete product: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleEdit = (product: Product) => {
    router.push(`/admin/products/edit/${product.id}`)
  }

  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedBrand('all')
  }

  const handleToggleSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)? This action cannot be undone.`)) return

    const deletePromises = Array.from(selectedProducts).map(id =>
      fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    )
    
    await Promise.all(deletePromises)
    setSelectedProducts(new Set())
    fetchProducts()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Product Listing</h1>
                <p className="text-gray-600 mt-2">Manage your product inventory</p>
              </div>
              {products.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setSelectionMode(!selectionMode)
                      if (selectionMode) {
                        setSelectedProducts(new Set())
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
                      {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectionMode && selectedProducts.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete ({selectedProducts.size})
                </button>
              )}
              <button
                onClick={() => router.push('/admin/products')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                + Add New Product
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
              >
                <option value="all">All</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
              >
                <option value="all">All</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 text-lg">No products found.</p>
            <p className="text-gray-400 text-sm mt-2">
              {selectedCategory !== 'all' || selectedBrand !== 'all'
                ? 'Try adjusting your filters.'
                : 'Create your first product to get started.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {selectionMode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedProducts.size === products.length && products.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specifications
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
                  {products.map((product) => {
                    const brand = product.companies[0]?.company
                    const defaultBrand = brand ? getDefaultBrand(brand.name) : null
                    
                    return (
                      <tr
                        key={product.id}
                        className={selectedProducts.has(product.id) ? 'bg-blue-50' : ''}
                      >
                        {selectionMode && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.id)}
                              onChange={() => handleToggleSelection(product.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 mr-3">
                              {product.icon ? (
                                <img
                                  src={product.icon}
                                  alt={product.name}
                                  className="h-10 w-10 object-contain rounded"
                                />
                              ) : defaultBrand?.logo ? (
                                <img
                                  src={defaultBrand.logo}
                                  alt={brand?.name}
                                  className="h-10 w-10 object-contain rounded"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 font-semibold">
                                  {product.name[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {product.category.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {brand ? brand.name : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {product.specifications.length > 0 ? (
                              <div className="space-y-1">
                                {product.specifications.slice(0, 2).map((spec) => (
                                  <div key={spec.id}>
                                    <span className="font-medium">{spec.name}:</span>{' '}
                                    {spec.options ? (
                                      <span className="text-gray-600">
                                        {JSON.parse(spec.options).slice(0, 3).join(', ')}
                                        {JSON.parse(spec.options).length > 3 && '...'}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </div>
                                ))}
                                {product.specifications.length > 2 && (
                                  <span className="text-xs text-gray-400">
                                    +{product.specifications.length - 2} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">No specifications</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product._count.listings || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={selectionMode ? 7 : 6} className="px-6 py-4 text-center text-gray-500">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

