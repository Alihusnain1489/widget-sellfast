'use client'

import { useLayoutEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { useListingStore } from '@/store/listingStore'
import ListingHeader from '@/components/listing/ListingHeader'
import ListingProgressBar from '@/components/listing/ListingProgressBar'
import SelectedOptionsBar from '@/components/listing/SelectedOptionsBar'
import ListingStepContent from '@/components/listing/ListingStepContent'
import ListingFooterActions from '@/components/listing/ListingFooterActions'
import { useListingFilter } from '@/hooks/useListingFilter'
import Link from 'next/link'

export default function WidgetContent() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  
  const { progress, setProgress, setStep, resetProgress, clearStep } = useListingStore()
  
  const [step, setStepState] = useState(categoryParam ? 1 : progress.currentStep || 0)
  const [categoryName, setCategoryName] = useState<string | null>(categoryParam || progress.category || null)
  const [categories, setCategories] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [specifications, setSpecifications] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [specsLoading, setSpecsLoading] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [currentSpecIndex, setCurrentSpecIndex] = useState(0)

  // Form data from store
  const formData = useMemo(() => ({
    category: progress.categoryId || null,
    categoryName: progress.category || categoryName,
    company: progress.brandId || null,
    companyName: progress.brand || null,
    item: progress.modelId || null,
    itemName: progress.model || null,
    specs: progress.specs || {},
    location: progress.location || '',
    latitude: progress.latitude || null,
    longitude: progress.longitude || null,
    images: progress.images || [],
  }), [progress, categoryName])

  // Dynamic steps based on specifications count
  const STEPS = useMemo(() => {
    const baseSteps = [
      { number: 1, label: 'Select Brand', field: 'brand' },
      { number: 2, label: 'Search Device', field: 'device' },
    ]
    
    const specSteps = specifications.map((spec, index) => ({
      number: 3 + index,
      label: spec.name,
      field: `spec_${spec.id}`,
      specId: spec.id
    }))
    
    const finalSteps = [
      { number: 3 + specifications.length, label: 'Photos & Location', field: 'photos' },
      { number: 4 + specifications.length, label: 'Review & Submit', field: 'review' },
    ]
    
    return [...baseSteps, ...specSteps, ...finalSteps]
  }, [specifications])

  // Check user authentication
  useLayoutEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          if (showLoginModal && userData) {
            setShowLoginModal(false)
          }
        } catch (e) {
          console.error('Error parsing user data:', e)
        }
      } else {
        setUser(null)
      }
    }
    
    checkUser()
    const interval = setInterval(checkUser, 1000)
    return () => clearInterval(interval)
  }, [showLoginModal])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true)
      setError('')
      const res = await axios.get('/api/categories')
      const categoriesList = Array.isArray(res.data.categories) ? res.data.categories : []
      setCategories(categoriesList)
      if (categoriesList.length === 0) {
        setError('No categories available. Please add categories in the admin panel.')
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      setError(error.message || 'Error loading categories. Please try again.')
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  // Fetch companies by category
  const fetchCompaniesByCategory = useCallback(async (category: string) => {
    try {
      setCompaniesLoading(true)
      setError('')
      const res = await axios.get(`/api/companies?category=${encodeURIComponent(category)}`)
      const companiesList = Array.isArray(res.data) ? res.data : []
      setCompanies(companiesList)
      if (companiesList.length === 0) {
        setError(`No companies available for ${category}.`)
      }
    } catch (error: any) {
      console.error('Error fetching companies:', error)
      setError(error.message || 'Error loading companies. Please try again.')
      setCompanies([])
    } finally {
      setCompaniesLoading(false)
    }
  }, [])

  // Fetch items
  const fetchItems = useCallback(async (companyId: string, categoryName?: string | null) => {
    try {
      setItemsLoading(true)
      setError('')
      let url = `/api/items?companyId=${encodeURIComponent(companyId)}`
      if (categoryName) {
        url += `&category=${encodeURIComponent(categoryName)}`
      }
      const res = await axios.get(url)
      const itemsList = Array.isArray(res.data) ? res.data : []
      setItems(itemsList)
      if (itemsList.length === 0) {
        setError(`No items available for this brand${categoryName ? ` in ${categoryName}` : ''}.`)
      }
    } catch (error: any) {
      console.error('Error fetching items:', error)
      setError(error.message || 'Error loading items')
      setItems([])
    } finally {
      setItemsLoading(false)
    }
  }, [])

  // Fetch specifications
  const fetchSpecifications = useCallback(async (itemId: string) => {
    if (!itemId) return

    try {
      setSpecsLoading(true)
      setError('')
      const res = await axios.get(`/api/items?itemId=${itemId}`)
      const item = res.data
      
      if (item && item.specifications) {
        const specs = item.specifications || []
        const sortedSpecs = specs.sort((a: any, b: any) => {
          if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
            return a.order - b.order
          }
          if (a.order !== null && a.order !== undefined) return -1
          if (b.order !== null && b.order !== undefined) return 1
          return 0
        })
        setSpecifications(sortedSpecs)
        
        if (sortedSpecs.length > 0) {
          setTimeout(() => {
            setStepState(3)
            setCurrentSpecIndex(0)
          }, 100)
        } else {
          const photosStep = 3 + sortedSpecs.length
          setTimeout(() => {
            setStepState(photosStep)
          }, 100)
        }
      } else {
        setSpecifications([])
        setTimeout(() => {
          setStepState(3)
        }, 100)
      }
    } catch (error: any) {
      console.error('Error fetching specifications:', error)
      setError(error.message || 'Error loading specifications. Please try again.')
      setSpecifications([])
      setTimeout(() => {
        setStepState(3)
      }, 100)
    } finally {
      setSpecsLoading(false)
    }
  }, [])

  // Initialize on mount
  useLayoutEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useLayoutEffect(() => {
    if (categoryName) {
      fetchCompaniesByCategory(categoryName)
    }
  }, [categoryName, fetchCompaniesByCategory])

  useLayoutEffect(() => {
    if (formData.company) {
      fetchItems(formData.company, categoryName)
    }
  }, [formData.company, categoryName, fetchItems])

  useLayoutEffect(() => {
    if (formData.item && !specsLoading) {
      const shouldFetch = specifications.length === 0
      if (shouldFetch) {
        fetchSpecifications(formData.item)
      }
    }
  }, [formData.item, fetchSpecifications, specsLoading, specifications.length])

  // Initialize Google Maps for location
  useLayoutEffect(() => {
    if (step === 3 + specifications.length && typeof window !== 'undefined') {
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
      if (googleApiKey && !(window as any).googleMapsLoaded) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places&callback=initGoogleMaps`
        script.async = true
        script.defer = true
        ;(window as any).initGoogleMaps = () => {
          initGoogleMapsAutocomplete()
          ;(window as any).googleMapsLoaded = true
        }
        document.head.appendChild(script)
      } else if ((window as any).googleMapsLoaded) {
        initGoogleMapsAutocomplete()
      }
    }
  }, [step, formData.location, specifications.length])

  const initGoogleMapsAutocomplete = () => {
    if (typeof window === 'undefined' || !(window as any).google) {
      setTimeout(() => {
        if ((window as any).google) {
          initGoogleMapsAutocomplete()
        }
      }, 500)
      return
    }

    const input = document.getElementById('location-input') as HTMLInputElement
    const mapElement = document.getElementById('map')
    if (!input || !mapElement) return

    const autocomplete = new (window as any).google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: [] }
    })

    const map = new (window as any).google.maps.Map(mapElement, {
      center: formData.latitude && formData.longitude 
        ? { lat: formData.latitude, lng: formData.longitude }
        : { lat: 0, lng: 0 },
      zoom: formData.latitude && formData.longitude ? 15 : 2
    })

    const marker = new (window as any).google.maps.Marker({ map })

    if (formData.latitude && formData.longitude) {
      map.setCenter({ lat: formData.latitude, lng: formData.longitude })
      map.setZoom(15)
      marker.setPosition({ lat: formData.latitude, lng: formData.longitude })
    }

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry) return

      const location = place.formatted_address || place.name
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      setProgress({
        location,
        latitude: lat,
        longitude: lng,
      })
    })
  }

  // Handlers
  const handleCategorySelect = async (id: string, name: string) => {
    setProgress({ category: name, categoryId: id })
    setCategoryName(name)
    await fetchCompaniesByCategory(name)
    setStepState(1)
    setStep(1)
  }

  const handleCompanySelect = async (companyId: string, companyName: string) => {
    setProgress({ 
      brand: companyName, 
      brandId: companyId,
      model: undefined,
      modelId: undefined,
      specs: {},
    })
    setItems([])
    setSpecifications([])
    setCompanySearch('')
    setItemSearch('')
    
    await fetchItems(companyId, categoryName)
    setTimeout(() => {
      setStepState(2)
      setStep(2)
      setError('')
    }, 300)
  }

  const handleItemSelect = async (itemId: string, itemName: string) => {
    if (!itemId) {
      setError('Please select a valid item')
      return
    }

    setProgress({ 
      model: itemName, 
      modelId: itemId, 
      specs: {} 
    })
    setItemSearch('')
    setCurrentSpecIndex(0)
    setSpecifications([])
    
    await fetchSpecifications(itemId)
  }

  const handleSpecChange = (specId: string, value: string) => {
    const newSpecs = {
      ...formData.specs,
      [specId]: value,
    }
    setProgress({ specs: newSpecs })
    
    const allSpecsFilled = specifications.every((spec: any) => {
      return newSpecs[spec.id] && newSpecs[spec.id].trim() !== ''
    })
    
    if (allSpecsFilled && specifications.length > 0) {
      const photosStep = 3 + specifications.length
      setTimeout(() => {
        setStepState(photosStep)
        setStep(photosStep)
      }, 300)
      return
    }
    
    const currentSpecIndex = specifications.findIndex(s => s.id === specId)
    if (currentSpecIndex >= 0 && value && currentSpecIndex < specifications.length - 1) {
      const currentStep = step
      if (currentStep === 3 + currentSpecIndex) {
        setTimeout(() => {
          setStepState(3 + currentSpecIndex + 1)
          setStep(3 + currentSpecIndex + 1)
          setCurrentSpecIndex(currentSpecIndex + 1)
        }, 300)
      }
    }
  }

  const fetchMyLocation = async () => {
    setLocationLoading(true)
    setError('')

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser')
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 600000,
          }
        )
      })

      const { latitude, longitude } = position.coords
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

      if (!apiKey) {
        throw new Error('Google API key not configured')
      }

      const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(apiUrl, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${data.status}`)
      }

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const fullAddress = result.formatted_address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

        setProgress({
          latitude,
          longitude,
          location: fullAddress,
        })
      } else {
        throw new Error('No address data returned from Google.')
      }
    } catch (error: any) {
      console.error('Location error:', error)
      setError(error.message || 'Unable to retrieve your location. Please enter it manually.')
    } finally {
      setLocationLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const maxSize = 1 * 1024 * 1024
    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    fileArray.forEach((file) => {
      if (file.size > maxSize) {
        errors.push(`${file.name} exceeds 1MB limit.`)
        return
      }
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image file.`)
        return
      }
      validFiles.push(file)
    })

    if (errors.length > 0) {
      setError(errors.join('; '))
    }

    if (validFiles.length === 0) return

    const totalImages = formData.images.length + validFiles.length
    if (totalImages > 10) {
      setError(`You can only upload up to 10 images. You already have ${formData.images.length} image(s).`)
      return
    }

    const promises = validFiles.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })

    Promise.all(promises)
      .then((base64Images) => {
        setProgress({
          images: [...formData.images, ...base64Images].slice(0, 10)
        })
        setError('')
        e.target.value = ''
      })
      .catch((error) => {
        console.error('Error reading files:', error)
        setError('Error reading image files')
      })
  }

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_: any, i: number) => i !== index)
    setProgress({ images: newImages })
  }

  const handleNext = () => {
    setError('')
    
    if (step === 0) {
      if (!formData.category && !categoryName) {
        setError('Please select a category')
        return
      }
    } else if (step === 1) {
      if (!formData.company) {
        setError('Please select a brand/company')
        return
      }
    } else if (step === 2) {
      if (!formData.item) {
        setError('Please select a device/model')
        return
      }
    } else if (step >= 3 && step < 3 + specifications.length) {
      const specIndex = step - 3
      const currentSpec = specifications[specIndex]
      if (currentSpec && !formData.specs[currentSpec.id]) {
        setError(`Please select ${currentSpec.name}`)
        return
      }
    } else if (step === 3 + specifications.length) {
      if (!formData.location) {
        setError('Please enter or fetch your location')
        return
      }
    } else if (step === 4 + specifications.length) {
      if (!user) {
        setShowLoginModal(true)
        return
      }
      handleSubmit()
      return
    }
    
    const nextStep = step + 1
    setStepState(nextStep)
    setStep(nextStep)
  }

  const handlePrevious = () => {
    if (step > 0) {
      const prevStep = step - 1
      setStepState(prevStep)
      setStep(prevStep)
      setError('')
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      setShowLoginModal(true)
      return
    }

    const missingFields: string[] = []
    
    if (!formData.category || !formData.categoryName) {
      missingFields.push('Category')
    }
    if (!formData.company || !formData.companyName) {
      missingFields.push('Brand')
    }
    if (!formData.item || !formData.itemName) {
      missingFields.push('Device/Model')
    }
    if (!formData.location || formData.location.trim() === '') {
      missingFields.push('Location')
    }
    if (!formData.images || formData.images.length === 0) {
      missingFields.push('Photos')
    }
    
    const requiredSpecs = specifications.filter(spec => spec.isRequired === true)
    for (const spec of requiredSpecs) {
      const specValue = formData.specs[spec.id]
      if (!specValue || specValue.toString().trim() === '') {
        missingFields.push(spec.name)
      }
    }
    
    if (missingFields.length > 0) {
      const missingFieldsList = missingFields.map(field => `• ${field}`).join('\n')
      alert(`Please fill in the following required fields:\n\n${missingFieldsList}`)
      setError(`Missing required fields: ${missingFields.join(', ')}`)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const specs = Object.entries(formData.specs)
        .filter(([_, value]) => value && value.toString().trim() !== '')
        .map(([specId, value]) => ({
          specificationId: specId,
          value: value as string,
        }))

      const token = localStorage.getItem('token')
      const res = await axios.post('/api/listings/create', {
        itemId: formData.item,
        companyId: formData.company,
        title: `${formData.companyName} ${formData.itemName}`,
        description: `Listing for ${formData.companyName} ${formData.itemName}`,
        price: 0,
        address: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        specifications: specs,
        images: formData.images || [],
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        withCredentials: true,
      })

      resetProgress()
      setSubmitted(true)
      setLoading(false)

      setTimeout(() => {
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'LISTING_SUBMITTED', listing: res.data.listing }, '*')
        }
      }, 2000)
    } catch (error: any) {
      if (error.response?.status === 401) {
        setShowLoginModal(true)
        setLoading(false)
        return
      }
      setError(error.response?.data?.error || 'Error creating listing')
      setLoading(false)
    }
  }

  const filteredItems = useListingFilter(items, {
    categoryId: formData.category,
    categoryName: formData.categoryName || categoryName,
    companyId: formData.company,
    itemId: formData.item,
    specifications: formData.specs
  })

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div className="mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Listing Created Successfully!</h1>
              <p className="text-sm sm:text-base text-gray-600">Your listing has been submitted and is pending approval.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 flex flex-col" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col flex-1 overflow-hidden">
        <ListingHeader onCancel={() => {
          resetProgress()
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'WIDGET_CLOSED' }, '*')
          }
        }} />
        
        {step > 0 && (
          <ListingProgressBar 
            steps={STEPS}
            currentStep={step}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-4 text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {step > 0 && (
          <SelectedOptionsBar
            categoryName={categoryName || formData.categoryName}
            companyName={formData.companyName}
            itemName={formData.itemName}
            specs={formData.specs}
            location={formData.location}
            imagesCount={formData.images?.length || 0}
            specifications={specifications}
            onRemoveCategory={() => {
              clearStep(0)
              setCategoryName(null)
              setStepState(0)
              setStep(0)
            }}
            onRemoveCompany={() => {
              clearStep(1)
              setItems([])
              setSpecifications([])
              setStepState(1)
              setStep(1)
            }}
            onRemoveItem={() => {
              clearStep(2)
              setSpecifications([])
              setStepState(2)
              setStep(2)
            }}
            onRemoveSpec={(specId) => {
              const newSpecs = { ...formData.specs }
              delete newSpecs[specId]
              setProgress({ specs: newSpecs })
              const specIndex = specifications.findIndex(s => s.id === specId)
              if (specIndex >= 0) {
                setStepState(3 + specIndex)
                setStep(3 + specIndex)
                setCurrentSpecIndex(specIndex)
              }
            }}
            onClearAllSpecs={resetProgress}
            onRemoveLocation={() => {
              setProgress({ location: '', latitude: undefined, longitude: undefined })
              setStepState(3 + specifications.length)
              setStep(3 + specifications.length)
            }}
            onRemovePhotos={() => {
              setProgress({ images: [] })
              setStepState(3 + specifications.length)
              setStep(3 + specifications.length)
            }}
            onClearAll={resetProgress}
            onNavigateToStep={(stepNum) => {
              setStepState(stepNum)
              setStep(stepNum)
            }}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          <ListingStepContent
            step={step}
            formData={formData}
            categoryName={categoryName}
            categories={categories}
            companies={companies}
            items={filteredItems.length > 0 ? filteredItems : items}
            currentSpecIndex={currentSpecIndex}
            onSpecComplete={() => {
              if (currentSpecIndex < specifications.length - 1) {
                setCurrentSpecIndex(currentSpecIndex + 1)
                setStepState(3 + currentSpecIndex + 1)
                setStep(3 + currentSpecIndex + 1)
              } else {
                setStepState(3 + specifications.length)
                setStep(3 + specifications.length)
              }
            }}
            specifications={specifications}
            categoriesLoading={categoriesLoading}
            companiesLoading={companiesLoading}
            itemsLoading={itemsLoading}
            specsLoading={specsLoading}
            companySearch={companySearch}
            itemSearch={itemSearch}
            locationLoading={locationLoading}
            onCategorySelect={handleCategorySelect}
            onCompanySearchChange={setCompanySearch}
            onItemSearchChange={setItemSearch}
            onCompanySelect={handleCompanySelect}
            onItemSelect={handleItemSelect}
            onSpecChange={handleSpecChange}
            onLocationChange={(value) => setProgress({ location: value })}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            onFetchLocation={fetchMyLocation}
          />
        </div>

        <ListingFooterActions
          currentStep={step}
          totalSteps={STEPS.length}
          loading={loading}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Account Required</h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              You need to sign in or create an account to submit your listing. Don't worry, your progress will be saved.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/signup?redirect=${encodeURIComponent('/widget')}`}
                className="w-full px-4 py-2.5 bg-[#F56A34] text-white rounded-lg hover:bg-[#ff7f50] transition-colors text-center text-sm sm:text-base font-semibold"
              >
                Create Account
              </Link>
              <Link
                href={`/login?redirect=${encodeURIComponent('/widget')}`}
                className="w-full px-4 py-2.5 border-2 border-[#F56A34] text-[#F56A34] rounded-lg hover:bg-orange-50 transition-colors text-center text-sm sm:text-base font-semibold"
              >
                Sign In
              </Link>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

