'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import IconSelector from '@/components/IconSelector'
import { DEFAULT_BRANDS, getDefaultBrand } from '@/lib/default-brands'
import { DEFAULT_ICONS } from '@/lib/default-icons'

interface Category {
  id: string
  name: string
  icon?: string
  _count?: { items: number }
}

interface Brand {
  id: string
  name: string
  icon?: string
  _count?: { items: number }
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
  { number: 3, title: 'Product & Specs' },
  { number: 4, title: 'Review' }
]

export default function AdminProductsPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [savedProgress, setSavedProgress] = useState<{ step: number; category?: string; brand?: string; product?: string } | null>(null)
  
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
  
  // Category creation
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('')
  const [newCategoryIconType, setNewCategoryIconType] = useState<'default' | 'url' | 'image'>('default')
  const [showNewCategory, setShowNewCategory] = useState(false)
  
  // Brand creation
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandIcon, setNewBrandIcon] = useState('')
  const [newBrandIconType, setNewBrandIconType] = useState<'default' | 'url' | 'image'>('default')
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [deletingAllBrands, setDeletingAllBrands] = useState(false)
  
  // Specifications - track order of selection
  const [selectedSpecs, setSelectedSpecs] = useState<Array<SelectedSpec & { order: number }>>([])
  const [specValues, setSpecValues] = useState<Record<string, string[]>>({})
  const [specInputs, setSpecInputs] = useState<Record<string, string>>({})
  const [specOrderCounter, setSpecOrderCounter] = useState(1)
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Specification[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [commonSpecs, setCommonSpecs] = useState<Array<{ name: string; valueType: string; options?: string | string[]; icon?: string }>>([])
  const [brandSpecs, setBrandSpecs] = useState<Specification[]>([])
  
  // Create specification modal
  const [showCreateSpecModal, setShowCreateSpecModal] = useState(false)
  const [newSpec, setNewSpec] = useState<{ name: string; valueType: string; options: string[]; icon?: string }>({
    name: '',
    valueType: 'select',
    options: []
  })
  const [newSpecOption, setNewSpecOption] = useState('')
  
  // Display style for specifications (horizontal buttons vs dropdown)
  const [specDisplayStyle, setSpecDisplayStyle] = useState<'horizontal' | 'dropdown'>('horizontal')
  
  // Document Analysis
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  
  // Replace/Overwrite Modal
  const [replaceModal, setReplaceModal] = useState<{
    isOpen: boolean
    existingItem: any | null
    newProductData: any | null
  }>({
    isOpen: false,
    existingItem: null,
    newProductData: null
  })
  const [analysisStep, setAnalysisStep] = useState(0) // 0: upload, 1: analyzing, 2: review, 3: permissions
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [useAIAnalysis, setUseAIAnalysis] = useState(false)
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file')
  const [textInput, setTextInput] = useState('')
  
  // Editing
  const [editingProduct, setEditingProduct] = useState<any>(null)

  useLayoutEffect(() => {
    fetchCategories()
    // Load saved progress
    const saved = localStorage.getItem('admin_product_progress')
    if (saved) {
      try {
        const progress = JSON.parse(saved)
        setSavedProgress(progress)
        if (progress.step) {
          setStep(progress.step)
        }
        if (progress.category) {
          const category = categories.find(c => c.id === progress.category || c.name === progress.category)
          if (category) {
            setSelectedCategory(category)
          }
        }
        if (progress.brand) {
          const brand = brands.find(b => b.id === progress.brand || b.name === progress.brand)
          if (brand) {
            setSelectedBrand(brand)
          }
        }
        if (progress.product) {
          setProductName(progress.product)
        }
      } catch (e) {
        console.error('Error loading saved progress:', e)
      }
    }
  }, [])

  // Save progress to localStorage
  useLayoutEffect(() => {
    const progress = {
      step,
      category: selectedCategory?.id || selectedCategory?.name,
      brand: selectedBrand?.id || selectedBrand?.name,
      product: productName
    }
    localStorage.setItem('admin_product_progress', JSON.stringify(progress))
    setSavedProgress(progress)
  }, [step, selectedCategory, selectedBrand, productName])

  useLayoutEffect(() => {
    if (selectedCategory) {
      fetchBrands()
    }
  }, [selectedCategory])

  useLayoutEffect(() => {
    if (step === 3 && selectedCategory && selectedBrand) {
      fetchAvailableSpecs()
    }
  }, [step, selectedCategory, selectedBrand])

  useLayoutEffect(() => {
    if (selectedCategory) {
      fetchCategorySpecs()
      fetchCommonSpecs()
    }
  }, [selectedCategory])

  useLayoutEffect(() => {
    if (selectedCategory && selectedBrand) {
      fetchBrandSpecs()
    }
  }, [selectedCategory, selectedBrand])

  // Close search results when clicking outside
  useLayoutEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
    }

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchResults])

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

  const fetchCategorySpecs = async () => {
    if (!selectedCategory) return

    try {
      const res = await fetch(`/api/admin/category-specifications?categoryId=${selectedCategory.id}`)
      if (res.ok) {
        const data = await res.json()
        const specs = (data.specifications || []).map((spec: any) => ({
          id: spec.id,
          name: spec.name,
          valueType: spec.valueType,
          options: spec.options || null,
          icon: spec.icon || null,
          isRequired: spec.isRequired
        }))
        setAvailableSpecs(specs)
        
        // Auto-select required specifications
        const requiredSpecs = specs.filter((s: any) => s.isRequired)
        if (requiredSpecs.length > 0) {
          const newSelectedSpecs: Array<SelectedSpec & { order: number }> = requiredSpecs.map((spec: any, index: number) => ({
            name: spec.name,
            valueType: spec.valueType,
            options: spec.options ? (typeof spec.options === 'string' ? JSON.parse(spec.options) : spec.options) : undefined,
            icon: spec.icon,
            order: index + 1
          }))
          setSelectedSpecs(newSelectedSpecs)
          setSpecOrderCounter(requiredSpecs.length + 1)
          
          // Initialize spec values for required specs
          const newSpecValues: Record<string, string[]> = {}
          requiredSpecs.forEach((spec: any) => {
            newSpecValues[spec.name] = []
          })
          setSpecValues(newSpecValues)
          
          const newSpecInputs: Record<string, string> = {}
          requiredSpecs.forEach((spec: any) => {
            newSpecInputs[spec.name] = ''
          })
          setSpecInputs(newSpecInputs)
        }
      } else {
        // Fallback to empty array if no specs configured
        setAvailableSpecs([])
      }
    } catch (error) {
      console.error('Error fetching category specifications:', error)
      setAvailableSpecs([])
    }
  }

  const fetchBrandSpecs = async () => {
    if (!selectedCategory || !selectedBrand) return

    try {
      const res = await fetch(`/api/admin/brand-specifications?companyId=${selectedBrand.id}&categoryId=${selectedCategory.id}`)
      if (res.ok) {
        const data = await res.json()
        const specs = (data.specifications || []).map((spec: any) => ({
          id: spec.id,
          name: spec.name,
          valueType: spec.valueType,
          options: spec.options || null,
          icon: spec.icon || null,
          isRequired: spec.isRequired
        }))
        setBrandSpecs(specs)
        
        // Merge brand specs with available specs (avoid duplicates)
        setAvailableSpecs(prev => {
          const existingNames = new Set(prev.map(s => s.name))
          const newBrandSpecs = specs.filter((s: any) => !existingNames.has(s.name))
          return [...prev, ...newBrandSpecs]
        })
      }
    } catch (error) {
      console.error('Error fetching brand specifications:', error)
    }
  }

  const fetchCommonSpecs = async () => {
    try {
      const res = await fetch('/api/admin/configurations/common-specs')
      if (res.ok) {
        const data = await res.json()
        setCommonSpecs(data.commonSpecs || [])
      } else {
        // Fallback to default common specs
        setCommonSpecs([
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
        ])
      }
    } catch (error) {
      console.error('Error fetching common specs:', error)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const queryLower = query.toLowerCase()
    const results: Specification[] = []

    // Search in available specs (category + brand)
    availableSpecs.forEach(spec => {
      if (spec.name.toLowerCase().includes(queryLower)) {
        results.push(spec)
      }
    })

    // Search in common specs
    commonSpecs.forEach(spec => {
      if (spec.name.toLowerCase().includes(queryLower)) {
        const exists = results.some(r => r.name === spec.name)
        if (!exists) {
          results.push({
            id: `common-${spec.name}`,
            name: spec.name,
            valueType: spec.valueType,
            options: typeof spec.options === 'string' ? spec.options : (spec.options ? JSON.stringify(spec.options) : null),
            icon: spec.icon || null
          })
        }
      }
    })

    setSearchResults(results)
    setShowSearchResults(true)
  }

  const handleCreateSpecification = async () => {
    if (!newSpec.name.trim()) {
      alert('Please enter a specification name')
      return
    }

    if (!selectedCategory) {
      alert('Please select a category')
      return
    }

    setLoading(true)
    try {
      const specData: any = {
        categoryId: selectedCategory.id,
        name: newSpec.name.trim(),
        valueType: newSpec.valueType,
        options: newSpec.options.length > 0 ? JSON.stringify(newSpec.options) : null
      }

      let createdSpec: any = null

      // If brand is selected, create brand specification
      if (selectedBrand) {
        specData.companyId = selectedBrand.id
        const res = await fetch('/api/admin/brand-specifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(specData)
        })

        if (res.ok) {
          const data = await res.json()
          createdSpec = data.specification
          
          // Add to available specs immediately
          const newSpecItem: Specification = {
            id: createdSpec.id,
            name: createdSpec.name,
            valueType: createdSpec.valueType,
            options: createdSpec.options || null,
            icon: createdSpec.icon || null
          }
          
          // Check if it already exists
          const exists = availableSpecs.some(s => s.name === newSpecItem.name)
          if (!exists) {
            setAvailableSpecs(prev => [...prev, newSpecItem])
          }
          
          // Automatically select the newly created spec
          const isAlreadySelected = selectedSpecs.some(s => s.name === newSpecItem.name)
          if (!isAlreadySelected) {
            const newSelectedSpec: SelectedSpec & { order: number } = {
              name: newSpecItem.name,
              valueType: newSpecItem.valueType,
              options: newSpec.options.length > 0 ? newSpec.options : undefined,
              icon: newSpecItem.icon,
              order: specOrderCounter
            }
            setSelectedSpecs(prev => [...prev, newSelectedSpec].sort((a, b) => a.order - b.order))
            setSpecOrderCounter(prev => prev + 1)
            
            // Initialize spec values
            setSpecValues(prev => ({
              ...prev,
              [newSpecItem.name]: newSpec.options.length > 0 ? newSpec.options : []
            }))
            setSpecInputs(prev => ({
              ...prev,
              [newSpecItem.name]: ''
            }))
          }
          
          // Refresh brand specs
          await fetchBrandSpecs()
          await fetchCategorySpecs()
          
          alert('Brand specification created and selected successfully!')
        } else {
          const errorData = await res.json()
          alert(`Error: ${errorData.error || 'Failed to create specification'}`)
          setLoading(false)
          return
        }
      } else {
        // Create category specification
        const res = await fetch('/api/admin/category-specifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(specData)
        })

        if (res.ok) {
          const data = await res.json()
          createdSpec = data.specification
          
          // Add to available specs immediately
          const newSpecItem: Specification = {
            id: createdSpec.id,
            name: createdSpec.name,
            valueType: createdSpec.valueType,
            options: createdSpec.options || null,
            icon: createdSpec.icon || null
          }
          
          // Check if it already exists
          const exists = availableSpecs.some(s => s.name === newSpecItem.name)
          if (!exists) {
            setAvailableSpecs(prev => [...prev, newSpecItem])
          }
          
          // Automatically select the newly created spec
          const isAlreadySelected = selectedSpecs.some(s => s.name === newSpecItem.name)
          if (!isAlreadySelected) {
            const newSelectedSpec: SelectedSpec & { order: number } = {
              name: newSpecItem.name,
              valueType: newSpecItem.valueType,
              options: newSpec.options.length > 0 ? newSpec.options : undefined,
              icon: newSpecItem.icon,
              order: specOrderCounter
            }
            setSelectedSpecs(prev => [...prev, newSelectedSpec].sort((a, b) => a.order - b.order))
            setSpecOrderCounter(prev => prev + 1)
            
            // Initialize spec values
            setSpecValues(prev => ({
              ...prev,
              [newSpecItem.name]: newSpec.options.length > 0 ? newSpec.options : []
            }))
            setSpecInputs(prev => ({
              ...prev,
              [newSpecItem.name]: ''
            }))
          }
          
          // Refresh category specs
          await fetchCategorySpecs()
          
          alert('Category specification created and selected successfully!')
        } else {
          const errorData = await res.json()
          alert(`Error: ${errorData.error || 'Failed to create specification'}`)
          setLoading(false)
          return
        }
      }

      // Reset form and close modal
      setNewSpec({ name: '', valueType: 'select', options: [] })
      setNewSpecOption('')
      setShowCreateSpecModal(false)
      setSearchQuery('')
      setShowSearchResults(false)
      setLoading(false)
    } catch (error) {
      console.error('Error creating specification:', error)
      alert('Failed to create specification. Please try again.')
      setLoading(false)
    }
  }

  const handleSaveSpecifications = async () => {
    if (!selectedCategory) {
      alert('Please select a category')
      return
    }

    if (selectedSpecs.length === 0) {
      alert('No specifications selected to save')
      return
    }

    try {
      const specsToSave = selectedSpecs.map((spec, index) => {
        const options = spec.options || []
        return {
          name: spec.name,
          valueType: spec.valueType,
          options: options.length > 0 ? JSON.stringify(options) : null,
          icon: spec.icon || null,
          order: spec.order || index + 1,
          isRequired: false
        }
      })

      const res = await fetch('/api/admin/category-specifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          specifications: specsToSave
        })
      })

      if (res.ok) {
        alert('Specifications saved to configuration successfully!')
        await fetchCategorySpecs()
      } else {
        const errorData = await res.json()
        alert(`Error: ${errorData.error || 'Failed to save specifications'}`)
      }
    } catch (error) {
      console.error('Error saving specifications:', error)
      alert('Failed to save specifications. Please try again.')
    }
  }

  const handleAISpecGeneration = async () => {
    if (!selectedCategory) {
      alert('Please select a category first')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/products/analyze-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          companyId: selectedBrand?.id || null
        })
      })

      if (res.ok) {
        const data = await res.json()
        
        // Refresh available specs
        await fetchCategorySpecs()
        
        // Show success message
        alert(`Successfully generated ${data.createdSpecs} new specifications for ${data.category.name}${data.brand ? ` (${data.brand.name})` : ''}. Total specifications: ${data.specifications.length}`)
      } else {
        const errorData = await res.json()
        alert(`Error: ${errorData.error || 'Failed to generate specifications'}`)
      }
    } catch (error) {
      console.error('Error generating AI specifications:', error)
      alert('Failed to generate specifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSpecs = () => {
    // This will be populated by fetchCategorySpecs when category is selected
    // If no category specs are configured, show empty array
    if (availableSpecs.length === 0 && selectedCategory) {
      fetchCategorySpecs()
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          icon: newCategoryIcon || null
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setSelectedCategory(data.category)
        setCategories([...categories, data.category])
        setNewCategoryName('')
        setNewCategoryIcon('')
        setShowNewCategory(false)
        setStep(2)
      }
    } catch (error) {
      console.error('Error creating category:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBrandName,
          icon: newBrandIcon || null
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        // Brand created or already exists - use it
        setSelectedBrand(data.company)
        // Only add to list if it's not already there
        if (!brands.find(b => b.id === data.company.id)) {
          setBrands([...brands, data.company])
        }
        setNewBrandName('')
        setNewBrandIcon('')
        setShowNewBrand(false)
        setStep(3)
      } else {
        // Handle error
        const errorMessage = data.error || data.message || 'Failed to create brand'
        if (errorMessage.includes('already exists')) {
          // If brand exists, use it
          if (data.company) {
            setSelectedBrand(data.company)
            if (!brands.find(b => b.id === data.company.id)) {
              setBrands([...brands, data.company])
            }
            setNewBrandName('')
            setNewBrandIcon('')
            setShowNewBrand(false)
            setStep(3)
          }
        } else {
          alert(errorMessage)
        }
      }
    } catch (error) {
      console.error('Error creating brand:', error)
      alert('Failed to create brand')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAllBrands = async () => {
    if (!confirm(`Are you sure you want to delete ALL brands? This action cannot be undone.\n\nThis will delete:\n- All ${brands.length} brand(s)\n- All associated listings\n- All item-brand relationships`)) {
      return
    }

    setDeletingAllBrands(true)
    try {
      const res = await fetch('/api/admin/brands/delete-all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message || 'All brands deleted successfully')
        setBrands([])
        setSelectedBrand(null)
        // Refresh brands list
        await fetchBrands()
      } else {
        alert(data.error || 'Failed to delete all brands')
      }
    } catch (error) {
      console.error('Error deleting all brands:', error)
      alert('Failed to delete all brands')
    } finally {
      setDeletingAllBrands(false)
    }
  }

  const handleSpecToggle = (spec: Specification) => {
    const isSelected = selectedSpecs.some(s => s.name === spec.name)
    
    if (isSelected) {
      // Remove spec and reorder remaining specs
      const removedSpec = selectedSpecs.find(s => s.name === spec.name)
      const remainingSpecs = selectedSpecs
        .filter(s => s.name !== spec.name)
        .map((s, index) => ({ ...s, order: index + 1 }))
      setSelectedSpecs(remainingSpecs)
      
      const newSpecValues = { ...specValues }
      delete newSpecValues[spec.name]
      setSpecValues(newSpecValues)
      const newSpecInputs = { ...specInputs }
      delete newSpecInputs[spec.name]
      setSpecInputs(newSpecInputs)
      
      // Decrement counter if needed
      if (remainingSpecs.length === 0) {
        setSpecOrderCounter(1)
      }
    } else {
      // Add spec with current order number
      const newSpec: SelectedSpec & { order: number } = {
        name: spec.name,
        valueType: spec.valueType,
        options: spec.options ? JSON.parse(spec.options) : undefined,
        icon: spec.icon,
        order: specOrderCounter
      }
      setSelectedSpecs([...selectedSpecs, newSpec].sort((a, b) => a.order - b.order))
      setSpecValues({ ...specValues, [spec.name]: [] })
      setSpecInputs({ ...specInputs, [spec.name]: '' })
      setSpecOrderCounter(specOrderCounter + 1)
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

  const handleMoveSpecUp = (specName: string) => {
    const sortedSpecs = [...selectedSpecs].sort((a, b) => a.order - b.order)
    const currentIndex = sortedSpecs.findIndex(s => s.name === specName)
    
    if (currentIndex > 0) {
      const newSpecs = [...sortedSpecs]
      const temp = newSpecs[currentIndex]
      newSpecs[currentIndex] = newSpecs[currentIndex - 1]
      newSpecs[currentIndex - 1] = temp
      
      // Update order numbers
      newSpecs.forEach((spec, index) => {
        spec.order = index + 1
      })
      
      setSelectedSpecs(newSpecs)
    }
  }

  const handleMoveSpecDown = (specName: string) => {
    const sortedSpecs = [...selectedSpecs].sort((a, b) => a.order - b.order)
    const currentIndex = sortedSpecs.findIndex(s => s.name === specName)
    
    if (currentIndex < sortedSpecs.length - 1) {
      const newSpecs = [...sortedSpecs]
      const temp = newSpecs[currentIndex]
      newSpecs[currentIndex] = newSpecs[currentIndex + 1]
      newSpecs[currentIndex + 1] = temp
      
      // Update order numbers
      newSpecs.forEach((spec, index) => {
        spec.order = index + 1
      })
      
      setSelectedSpecs(newSpecs)
    }
  }

  const handleRemoveSpec = async (specName: string, specId?: string) => {
    // Remove from selected specs
    const remainingSpecs = selectedSpecs.filter(s => s.name !== specName)
    setSelectedSpecs(remainingSpecs.sort((a, b) => a.order - b.order))
    const newSpecValues = { ...specValues }
    delete newSpecValues[specName]
    setSpecValues(newSpecValues)
    const newSpecInputs = { ...specInputs }
    delete newSpecInputs[specName]
    setSpecInputs(newSpecInputs)
    
    // If specId is provided, delete from configurations
    if (specId && selectedCategory) {
      try {
        // Try to delete from category specifications
        const res = await fetch(`/api/admin/category-specifications/${specId}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          await fetchCategorySpecs()
          alert('Specification removed and deleted from configuration')
        } else {
          // Try brand specification if category fails
          if (selectedBrand) {
            const brandRes = await fetch(`/api/admin/brand-specifications/${specId}`, {
              method: 'DELETE'
            })
            if (brandRes.ok) {
              await fetchBrandSpecs()
              alert('Specification removed and deleted from configuration')
            }
          }
        }
      } catch (error) {
        console.error('Error deleting specification:', error)
      }
    }
    
    // Decrement counter if needed
    if (remainingSpecs.length === 0) {
      setSpecOrderCounter(1)
    }
  }

  const handleDocumentUpload = async (file: File) => {
    if (!selectedCategory) {
      alert('Please select a category first')
      return
    }
    
    setUploadedFile(file)
    setAnalyzing(true)
    setAnalysisStep(1)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('categoryId', selectedCategory.id)
      formData.append('categoryName', selectedCategory.name || '')
      formData.append('itemName', productName || '')
      formData.append('autoCreate', 'true') // Auto-create specifications
      
      const res = await fetch('/api/admin/products/analyze-document', {
        method: 'POST',
        body: formData
      })
      
      if (res.ok) {
        const data = await res.json()
        setAnalysisResult(data.analysis)
        
        // Refresh available specs if any were created
        if (data.createdSpecs > 0) {
          await fetchCategorySpecs()
          alert(`✅ Successfully created ${data.createdSpecs} new specification(s) from the document analysis!`)
        }
        
        setAnalysisStep(2) // Review step
        setAnalyzing(false)
      } else {
        const errorData = await res.json()
        alert(`Failed to analyze document: ${errorData.error || 'Unknown error'}`)
        setAnalyzing(false)
        setAnalysisStep(0)
      }
    } catch (error) {
      console.error('Error analyzing document:', error)
      alert('Error analyzing document. Please try again or use manual entry.')
      setAnalyzing(false)
      setAnalysisStep(0)
    }
  }

  const handleTextAnalysis = async () => {
    if (!textInput.trim()) {
      alert('Please enter some text to analyze')
      return
    }
    
    if (!selectedCategory) {
      alert('Please select a category first')
      return
    }
    
    setAnalyzing(true)
    setAnalysisStep(1)
    
    try {
      // Create a text file from the input
      const blob = new Blob([textInput], { type: 'text/plain' })
      const file = new File([blob], 'input.txt', { type: 'text/plain' })
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('categoryId', selectedCategory.id)
      formData.append('categoryName', selectedCategory.name || '')
      formData.append('itemName', productName || '')
      formData.append('autoCreate', 'true') // Auto-create specifications
      
      const res = await fetch('/api/admin/products/analyze-document', {
        method: 'POST',
        body: formData
      })
      
      if (res.ok) {
        const data = await res.json()
        setAnalysisResult(data.analysis)
        
        // Refresh available specs if any were created
        if (data.createdSpecs > 0) {
          await fetchCategorySpecs()
          alert(`✅ Successfully created ${data.createdSpecs} new specification(s) from the text analysis!`)
        }
        
        setAnalysisStep(2) // Review step
        setAnalyzing(false)
      } else {
        const errorData = await res.json()
        alert(`Failed to analyze text: ${errorData.error || 'Unknown error'}`)
        setAnalyzing(false)
        setAnalysisStep(0)
      }
    } catch (error) {
      console.error('Error analyzing text:', error)
      alert('Error analyzing text. Please try again or use manual entry.')
      setAnalyzing(false)
      setAnalysisStep(0)
    }
  }

  const handleApplyAnalysis = async () => {
    if (!analysisResult) return
    
    // Auto-fill product name if extracted
    if (analysisResult.productName && !productName) {
      setProductName(analysisResult.productName)
    }
    
    // Auto-create missing specifications and auto-fill all fields
    const missingSpecs: string[] = []
    const createdSpecs: string[] = []
    let updatedAvailableSpecs = [...availableSpecs]
    
    for (const spec of analysisResult.specifications) {
      // Check if specification exists
      const existingSpec = updatedAvailableSpecs.find(s => s.name === spec.name)
      
      if (!existingSpec) {
        // Create new specification automatically
        try {
          const res = await fetch('/api/admin/specifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: spec.name,
              valueType: spec.valueType,
              options: spec.options && spec.options.length > 0 ? JSON.stringify(spec.options) : null,
              type: 'item',
              itemId: '', // Will be set when product is created
              categoryId: selectedCategory?.id || null
            })
          })
          
          if (res.ok) {
            const data = await res.json()
            // Add to available specs
            updatedAvailableSpecs.push({
              id: data.specification.id,
              name: data.specification.name,
              valueType: data.specification.valueType,
              options: data.specification.options,
              icon: data.specification.icon
            })
            createdSpecs.push(spec.name)
          } else {
            missingSpecs.push(spec.name)
          }
        } catch (error) {
          console.error(`Error creating specification ${spec.name}:`, error)
          missingSpecs.push(spec.name)
        }
      }
    }
    
    // Update available specs state
    setAvailableSpecs(updatedAvailableSpecs)
    
    // Refresh available specs from API to ensure we have latest data
    let finalAvailableSpecs = updatedAvailableSpecs
    if (selectedCategory) {
      try {
        const res = await fetch(`/api/admin/category-specifications?categoryId=${selectedCategory.id}`)
        if (res.ok) {
          const data = await res.json()
          const categorySpecs = (data.specifications || []).map((spec: any) => ({
            id: spec.id,
            name: spec.name,
            valueType: spec.valueType,
            options: spec.options || null,
            icon: spec.icon || null,
            isRequired: spec.isRequired
          }))
          // Merge category specs with newly created specs
          const mergedSpecs = [...categorySpecs]
          updatedAvailableSpecs.forEach(newSpec => {
            if (!mergedSpecs.find(s => s.name === newSpec.name)) {
              mergedSpecs.push(newSpec)
            }
          })
          finalAvailableSpecs = mergedSpecs
          setAvailableSpecs(finalAvailableSpecs)
        }
      } catch (error) {
        console.error('Error refreshing specs:', error)
      }
    }
    
    // Show notification for created/missing specs
    let notificationMessage = ''
    if (createdSpecs.length > 0) {
      notificationMessage += `✅ Created ${createdSpecs.length} new specification(s): ${createdSpecs.join(', ')}\n`
    }
    if (missingSpecs.length > 0) {
      notificationMessage += `⚠️ Could not create ${missingSpecs.length} specification(s): ${missingSpecs.join(', ')}. Please create them manually.`
    }
    if (notificationMessage) {
      alert(notificationMessage.trim())
    }
    
    // Auto-fill all specifications and values
    const newSelectedSpecs: Array<SelectedSpec & { order: number }> = []
    const newSpecValues: Record<string, string[]> = {}
    let orderCounter = specOrderCounter
    
    for (const spec of analysisResult.specifications) {
      // Check if spec exists (either original or newly created)
      const specExists = finalAvailableSpecs.find(s => s.name === spec.name)
      const isAlreadySelected = selectedSpecs.some(s => s.name === spec.name)
      
      if (specExists && !isAlreadySelected) {
        // Add to selected specs
        const newSpec: SelectedSpec & { order: number } = {
          name: spec.name,
          valueType: spec.valueType,
          options: spec.options || [],
          order: orderCounter
        }
        newSelectedSpecs.push(newSpec)
        
        // Set values if options are provided (for select type with options)
        if (spec.valueType === 'select' && spec.options && spec.options.length > 0) {
          // For select type, use all provided options as values
          newSpecValues[spec.name] = spec.options
        } else if (spec.value) {
          // If single value provided, add it
          newSpecValues[spec.name] = [spec.value]
        } else {
          newSpecValues[spec.name] = []
        }
        
        orderCounter++
      }
    }
    
    // Update state with all auto-filled data
    setSelectedSpecs([...selectedSpecs, ...newSelectedSpecs].sort((a, b) => a.order - b.order))
    setSpecValues({ ...specValues, ...newSpecValues })
    setSpecOrderCounter(orderCounter)
    
    // Save permanent records
    await savePermanentSpecifications(analysisResult.specifications)
    
    // Close modal and mark as using AI analysis
    setUseAIAnalysis(true)
    setShowDocumentUpload(false)
    setAnalysisStep(0)
    setAnalysisResult(null)
    setPermissions({})
    setTextInput('')
    setInputMode('file')
    
    // Show success message
    alert(`✅ Successfully analyzed and filled ${newSelectedSpecs.length} specification(s)!`)
  }

  const handlePermissionToggle = (specName: string, approved: boolean) => {
    setPermissions({ ...permissions, [specName]: approved })
  }

  const handleApplyApprovedSpecs = async () => {
    const approvedSpecs = analysisResult.specifications.filter((spec: any) => 
      permissions[spec.name] === true
    )
    
    if (approvedSpecs.length === 0) {
      alert('Please select at least one specification to apply')
      return
    }
    
    // Auto-fill product name if extracted
    if (analysisResult.productName && !productName) {
      setProductName(analysisResult.productName)
    }
    
    const missingSpecs: string[] = []
    const createdSpecs: string[] = []
    
    // Create specifications if they don't exist
    for (const spec of approvedSpecs) {
      const existingSpec = availableSpecs.find(s => s.name === spec.name)
      
      if (!existingSpec) {
        // Create new specification automatically
        try {
          const res = await fetch('/api/admin/specifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: spec.name,
              valueType: spec.valueType,
              options: spec.options && spec.options.length > 0 ? JSON.stringify(spec.options) : null,
              type: 'item',
              itemId: '', // Will be set when product is created
              categoryId: selectedCategory?.id || null
            })
          })
          
          if (res.ok) {
            const data = await res.json()
            // Add to available specs
            setAvailableSpecs([...availableSpecs, {
              id: data.specification.id,
              name: data.specification.name,
              valueType: data.specification.valueType,
              options: data.specification.options,
              icon: data.specification.icon
            }])
            createdSpecs.push(spec.name)
          } else {
            missingSpecs.push(spec.name)
          }
        } catch (error) {
          console.error(`Error creating specification ${spec.name}:`, error)
          missingSpecs.push(spec.name)
        }
      }
    }
    
    // Show notification for created/missing specs
    if (createdSpecs.length > 0) {
      alert(`✅ Created ${createdSpecs.length} new specification(s): ${createdSpecs.join(', ')}`)
    }
    if (missingSpecs.length > 0) {
      alert(`⚠️ Could not create ${missingSpecs.length} specification(s): ${missingSpecs.join(', ')}. Please create them manually.`)
    }
    
    // Auto-fill all approved specifications and values
    const newSelectedSpecs: Array<SelectedSpec & { order: number }> = []
    const newSpecValues: Record<string, string[]> = {}
    let orderCounter = specOrderCounter
    
    for (const spec of approvedSpecs) {
      const isSelected = selectedSpecs.some(s => s.name === spec.name)
      if (!isSelected) {
        const newSpec: SelectedSpec & { order: number } = {
          name: spec.name,
          valueType: spec.valueType,
          options: spec.options || [],
          order: orderCounter
        }
        newSelectedSpecs.push(newSpec)
        
        // Set values if options are provided
        if (spec.options && spec.options.length > 0) {
          newSpecValues[spec.name] = spec.options
        } else if (spec.value) {
          newSpecValues[spec.name] = [spec.value]
        } else {
          newSpecValues[spec.name] = []
        }
        
        orderCounter++
      }
    }
    
    // Update state with all auto-filled data
    setSelectedSpecs([...selectedSpecs, ...newSelectedSpecs].sort((a, b) => a.order - b.order))
    setSpecValues({ ...specValues, ...newSpecValues })
    setSpecOrderCounter(orderCounter)
    
    // Save permanent records
    await savePermanentSpecifications(approvedSpecs)
    
    setUseAIAnalysis(true)
    setShowDocumentUpload(false)
    setAnalysisStep(0)
    setAnalysisResult(null)
    setPermissions({})
    setTextInput('')
    setInputMode('file')
    
    alert(`✅ Successfully applied ${approvedSpecs.length} specification(s)!`)
  }

  const savePermanentSpecifications = async (specs: any[]) => {
    // Save specifications permanently to database for this category/item
    try {
      // Save to category specifications if category is selected
      if (selectedCategory) {
        const categorySpecs = specs.map(spec => ({
          name: spec.name,
          valueType: spec.valueType,
          options: spec.options && spec.options.length > 0 ? JSON.stringify(spec.options) : null,
          icon: null,
          isRequired: false,
          order: null
        }))
        
        // Get existing category specs
        const existingRes = await fetch(`/api/admin/category-specifications?categoryId=${selectedCategory.id}`)
        if (existingRes.ok) {
          const existingData = await existingRes.json()
          const existingNames = new Set((existingData.specifications || []).map((s: any) => s.name))
          
          // Only add new specs
          const newSpecs = categorySpecs.filter(s => !existingNames.has(s.name))
          
          if (newSpecs.length > 0) {
            const allSpecs = [
              ...(existingData.specifications || []).map((s: any) => ({
                name: s.name,
                valueType: s.valueType,
                options: s.options,
                icon: s.icon,
                isRequired: s.isRequired,
                order: s.order
              })),
              ...newSpecs
            ]
            
            await fetch('/api/admin/category-specifications', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                categoryId: selectedCategory.id,
                specifications: allSpecs
              })
            })
          }
        }
      }
    } catch (error) {
      console.error('Error saving permanent specifications:', error)
    }
  }

  const handleReplaceProduct = async (overwrite: boolean) => {
    if (!replaceModal.existingItem || !replaceModal.newProductData) return

    if (overwrite) {
      setLoading(true)
      try {
        // Update existing product with new data
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...replaceModal.newProductData,
            overwrite: true, // Flag to indicate overwrite
            existingItemId: replaceModal.existingItem.id
          })
        })

        const responseData = await res.json()
        
        if (res.ok) {
          setReplaceModal({ isOpen: false, existingItem: null, newProductData: null })
          router.push('/admin/products/list')
        } else {
          const errorMessage = responseData.error || 'Failed to update product'
          alert(errorMessage)
        }
      } catch (error: any) {
        console.error('Error replacing product:', error)
        alert(`Failed to replace product: ${error.message || 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    } else {
      // Cancel - just close modal
      setReplaceModal({ isOpen: false, existingItem: null, newProductData: null })
    }
  }

  const handleSubmit = async () => {
    if (!productName.trim() || !selectedCategory || !selectedBrand) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          categoryId: selectedCategory.id,
          companyId: selectedBrand.id,
          icon: productIcon || null,
          selectedSpecs: selectedSpecs.map(spec => ({
            name: spec.name,
            valueType: spec.valueType,
            options: spec.options || null, // Ensure options is always included (null if not provided)
            icon: spec.icon || null,
            order: spec.order !== undefined ? spec.order : null
          })),
          specValues
        })
      })

      const responseData = await res.json()
      
      if (res.ok) {
        router.push('/admin/products/list')
      } else if (res.status === 409 && responseData.conflict) {
        // Product already exists - show replace/overwrite modal
        setReplaceModal({
          isOpen: true,
          existingItem: responseData.item,
          newProductData: {
            name: productName,
            categoryId: selectedCategory?.id,
            companyId: selectedBrand?.id,
            icon: productIcon || null,
            selectedSpecs: selectedSpecs.map(spec => ({
              name: spec.name,
              valueType: spec.valueType,
              options: spec.options || null,
              icon: spec.icon || null,
              order: spec.order !== undefined ? spec.order : null
            })),
            specValues
          }
        })
        setLoading(false)
      } else {
        console.error('API Error Response:', responseData)
        const errorMessage = responseData.error || 'Failed to create product'
        const errorDetails = responseData.details ? `\n\nDetails: ${JSON.stringify(responseData.details, null, 2)}` : ''
        alert(`${errorMessage}${errorDetails}`)
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Error creating product:', error)
      alert(`Failed to create product: ${error.message || 'Unknown error'}`)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-4 lg:py-6">
        {/* Header - Mobile Optimized */}
        <div className="mb-3 sm:mb-4 flex justify-between items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-gray-900">Add Product</h1>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
                // Reset all state
                setStep(1)
                setSelectedCategory(null)
                setSelectedBrand(null)
                setProductName('')
                setProductIcon('')
                setProductIconType('default')
                setNewCategoryName('')
                setNewCategoryIcon('')
                setNewCategoryIconType('default')
                setShowNewCategory(false)
                setNewBrandName('')
                setNewBrandIcon('')
                setNewBrandIconType('default')
                setShowNewBrand(false)
                setSelectedSpecs([])
                setSpecValues({})
                setSpecInputs({})
                setSpecOrderCounter(1)
                // Reset AI analysis state
                setShowDocumentUpload(false)
                setUploadedFile(null)
                setAnalyzing(false)
                setAnalysisResult(null)
                setAnalysisStep(0)
                setPermissions({})
                setUseAIAnalysis(false)
                setTextInput('')
                setInputMode('file')
                router.push('/admin/products/list')
              }
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Progress Bar - Mobile Scrollable */}
        <div className="mb-3 overflow-x-auto pb-2 -mx-2 sm:mx-0">
          <div className="flex items-center justify-between min-w-max px-2 sm:px-0">
            {STEPS.map((s, index) => {
              const isCompleted = step > s.number
              const isCurrent = step === s.number
              const hasProgress = savedProgress && savedProgress.step >= s.number
              return (
                <div key={s.number} className="flex items-center flex-1 min-w-[60px] sm:min-w-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold relative ${
                        isCompleted || isCurrent
                          ? 'bg-[#F56A34] text-white'
                          : hasProgress
                          ? 'bg-orange-200 text-orange-700 border-2 border-orange-400'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      ) : (
                        s.number
                      )}
                    </div>
                    <span className="mt-1 text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">{s.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 sm:mx-2 min-w-[20px] ${
                        isCompleted ? 'bg-[#F56A34]' : hasProgress ? 'bg-orange-200' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
          {/* Step 1: Categories */}
          {step === 1 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Select a category or create a new one</h2>
              
              {!showNewCategory ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category)
                          setStep(2)
                        }}
                        className={`p-2 sm:p-3 border-2 rounded-lg text-center transition-all ${
                          selectedCategory?.id === category.id
                            ? 'border-[#F56A34] bg-orange-50'
                            : 'border-gray-200 hover:border-[#F56A34]'
                        }`}
                      >
                        {category.icon ? (
                          <img src={category.icon} alt={category.name} className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5 object-contain" />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5">{renderIcon(category.name.toLowerCase())}</div>
                        )}
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{category.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500">{category._count?.items || 0} items</p>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setShowNewCategory(true)}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    + Add Category
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Category name"
                    value={newCategoryName || ''}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <IconSelector
                    iconType={newCategoryIconType}
                    icon={newCategoryIcon}
                    onIconTypeChange={setNewCategoryIconType}
                    onIconChange={setNewCategoryIcon}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleCreateCategory}
                      disabled={loading || !newCategoryName.trim()}
                      className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Create Category
                    </button>
                    <button
                      onClick={() => {
                        setShowNewCategory(false)
                        setNewCategoryName('')
                        setNewCategoryIcon('')
                      }}
                      className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Brands */}
          {step === 2 && selectedCategory && (
            <div>
              <button
                onClick={() => setStep(1)}
                className="mb-3 text-xs sm:text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Select a brand or create a new one</h2>
              
              {/* Show selected category */}
              {selectedCategory && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedCategory.icon ? (
                      <img src={selectedCategory.icon} alt={selectedCategory.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8">{renderIcon(selectedCategory.name.toLowerCase())}</div>
                    )}
                    <div>
                      <p className="text-xs text-gray-600">Selected Category</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedCategory.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory(null)
                      setStep(1)
                    }}
                    className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                    title="Remove category"
                  >
                    × Remove
                  </button>
                </div>
              )}
              
              {!showNewBrand ? (
                <>
                  {brands.length > 0 && (
                    <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {brands.length} brand{brands.length !== 1 ? 's' : ''} available
                      </p>
                      <button
                        onClick={handleDeleteAllBrands}
                        disabled={deletingAllBrands}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {deletingAllBrands ? 'Deleting...' : 'Delete All Brands'}
                      </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4">
                    {brands.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        <p className="text-sm">No brands available. Create a new brand to continue.</p>
                      </div>
                    ) : (
                      brands.map((brand) => {
                        const defaultBrand = getDefaultBrand(brand.name)
                        return (
                          <button
                            key={brand.id}
                            onClick={() => {
                              setSelectedBrand(brand)
                              setStep(3)
                            }}
                            className={`p-2 sm:p-3 border-2 rounded-lg text-center transition-all ${
                              selectedBrand?.id === brand.id
                                ? 'border-[#F56A34] bg-orange-50'
                                : 'border-gray-200 hover:border-[#F56A34]'
                            }`}
                          >
                            {defaultBrand?.logo ? (
                              <img src={defaultBrand.logo} alt={brand.name} className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5 object-contain" />
                            ) : brand.icon ? (
                              <img src={brand.icon} alt={brand.name} className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5 object-contain" />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-400 text-xs">{brand.name[0]}</span>
                              </div>
                            )}
                            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{brand.name}</h3>
                            <p className="text-[10px] sm:text-xs text-gray-500">{brand._count?.items || 0} items</p>
                          </button>
                        )
                      })
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowNewBrand(true)}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    + Add Brand
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {DEFAULT_BRANDS.map((brand) => (
                      <button
                        key={brand.name}
                        onClick={() => {
                          setNewBrandName(brand.name)
                          setNewBrandIcon(brand.logo)
                          setNewBrandIconType('url')
                        }}
                        className={`p-3 border-2 rounded-lg text-center ${
                          newBrandName === brand.name
                            ? 'border-[#F56A34] bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={brand.logo} alt={brand.name} className="w-12 h-12 mx-auto mb-2" />
                        <span className="text-sm font-medium">{brand.displayName}</span>
                      </button>
                    ))}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Brand name"
                    value={newBrandName || ''}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Brand Logo</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewBrandIconType('url')}
                        className={`px-3 py-1 text-sm rounded ${newBrandIconType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      >
                        Image URL
                      </button>
                      <button
                        onClick={() => setNewBrandIconType('image')}
                        className={`px-3 py-1 text-sm rounded ${newBrandIconType === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      >
                        Upload Image
                      </button>
                    </div>
                    {newBrandIconType === 'url' ? (
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={newBrandIcon || ''}
                        onChange={(e) => setNewBrandIcon(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                              setNewBrandIcon(reader.result as string)
                            }
                            reader.readAsDataURL(file)
                          }
                          // Reset file input to allow selecting same file again
                          e.target.value = ''
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    )}
                    {newBrandIcon && (
                      <img src={newBrandIcon} alt="Brand logo" className="w-24 h-24 object-contain" />
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleCreateBrand}
                      disabled={loading || !newBrandName.trim()}
                      className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Create Brand
                    </button>
                    <button
                      onClick={() => {
                        setShowNewBrand(false)
                        setNewBrandName('')
                        setNewBrandIcon('')
                      }}
                      className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Product Details & Specifications (Combined) */}
          {step === 3 && selectedCategory && selectedBrand && (
            <div>
              <button
                onClick={() => setStep(2)}
                className="mb-3 text-xs sm:text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
                Product & Specifications
              </h2>
              
              {/* Show selected category and brand */}
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedCategory && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedCategory.icon ? (
                        <img src={selectedCategory.icon} alt={selectedCategory.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8">{renderIcon(selectedCategory.name.toLowerCase())}</div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Selected Category</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedCategory.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCategory(null)
                        setStep(1)
                      }}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                      title="Remove category"
                    >
                      × Remove
                    </button>
                  </div>
                )}
                {selectedBrand && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const defaultBrand = getDefaultBrand(selectedBrand.name)
                        return defaultBrand?.logo ? (
                          <img src={defaultBrand.logo} alt={selectedBrand.name} className="w-8 h-8 object-contain" />
                        ) : selectedBrand.icon ? (
                          <img src={selectedBrand.icon} alt={selectedBrand.name} className="w-8 h-8 object-contain" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-xs">{selectedBrand.name[0]}</span>
                          </div>
                        )
                      })()}
                      <div>
                        <p className="text-xs text-gray-600">Selected Brand</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedBrand.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBrand(null)
                        setStep(2)
                      }}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                      title="Remove brand"
                    >
                      × Remove
                    </button>
                  </div>
                )}
              </div>
              
              {/* Document Upload Modal */}
              {showDocumentUpload && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">AI Product Analysis</h3>
                    
                    {analysisStep === 0 && (
                      <div>
                        {/* Input Mode Toggle */}
                        <div className="flex gap-2 mb-4 border-b">
                          <button
                            onClick={() => setInputMode('file')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              inputMode === 'file'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Upload File
                          </button>
                          <button
                            onClick={() => setInputMode('text')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              inputMode === 'text'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Paste Text
                          </button>
                        </div>
                        
                        {inputMode === 'file' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Upload Document (PDF, Text, Image, Word)
                            </label>
                            <input
                              type="file"
                              accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleDocumentUpload(file)
                                }
                              }}
                              className="w-full mb-4 p-2 border border-gray-300 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mb-4">
                              Supported formats: PDF, TXT, DOC, DOCX, JPG, JPEG, PNG
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Paste or Type Product Information
                            </label>
                            <textarea
                              value={textInput}
                              onChange={(e) => setTextInput(e.target.value)}
                              placeholder="Paste product specifications, description, or any relevant information here...

Example:
Product: iPhone 15 Pro
RAM: 8GB
Storage: 256GB, 512GB, 1TB
Processor: A17 Pro
Screen Size: 6.1 inches
Battery: 3274 mAh
Color: Natural Titanium, Blue Titanium, White Titanium, Black Titanium"
                              className="w-full h-64 p-3 border border-gray-300 rounded-lg text-sm font-mono resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-2 mb-4">
                              Enter product details, specifications, or any relevant information. The AI will extract specifications automatically.
                            </p>
                            <button
                              onClick={handleTextAnalysis}
                              disabled={!textInput.trim()}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Analyze Text
                            </button>
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => {
                              setShowDocumentUpload(false)
                              setTextInput('')
                              setInputMode('file')
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {analysisStep === 1 && (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Analyzing document...</p>
                        <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                      </div>
                    )}
                    
                    {analysisStep === 2 && analysisResult && (
                      <div>
                        <h4 className="font-semibold mb-3">Analysis Results</h4>
                        {analysisResult.productName && (
                          <div className="mb-3">
                            <label className="text-sm font-medium">Product Name:</label>
                            <p className="text-sm text-gray-600">{analysisResult.productName}</p>
                          </div>
                        )}
                        <div className="mb-4">
                          <label className="text-sm font-medium">Found Specifications:</label>
                          <ul className="mt-2 space-y-1">
                            {analysisResult.specifications.map((spec: any, idx: number) => (
                              <li key={idx} className="text-sm text-gray-600">
                                • {spec.name} ({spec.valueType})
                                {spec.options && spec.options.length > 0 && (
                                  <span className="text-gray-500"> - {spec.options.length} options</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleApplyAnalysis}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            Auto-Fill All Fields
                          </button>
                          <button
                            onClick={() => {
                              // Initialize permissions for manual selection
                              const newPermissions: Record<string, boolean> = {}
                              analysisResult.specifications.forEach((spec: any) => {
                                newPermissions[spec.name] = false // Require permission for each
                              })
                              setPermissions(newPermissions)
                              setAnalysisStep(3) // Go to permission step
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Review & Select
                          </button>
                          <button
                            onClick={() => {
                              setShowDocumentUpload(false)
                              setAnalysisResult(null)
                              setAnalysisStep(0)
                              setTextInput('')
                              setInputMode('file')
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          <strong>Auto-Fill All:</strong> Automatically creates missing specifications and fills all fields.<br/>
                          <strong>Review & Select:</strong> Review and manually approve each specification.
                        </p>
                      </div>
                    )}
                    
                    {analysisStep === 3 && analysisResult && (
                      <div>
                        <h4 className="font-semibold mb-3">Approve Specifications</h4>
                        <p className="text-sm text-gray-600 mb-4">Select which specifications to add:</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                          {analysisResult.specifications.map((spec: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{spec.name}</p>
                                <p className="text-xs text-gray-500">{spec.valueType}</p>
                                {spec.options && spec.options.length > 0 && (
                                  <p className="text-xs text-gray-400">
                                    Options: {spec.options.slice(0, 3).join(', ')}
                                    {spec.options.length > 3 && ` +${spec.options.length - 3} more`}
                                  </p>
                                )}
                              </div>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={permissions[spec.name] === true}
                                  onChange={(e) => handlePermissionToggle(spec.name, e.target.checked)}
                                  className="w-4 h-4 text-blue-600"
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleApplyApprovedSpecs}
                            disabled={Object.values(permissions).every(p => !p)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Apply Selected ({Object.values(permissions).filter(p => p).length})
                          </button>
                          <button
                            onClick={() => {
                              setShowDocumentUpload(false)
                              setAnalysisResult(null)
                              setAnalysisStep(0)
                              setPermissions({})
                              setTextInput('')
                              setInputMode('file')
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setShowDocumentUpload(false)
                            setAnalysisResult(null)
                            setAnalysisStep(0)
                            setPermissions({})
                            setTextInput('')
                            setInputMode('file')
                            // Fall back to manual entry
                          }}
                          className="w-full mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Use Manual Entry Instead
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Create Specification Modal */}
              {showCreateSpecModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">Create New Specification</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={selectedCategory?.name || ''}
                          disabled
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                      
                      {selectedBrand && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={selectedBrand.name}
                            disabled
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                          />
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Specification Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newSpec.name}
                          onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })}
                          placeholder="e.g., RAM, Storage, Processor"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Value Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newSpec.valueType}
                          onChange={(e) => setNewSpec({ ...newSpec, valueType: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                        >
                          <option value="select">Select (Dropdown)</option>
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                        </select>
                      </div>
                      
                      {newSpec.valueType === 'select' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Options
                          </label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={newSpecOption}
                              onChange={(e) => setNewSpecOption(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  if (newSpecOption.trim() && !newSpec.options.includes(newSpecOption.trim())) {
                                    setNewSpec({ ...newSpec, options: [...newSpec.options, newSpecOption.trim()] })
                                    setNewSpecOption('')
                                  }
                                }
                              }}
                              placeholder="Add option and press Enter"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                            />
                            <button
                              onClick={() => {
                                if (newSpecOption.trim() && !newSpec.options.includes(newSpecOption.trim())) {
                                  setNewSpec({ ...newSpec, options: [...newSpec.options, newSpecOption.trim()] })
                                  setNewSpecOption('')
                                }
                              }}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Add
                            </button>
                          </div>
                          
                          {newSpec.options.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {newSpec.options.map((option, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                >
                                  {option}
                                  <button
                                    onClick={() => {
                                      setNewSpec({ ...newSpec, options: newSpec.options.filter((_, i) => i !== idx) })
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={handleCreateSpecification}
                        disabled={!newSpec.name.trim() || !selectedCategory || loading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating...
                          </>
                        ) : (
                          'Create Specification'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateSpecModal(false)
                          setNewSpec({ name: '', valueType: 'select', options: [] })
                          setNewSpecOption('')
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Document Upload Option */}
              {!useAIAnalysis && !analysisResult && (
                <div className="mb-6 p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">AI-Powered Product Analysis</h3>
                    <p className="text-xs text-gray-600 mb-4">Upload a document or paste text to automatically extract product specifications</p>
                    <button
                      onClick={() => setShowDocumentUpload(true)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Analyze with AI
                    </button>
                    <p className="text-xs text-gray-500 mt-3">Or continue with manual entry below</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter product name"
                    value={productName || ''}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                
                {/* Specifications Selection & Values Combined */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Specifications
                    </label>
                    {/* Search Bar - 200px, right top */}
                    <div className="relative search-container" style={{ width: '200px' }}>
                      <input
                        type="text"
                        placeholder="Search specifications..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => {
                          if (searchQuery.trim()) {
                            setShowSearchResults(true)
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#F56A34] focus:border-transparent"
                      />
                      <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      
                      {/* Search Results Dropdown */}
                      {showSearchResults && (searchResults.length > 0 || searchQuery.trim()) && (
                        <div className="absolute top-full right-0 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                          {searchResults.length > 0 ? (
                            <>
                              {searchResults.map((spec) => {
                                const isSelected = selectedSpecs.some(s => s.name === spec.name)
                                return (
                                  <button
                                    key={spec.id}
                                    onClick={() => {
                                      if (!isSelected) {
                                        handleSpecToggle(spec)
                                      }
                                      setShowSearchResults(false)
                                      setSearchQuery('')
                                    }}
                                    disabled={isSelected}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors ${
                                      isSelected ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    <div className="font-medium">{spec.name}</div>
                                    <div className="text-gray-500 text-xs">{spec.valueType}</div>
                                    {isSelected && <span className="text-green-600 text-xs">✓ Selected</span>}
                                  </button>
                                )
                              })}
                              {!searchResults.some(s => s.name.toLowerCase() === searchQuery.toLowerCase().trim()) && (
                                <div className="border-t border-gray-200">
                                  <button
                                    onClick={() => {
                                      setNewSpec({ name: searchQuery.trim(), valueType: 'select', options: [] })
                                      setShowCreateSpecModal(true)
                                      setShowSearchResults(false)
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    + Create "{searchQuery.trim()}"
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="px-3 py-2 text-xs text-gray-500">
                              <button
                                onClick={() => {
                                  setNewSpec({ name: searchQuery.trim(), valueType: 'select', options: [] })
                                  setShowCreateSpecModal(true)
                                  setShowSearchResults(false)
                                }}
                                className="w-full text-left text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                              >
                                + Create "{searchQuery.trim()}"
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Show Previous Saved Configurations */}
                  {(availableSpecs.length > 0 || brandSpecs.length > 0) && (
                    <div className="mb-3 p-2 bg-blue-50 rounded text-xs">
                      <div className="font-medium text-blue-900 mb-1">Saved Configurations:</div>
                      <div className="text-blue-700">
                        {selectedCategory && (
                          <span>Category: {selectedCategory.name} ({availableSpecs.length} specs)</span>
                        )}
                        {selectedBrand && brandSpecs.length > 0 && (
                          <span className="ml-2">Brand: {selectedBrand.name} ({brandSpecs.length} specs)</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Spec Selection - Compact Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                    {availableSpecs.map((spec) => {
                      const isSelected = selectedSpecs.some(s => s.name === spec.name)
                      const isRequired = (spec as any).isRequired
                      return (
                        <label
                          key={spec.id}
                          className={`p-2 border rounded cursor-pointer transition-all text-xs ${
                            isSelected
                              ? 'border-[#F56A34] bg-orange-50'
                              : isRequired
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSpecToggle(spec)}
                              disabled={isRequired}
                              className="w-3 h-3 text-[#F56A34] border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="font-medium text-gray-900 text-xs">
                              {spec.name}
                              {isRequired && <span className="text-red-500 ml-1">*</span>}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  
                  {/* Spec Values - Compact Display - Ordered by selection */}
                  {selectedSpecs.length > 0 && (
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          <span>Drag or use arrows to reorder specifications</span>
                        </div>
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
                      </div>
                      {selectedSpecs.sort((a, b) => a.order - b.order).map((spec, index) => {
                        const values = specValues[spec.name] || []
                        const inputValue = specInputs[spec.name] ?? ''
                        const options = spec.options || []
                        const sortedSpecs = [...selectedSpecs].sort((a, b) => a.order - b.order)
                        const canMoveUp = index > 0
                        const canMoveDown = index < sortedSpecs.length - 1
                        
                        return (
                          <div key={spec.name} className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-medium text-gray-700 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F56A34] text-white text-xs font-semibold">
                                  {spec.order}
                                </span>
                                <span>{spec.name} <span className="text-red-500">*</span></span>
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleMoveSpecUp(spec.name)}
                                  disabled={!canMoveUp}
                                  className="p-1.5 text-gray-600 hover:text-[#F56A34] hover:bg-orange-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move up"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleMoveSpecDown(spec.name)}
                                  disabled={!canMoveDown}
                                  className="p-1.5 text-gray-600 hover:text-[#F56A34] hover:bg-orange-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move down"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    const specToRemove = availableSpecs.find(s => s.name === spec.name)
                                    handleRemoveSpec(spec.name, specToRemove?.id)
                                  }}
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Remove and delete from configuration"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {/* Selected Values - Compact */}
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
                            
                            {/* Available Options - Compact */}
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
                            
                            {/* Input Field - Compact */}
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
              
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={handleSaveSpecifications}
                  disabled={selectedSpecs.length === 0 || !selectedCategory}
                  className="px-4 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save to Configuration
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!productName.trim() || selectedSpecs.length === 0 || selectedSpecs.some(spec => {
                    const isRequired = availableSpecs.find(s => s.name === spec.name) as any
                    return isRequired?.isRequired && (specValues[spec.name] || []).length === 0
                  })}
                  className="px-4 py-2 text-xs sm:text-sm bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div>
              <button
                onClick={() => setStep(3)}
                className="mb-3 text-xs sm:text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Review & Submit</h2>
              
              <div className="space-y-4">
                {/* Product Name */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                  <h3 className="text-xs text-gray-600 mb-1">Product Name</h3>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{productName}</p>
                </div>
                
                {/* Category - Template Style */}
                {selectedCategory && (
                  <div>
                    <h3 className="text-xs text-gray-600 mb-2">Selected Category</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="p-3 border-2 border-[#F56A34] bg-orange-50 rounded-lg text-center">
                        {selectedCategory.icon ? (
                          <img src={selectedCategory.icon} alt={selectedCategory.name} className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5 object-contain" />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5">{renderIcon(selectedCategory.name.toLowerCase())}</div>
                        )}
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{selectedCategory.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500">{selectedCategory._count?.items || 0} items</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Brand - Template Style */}
                {selectedBrand && (
                  <div>
                    <h3 className="text-xs text-gray-600 mb-2">Selected Brand</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="p-3 border-2 border-[#F56A34] bg-orange-50 rounded-lg text-center">
                        {(() => {
                          const defaultBrand = getDefaultBrand(selectedBrand.name)
                          return defaultBrand?.logo ? (
                            <img src={defaultBrand.logo} alt={selectedBrand.name} className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5 object-contain" />
                          ) : selectedBrand.icon ? (
                            <img src={selectedBrand.icon} alt={selectedBrand.name} className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5 object-contain" />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-1.5 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">{selectedBrand.name[0]}</span>
                            </div>
                          )
                        })()}
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{selectedBrand.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500">{selectedBrand._count?.items || 0} items</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Specifications - Template Style */}
                <div>
                  <h3 className="text-xs text-gray-600 mb-2">Selected Specifications ({selectedSpecs.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {selectedSpecs.sort((a, b) => a.order - b.order).map((spec) => (
                      <div
                        key={spec.name}
                        className="p-3 border-2 border-[#F56A34] bg-orange-50 rounded-lg text-center"
                      >
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F56A34] text-white text-xs font-semibold mb-1">
                          {spec.order}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1">{spec.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {(specValues[spec.name] || []).length} value{(specValues[spec.name] || []).length !== 1 ? 's' : ''}
                        </p>
                        {(specValues[spec.name] || []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 justify-center">
                            {(specValues[spec.name] || []).slice(0, 2).map((value) => (
                              <span
                                key={value}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium"
                              >
                                {value}
                              </span>
                            ))}
                            {(specValues[spec.name] || []).length > 2 && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                                +{(specValues[spec.name] || []).length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2.5 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Add Product'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Replace/Overwrite Confirmation Modal */}
        {replaceModal.isOpen && replaceModal.existingItem && replaceModal.newProductData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Product Already Exists
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  A product with the name <strong>"{replaceModal.existingItem.name}"</strong> already exists.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <p className="text-xs text-gray-500 mb-1">Existing Product:</p>
                  <p className="text-sm font-medium">{replaceModal.existingItem.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Category: {replaceModal.existingItem.category?.name}</p>
                  {replaceModal.existingItem.icon && (
                    <img src={replaceModal.existingItem.icon} alt={replaceModal.existingItem.name} className="mt-2 w-12 h-12 object-contain" />
                  )}
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">New Product Data:</p>
                  <p className="text-sm font-medium">{replaceModal.newProductData.name}</p>
                  {replaceModal.newProductData.icon && (
                    <img src={replaceModal.newProductData.icon} alt={replaceModal.newProductData.name} className="mt-2 w-12 h-12 object-contain" />
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Would you like to <strong>overwrite</strong> the existing product with the new data?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleReplaceProduct(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReplaceProduct(true)}
                  className="px-4 py-2 text-sm bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Overwriting...' : 'Overwrite'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

