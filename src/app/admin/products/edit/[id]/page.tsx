'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import IconSelector from '@/components/IconSelector'
import { DEFAULT_BRANDS, getDefaultBrand } from '@/lib/default-brands'
import { DEFAULT_ICONS } from '@/lib/default-icons'

interface Category {
  id: string
  name: string
  icon?: string
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
  icon?: string
}

interface SelectedSpec {
  name: string
  valueType: string
  options?: string[]
  icon?: string
}

const STEPS = [
  { number: 1, title: 'Categories' },
  { number: 2, title: 'Brands' },
  { number: 3, title: 'Product Details' },
  { number: 4, title: 'Specification Values' },
  { number: 5, title: 'Product Listing' }
]

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [productLoading, setProductLoading] = useState(true)
  
  // Data
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [availableSpecs, setAvailableSpecs] = useState<Specification[]>([])
  
  // Form data
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [productName, setProductName] = useState('')
  const [productIcon, setProductIcon] = useState('')
  const [productIconType, setProductIconType] = useState<'default' | 'url' | 'image'>('default')
  
  // Specifications
  const [selectedSpecs, setSelectedSpecs] = useState<SelectedSpec[]>([])
  const [specValues, setSpecValues] = useState<Record<string, string[]>>({})
  const [specInputs, setSpecInputs] = useState<Record<string, string>>({})
  
  // Display style for specifications (horizontal buttons vs dropdown)
  const [specDisplayStyle, setSpecDisplayStyle] = useState<'horizontal' | 'dropdown'>('horizontal')

  useLayoutEffect(() => {
    fetchCategories()
    fetchBrands()
    fetchProduct()
    fetchAvailableSpecs()
  }, [productId])

  const fetchProduct = async () => {
    setProductLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const product = data.item
        
        setProductName(product.name)
        setProductIcon(product.icon || '')
        setSelectedCategory(product.category)
        setSelectedBrand(product.companies[0]?.company || null)
        
        // Load existing specifications
        const specs: SelectedSpec[] = product.specifications.map((spec: Specification) => ({
          name: spec.name,
          valueType: spec.valueType,
          options: spec.options ? JSON.parse(spec.options) : undefined,
          icon: spec.icon
        }))
        setSelectedSpecs(specs)
        
        // Initialize spec values (empty for now, as values are stored in listings)
        specs.forEach(spec => {
          setSpecValues(prev => ({ ...prev, [spec.name]: [] }))
          setSpecInputs(prev => ({ ...prev, [spec.name]: '' }))
        })
      }
    } catch (error) {
      console.error('Error fetching product:', error)
    } finally {
      setProductLoading(false)
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

  const fetchAvailableSpecs = async () => {
    // Comprehensive list of specifications with predefined options for mobile, laptop, and tablets
    const commonSpecs: Specification[] = [
      // Basic Specifications
      { id: 'built-year', name: 'Built Year', valueType: 'select', options: JSON.stringify(['2020', '2021', '2022', '2023', '2024', '2025']) },
      { id: 'ram', name: 'RAM', valueType: 'select', options: JSON.stringify(['2GB', '4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB']) },
      { id: 'storage', name: 'Storage (SSD)', valueType: 'select', options: JSON.stringify(['64GB', '128GB', '256GB', '512GB', '1TB', '2TB', '4TB']) },
      
      // Processor with predefined options
      { id: 'processor', name: 'Processor', valueType: 'select', options: JSON.stringify([
        'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
        'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9',
        'Apple M1', 'Apple M1 Pro', 'Apple M1 Max', 'Apple M2', 'Apple M2 Pro', 'Apple M2 Max', 'Apple M3', 'Apple M3 Pro', 'Apple M3 Max',
        'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3',
        'MediaTek Dimensity 9000', 'MediaTek Dimensity 9200',
        'Apple A14 Bionic', 'Apple A15 Bionic', 'Apple A16 Bionic', 'Apple A17 Pro',
        'Exynos 2200', 'Exynos 2300'
      ]) },
      
      // Screen Size with predefined options
      { id: 'screen-size', name: 'Screen Size', valueType: 'select', options: JSON.stringify([
        '5.0"', '5.5"', '6.0"', '6.1"', '6.2"', '6.3"', '6.4"', '6.5"', '6.7"', '6.8"', '6.9"', '7.0"',
        '7.9"', '8.0"', '8.3"', '9.7"', '10.2"', '10.5"', '10.9"', '11"', '12.9"', '13"',
        '13"', '13.3"', '14"', '15"', '15.6"', '16"', '17"', '17.3"'
      ]) },
      
      // Weight with predefined options
      { id: 'weight', name: 'Weight', valueType: 'select', options: JSON.stringify([
        'Under 150g', '150-170g', '170-190g', '190-210g', '210-230g', 'Over 230g',
        'Under 300g', '300-400g', '400-500g', '500-600g', '600-700g', 'Over 700g',
        'Under 1kg', '1-1.5kg', '1.5-2kg', '2-2.5kg', '2.5-3kg', 'Over 3kg'
      ]) },
      
      // Battery Life with predefined options
      { id: 'battery', name: 'Battery Life', valueType: 'select', options: JSON.stringify([
        '2000-3000 mAh', '3000-4000 mAh', '4000-5000 mAh', '5000-6000 mAh', '6000-7000 mAh', 'Over 7000 mAh',
        'Under 5 hours', '5-7 hours', '7-10 hours', '10-12 hours', '12-15 hours', 'Over 15 hours'
      ]) },
      
      // Graphics Card
      { id: 'graphics', name: 'Graphics Card', valueType: 'select', options: JSON.stringify([
        'Intel UHD Graphics', 'Intel Iris Xe', 'Intel Arc',
        'NVIDIA GeForce GTX 1650', 'NVIDIA GeForce GTX 1660', 'NVIDIA GeForce RTX 3050', 'NVIDIA GeForce RTX 3060', 'NVIDIA GeForce RTX 3070', 'NVIDIA GeForce RTX 3080', 'NVIDIA GeForce RTX 4050', 'NVIDIA GeForce RTX 4060', 'NVIDIA GeForce RTX 4070', 'NVIDIA GeForce RTX 4080', 'NVIDIA GeForce RTX 4090',
        'AMD Radeon RX 5500M', 'AMD Radeon RX 5600M', 'AMD Radeon RX 6600M', 'AMD Radeon RX 6700M', 'AMD Radeon RX 6800M',
        'Apple M1 GPU', 'Apple M2 GPU', 'Apple M3 GPU',
        'Integrated Graphics'
      ]) },
      
      // Operating System
      { id: 'os', name: 'Operating System', valueType: 'select', options: JSON.stringify(['Windows 10', 'Windows 11', 'macOS', 'Linux', 'Android', 'iOS', 'iPadOS', 'Chrome OS']) },
      
      // Display Resolution
      { id: 'display-resolution', name: 'Display Resolution', valueType: 'select', options: JSON.stringify([
        'HD (1280x720)', 'HD+ (1600x900)', 'Full HD (1920x1080)', 'FHD+ (2160x1080)',
        '2K (2560x1440)', 'QHD (2560x1440)', 'QHD+ (3200x1800)',
        '4K UHD (3840x2160)', 'Retina Display', 'Super Retina Display'
      ]) },
      
      // Camera (for mobile/tablets)
      { id: 'camera', name: 'Camera', valueType: 'select', options: JSON.stringify([
        '8MP', '12MP', '13MP', '16MP', '20MP', '24MP', '48MP', '50MP', '64MP', '108MP',
        'Dual Camera', 'Triple Camera', 'Quad Camera',
        'No Camera'
      ]) },
      
      // Front Camera (for mobile/tablets)
      { id: 'front-camera', name: 'Front Camera', valueType: 'select', options: JSON.stringify([
        '5MP', '8MP', '12MP', '16MP', '20MP', '24MP', '32MP',
        'No Front Camera'
      ]) },
      
      // Connectivity
      { id: 'connectivity', name: 'Connectivity', valueType: 'select', options: JSON.stringify([
        'Wi-Fi Only', 'Wi-Fi + Cellular', 'Wi-Fi + 4G LTE', 'Wi-Fi + 5G',
        'Bluetooth 4.0', 'Bluetooth 5.0', 'Bluetooth 5.1', 'Bluetooth 5.2', 'Bluetooth 5.3',
        'USB-C', 'USB-A', 'Thunderbolt 3', 'Thunderbolt 4', 'HDMI', 'Ethernet'
      ]) },
      
      // Network (for mobile)
      { id: 'network', name: 'Network', valueType: 'select', options: JSON.stringify([
        '2G', '3G', '4G LTE', '5G', '5G+', 'Wi-Fi Only'
      ]) },
      
      // SIM Card (for mobile)
      { id: 'sim', name: 'SIM Card', valueType: 'select', options: JSON.stringify([
        'Single SIM', 'Dual SIM', 'eSIM', 'No SIM'
      ]) },
      
      // Storage Type
      { id: 'storage-type', name: 'Storage Type', valueType: 'select', options: JSON.stringify([
        'SSD', 'HDD', 'eMMC', 'UFS 2.1', 'UFS 3.0', 'UFS 3.1', 'NVMe SSD', 'PCIe SSD'
      ]) },
      
      // Display Type
      { id: 'display-type', name: 'Display Type', valueType: 'select', options: JSON.stringify([
        'LCD', 'LED', 'OLED', 'AMOLED', 'Super AMOLED', 'IPS', 'Retina', 'Liquid Retina', 'Mini-LED'
      ]) },
      
      // Refresh Rate
      { id: 'refresh-rate', name: 'Refresh Rate', valueType: 'select', options: JSON.stringify([
        '60Hz', '90Hz', '120Hz', '144Hz', '165Hz', '240Hz'
      ]) },
      
      // Color
      { id: 'color', name: 'Color', valueType: 'select', options: JSON.stringify([
        'Black', 'White', 'Silver', 'Gray', 'Space Gray', 'Gold', 'Rose Gold', 'Blue', 'Red', 'Green', 'Purple', 'Pink', 'Yellow', 'Orange'
      ]) },
      
      // Warranty
      { id: 'warranty', name: 'Warranty', valueType: 'select', options: JSON.stringify(['1 Year', '2 Years', '3 Years', 'No Warranty']) },
      
      // Condition
      { id: 'condition', name: 'Condition', valueType: 'select', options: JSON.stringify([
        'Brand New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'
      ]) }
    ]
    setAvailableSpecs(commonSpecs)
  }

  const handleSpecToggle = (spec: Specification) => {
    const isSelected = selectedSpecs.some(s => s.name === spec.name)
    
    if (isSelected) {
      setSelectedSpecs(selectedSpecs.filter(s => s.name !== spec.name))
      const newSpecValues = { ...specValues }
      delete newSpecValues[spec.name]
      setSpecValues(newSpecValues)
      const newSpecInputs = { ...specInputs }
      delete newSpecInputs[spec.name]
      setSpecInputs(newSpecInputs)
    } else {
      setSelectedSpecs([
        ...selectedSpecs,
        {
          name: spec.name,
          valueType: spec.valueType,
          options: spec.options ? JSON.parse(spec.options) : undefined,
          icon: spec.icon
        }
      ])
      setSpecValues({ ...specValues, [spec.name]: [] })
      setSpecInputs({ ...specInputs, [spec.name]: '' })
    }
  }

  const handleAddSpecValue = (specName: string) => {
    const inputValue = specInputs[specName]?.trim()
    if (!inputValue) return
    
    const currentValues = specValues[specName] || []
    if (!currentValues.includes(inputValue)) {
      setSpecValues({
        ...specValues,
        [specName]: [...currentValues, inputValue]
      })
      setSpecInputs({ ...specInputs, [specName]: '' })
    }
  }

  const handleRemoveSpecValue = (specName: string, value: string) => {
    const currentValues = specValues[specName] || []
    setSpecValues({
      ...specValues,
      [specName]: currentValues.filter(v => v !== value)
    })
  }

  const handleAddFromOptions = (specName: string, option: string) => {
    const currentValues = specValues[specName] || []
    if (!currentValues.includes(option)) {
      setSpecValues({
        ...specValues,
        [specName]: [...currentValues, option]
      })
    }
  }

  const handleSubmit = async () => {
    if (!productName.trim() || !selectedCategory || !selectedBrand) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          categoryId: selectedCategory.id,
          companyId: selectedBrand.id,
          icon: productIcon || null,
          selectedSpecs: selectedSpecs.map(spec => ({
            name: spec.name,
            valueType: spec.valueType,
            options: spec.options,
            icon: spec.icon
          })),
          specValues
        })
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/admin/products/list')
      } else {
        alert(data.error || data.message || 'Failed to update product')
      }
    } catch (error: any) {
      console.error('Error updating product:', error)
      alert(`Failed to update product: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const renderIcon = (iconName: string) => {
    const icon = DEFAULT_ICONS.find(i => i.name === iconName)
    if (icon) {
      return (
        <svg className="w-8 h-8 text-[#F56A34]" fill="currentColor" viewBox="0 0 24 24">
          <path d={icon.svg.replace(/<path d="|"\/>/g, '')} />
        </svg>
      )
    }
    return null
  }

  if (productLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-600 mt-2">Update product details and specifications</p>
        </div>


        {/* Step Content - Similar to create page but pre-filled */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Step 1: Categories */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Category</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category)
                      setStep(2)
                    }}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      selectedCategory?.id === category.id
                        ? 'border-[#F56A34] bg-orange-50'
                        : 'border-gray-200 hover:border-[#F56A34]'
                    }`}
                  >
                    {category.icon ? (
                      <img src={category.icon} alt={category.name} className="w-12 h-12 mx-auto mb-2" />
                    ) : (
                      renderIcon(category.name.toLowerCase())
                    )}
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Brands */}
          {step === 2 && selectedCategory && (
            <div>
              <button
                onClick={() => setStep(1)}
                className="mb-4 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
             
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {brands.map((brand) => {
                  const defaultBrand = getDefaultBrand(brand.name)
                  return (
                    <button
                      key={brand.id}
                      onClick={() => {
                        setSelectedBrand(brand)
                        setStep(3)
                      }}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        selectedBrand?.id === brand.id
                          ? 'border-[#F56A34] bg-orange-50'
                          : 'border-gray-200 hover:border-[#F56A34]'
                      }`}
                    >
                      {defaultBrand?.logo ? (
                        <img src={defaultBrand.logo} alt={brand.name} className="w-16 h-16 mx-auto mb-2 object-contain" />
                      ) : brand.icon ? (
                        <img src={brand.icon} alt={brand.name} className="w-16 h-16 mx-auto mb-2 object-contain" />
                      ) : (
                        <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-400">{brand.name[0]}</span>
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Product Details & Specification Selection */}
          {step === 3 && selectedCategory && selectedBrand && (
            <div>
              <button
                onClick={() => setStep(2)}
                className="mb-4 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Edit {selectedCategory.name} - {selectedBrand.name}
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Specifications</h3>
                    {selectedSpecs.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Display Style:</span>
                        <button
                          onClick={() => setSpecDisplayStyle(specDisplayStyle === 'horizontal' ? 'dropdown' : 'horizontal')}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium flex items-center gap-1"
                          title={`Switch to ${specDisplayStyle === 'horizontal' ? 'dropdown' : 'horizontal'} display`}
                        >
                          {specDisplayStyle === 'horizontal' ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                              Horizontal
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Dropdown
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                    {availableSpecs.map((spec) => {
                      const isSelected = selectedSpecs.some(s => s.name === spec.name)
                      return (
                        <label
                          key={spec.id}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#F56A34] bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSpecToggle(spec)}
                              className="w-4 h-4 text-[#F56A34] border-gray-300 rounded focus:ring-[#F56A34]"
                            />
                            <span className="font-medium text-gray-900">{spec.name}</span>
                            {isSelected && <span className="text-red-500">*</span>}
                          </div>
                          <p className="text-xs text-gray-500 capitalize">{spec.valueType}</p>
                        </label>
                      )
                    })}
                  </div>
                  
                  {/* Spec Values Display - Similar to create page */}
                  {selectedSpecs.length > 0 && (
                    <div className="space-y-3 border-t pt-4 mt-4">
                      {selectedSpecs.map((spec) => {
                        const values = specValues[spec.name] || []
                        const inputValue = specInputs[spec.name] ?? ''
                        const options = spec.options || []
                        
                        return (
                          <div key={spec.name} className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <label className="block text-xs font-medium text-gray-700">
                              {spec.name} <span className="text-red-500">*</span>
                            </label>
                            
                            {/* Selected Values */}
                            {values.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {values.map((value) => (
                                  <span
                                    key={value}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                                  >
                                    {value}
                                    <button
                                      onClick={() => handleRemoveSpecValue(spec.name, value)}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {/* Available Options */}
                            {options.length > 0 && (
                              specDisplayStyle === 'horizontal' ? (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {options.map((option) => {
                                    const isSelected = values.includes(option)
                                    return (
                                      <button
                                        key={option}
                                        onClick={() => handleAddFromOptions(spec.name, option)}
                                        className={`px-2 py-0.5 rounded text-xs border transition-all ${
                                          isSelected
                                            ? 'bg-green-100 text-green-800 border-green-300'
                                            : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                      >
                                        {isSelected && '✓ '}
                                        {option}
                                      </button>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="mb-2">
                                  <select
                                    multiple
                                    value={values}
                                    onChange={(e) => {
                                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                                      setSpecValues({
                                        ...specValues,
                                        [spec.name]: selectedOptions
                                      })
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#F56A34] focus:border-transparent min-h-[80px]"
                                    size={Math.min(options.length, 5)}
                                  >
                                    {options.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {values.length > 0 ? `${values.length} selected` : 'Hold Ctrl/Cmd to select multiple'}
                                  </p>
                                </div>
                              )
                            )}
                            
                            {/* Input Field */}
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder={`Add ${spec.name.toLowerCase()}`}
                                value={inputValue ?? ''}
                                onChange={(e) => setSpecInputs({ ...specInputs, [spec.name]: e.target.value || '' })}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddSpecValue(spec.name)
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#F56A34] focus:border-transparent"
                              />
                              <button
                                onClick={() => handleAddSpecValue(spec.name)}
                                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(4)}
                  disabled={!productName.trim() || selectedSpecs.length === 0}
                  className="px-6 py-2 bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  Next: Review & Submit
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div>
              <button
                onClick={() => setStep(3)}
                className="mb-4 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Changes</h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {productName}</p>
                    <p><span className="font-medium">Category:</span> {selectedCategory?.name}</p>
                    <p><span className="font-medium">Brand:</span> {selectedBrand?.name}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Specifications</h3>
                  <div className="space-y-3">
                    {selectedSpecs.map((spec) => (
                      <div key={spec.name}>
                        <p className="font-medium text-gray-700">{spec.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

