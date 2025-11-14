'use client'

import { useLayoutEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ListingHeader from '@/components/listing/ListingHeader'
import ListingProgressBar from '@/components/listing/ListingProgressBar'
import SelectedOptionsBar from '@/components/listing/SelectedOptionsBar'
import ListingStepContent from '@/components/listing/ListingStepContent'
import ListingFooterActions from '@/components/listing/ListingFooterActions'
import { useListingFilter } from '@/hooks/useListingFilter'

interface SavedProgress {
  step: number
  formData: any
  companyId: string | null
  companyName: string | null
  itemId: string | null
  itemName: string | null
  categoryName?: string | null
}

function CreateListingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')

  // If category is provided from homepage, start at step 1 (Brand selection), otherwise start at step 0 (Category)
  const [step, setStep] = useState(categoryParam ? 1 : 0)
  const [categoryName, setCategoryName] = useState<string | null>(categoryParam)
  const [categories, setCategories] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [specifications, setSpecifications] = useState<any[]>([])
  const [formData, setFormData] = useState<any>({
    category: null,
    categoryName: null,
    company: null,
    companyName: null,
    item: null,
    itemName: null,
    specs: {},
    location: '',
    latitude: null,
    longitude: null,
    images: [] as string[],
  })
  const [user, setUser] = useState<any>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
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
  
  // Dynamic steps based on specifications count
  const STEPS = useMemo(() => {
    const baseSteps = [
      { number: 1, label: 'Select Brand', field: 'brand' },
      { number: 2, label: 'Search Device', field: 'device' },
    ]
    
    // Add specification steps dynamically
    const specSteps = specifications.map((spec, index) => ({
      number: 3 + index,
      label: spec.name,
      field: `spec_${spec.id}`,
      specId: spec.id
    }))
    
    // Add final steps
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
          // If modal was showing and user is now logged in, close it
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
    // Check periodically for user changes (e.g., after login in another tab)
    const interval = setInterval(checkUser, 1000)
    return () => clearInterval(interval)
  }, [showLoginModal])

  // Set category from URL parameter
  useLayoutEffect(() => {
    if (categoryParam) {
      setCategoryName(categoryParam)
      // Find category ID from categories list
      if (categories.length > 0) {
        const category = categories.find(c => c.name === categoryParam)
        if (category) {
          setFormData((prev: any) => ({ ...prev, category: category.id, categoryName: categoryParam }))
        }
      }
    }
  }, [categoryParam, categories])

  // Load saved progress from localStorage
  useLayoutEffect(() => {
    const saved = localStorage.getItem('listing_progress')
    if (saved) {
      try {
        const savedData: SavedProgress = JSON.parse(saved)
        if (savedData.formData) {
          setFormData(savedData.formData)
          // If category is provided from URL, start at step 1, otherwise use saved step
          const initialStep = categoryParam ? 1 : (savedData.step || 1)
          setStep(initialStep)
          // Restore category if exists
          if (savedData.categoryName && !categoryParam) {
          setCategoryName(savedData.categoryName)
          }
          // Restore items if company was selected
          if (savedData.companyId) {
            fetchItems(savedData.companyId, savedData.categoryName || categoryParam)
          }
          // Restore specifications if item was selected
          if (savedData.itemId) {
            fetchSpecifications(savedData.itemId)
          }
        }
      } catch (e) {
        console.error('Error loading saved progress:', e)
      }
    }
  }, [categoryParam])

  // Fetch categories on mount
  useLayoutEffect(() => {
    fetchCategories()
  }, [])

  // Fetch companies when category is selected (from homepage or step 0)
  useLayoutEffect(() => {
    if (categoryName) {
      fetchCompaniesByCategory(categoryName)
    }
  }, [categoryName])

  // Fetch items when company is selected (filter by category if available)
  useLayoutEffect(() => {
    if (formData.company) {
      fetchItems(formData.company, categoryName)
    }
  }, [formData.company, categoryName])

  // Fetch specifications when item is selected (but not if already fetching)
  // Note: This is a backup - handleItemSelect should handle the fetch, but this ensures it happens
  useLayoutEffect(() => {
    if (formData.item && !specsLoading) {
      // Only fetch if we don't already have specs loaded
      // We'll fetch anyway since handleItemSelect clears specs, but this prevents duplicate calls
      const shouldFetch = specifications.length === 0
      if (shouldFetch) {
        console.log('🔄 useLayoutEffect: Fetching specs for item:', formData.item)
        fetchSpecifications(formData.item)
      }
    }
  }, [formData.item])

  // Initialize Google Maps when step 4 (Photos & Location) is reached
  useLayoutEffect(() => {
    if (step === 4 && typeof window !== 'undefined') {
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
  }, [step, formData.location])

  const initGoogleMapsAutocomplete = () => {
    if (typeof window === 'undefined' || !(window as any).google) {
      // Wait a bit and try again
      setTimeout(() => {
        if ((window as any).google) {
          initGoogleMapsAutocomplete()
        }
      }, 500)
      return
    }

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!googleApiKey) return

    const input = document.getElementById('location-input') as HTMLInputElement
    const mapElement = document.getElementById('map')
    if (!input || !mapElement) return

    // Initialize autocomplete
    const autocomplete = new (window as any).google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: [] }
    })

    // Initialize map
    const map = new (window as any).google.maps.Map(mapElement, {
      center: formData.latitude && formData.longitude 
        ? { lat: formData.latitude, lng: formData.longitude }
        : { lat: 0, lng: 0 },
      zoom: formData.latitude && formData.longitude ? 15 : 2
    })

    const marker = new (window as any).google.maps.Marker({ map })

    // If we already have coordinates, show them on the map
    if (formData.latitude && formData.longitude) {
      map.setCenter({ lat: formData.latitude, lng: formData.longitude })
      map.setZoom(15)
      marker.setPosition({ lat: formData.latitude, lng: formData.longitude })
    }

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry) {
        console.error('No geometry found for place')
        return
      }

      const location = place.formatted_address || place.name
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      setFormData({
        ...formData,
        location,
        latitude: lat,
        longitude: lng
      })

      // Update map
      map.setCenter({ lat, lng })
      map.setZoom(15)
      marker.setPosition({ lat, lng })
    })
  }

  // Save progress to localStorage after each step
  useLayoutEffect(() => {
    const progress: SavedProgress = {
      step,
        formData,
      companyId: formData.company,
      companyName: formData.companyName,
      itemId: formData.item,
      itemName: formData.itemName,
      categoryName: categoryName,
    }
    localStorage.setItem('listing_progress', JSON.stringify(progress))
  }, [step, formData, categoryName])

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      setError('')
      const res = await fetch('/api/categories', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to fetch categories')
      }
      const data = await res.json()
      const categoriesList = Array.isArray(data.categories) ? data.categories : []
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
  }

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true)
      setError('')
      // Fetch all companies that have items (no category filter)
      const res = await fetch('/api/companies?category=all')
      if (!res.ok) {
        throw new Error('Failed to fetch companies')
      }
      const data = await res.json()
      const companiesList = Array.isArray(data) ? data : []
      setCompanies(companiesList)
      if (companiesList.length === 0) {
        setError('No companies available. Please add companies and items in the admin panel.')
      } else {
        setError('') // Clear error if we have companies
      }
    } catch (error: any) {
      console.error('Error fetching companies:', error)
      setError(error.message || 'Error loading companies. Please try again.')
      setCompanies([])
    } finally {
      setCompaniesLoading(false)
    }
  }

  const fetchCompaniesByCategory = async (category: string) => {
    try {
      setCompaniesLoading(true)
      setError('')
      // Fetch companies for the specific category
      const res = await fetch(`/api/companies?category=${encodeURIComponent(category)}`)
      if (!res.ok) {
        throw new Error('Failed to fetch companies')
      }
      const data = await res.json()
      const companiesList = Array.isArray(data) ? data : []
      setCompanies(companiesList)
      if (companiesList.length === 0) {
        setError(`No companies available for ${category}. Please add companies and items in the admin panel.`)
      } else {
        setError('') // Clear error if we have companies
      }
    } catch (error: any) {
      console.error('Error fetching companies:', error)
      setError(error.message || 'Error loading companies. Please try again.')
      setCompanies([])
    } finally {
      setCompaniesLoading(false)
    }
  }

  const fetchItems = async (companyId: string, categoryName?: string | null) => {
    try {
      setItemsLoading(true)
      setError('')
      
      // If category is saved, filter items by both company and category
      const categoryToUse = categoryName || formData.categoryName || categoryParam
      
      // Build URL with companyId and optional category
      let url = `/api/items?companyId=${encodeURIComponent(companyId)}`
      if (categoryToUse) {
        url += `&category=${encodeURIComponent(categoryToUse)}`
      }
      
      console.log('🔄 Fetching items:', { companyId, category: categoryToUse })
      
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Failed to fetch items')
      }
      const data = await res.json()
      const itemsList = Array.isArray(data) ? data : []
      setItems(itemsList)
      
      console.log(`✅ Found ${itemsList.length} items for companyId "${companyId}"${categoryToUse ? ` in category "${categoryToUse}"` : ''}`)
      
      if (itemsList.length === 0) {
        setError(`No items available for this brand${categoryToUse ? ` in ${categoryToUse}` : ''}.`)
      } else {
        setError('')
      }
    } catch (error: any) {
      console.error('Error fetching items:', error)
      setError(error.message || 'Error loading items')
      setItems([])
    } finally {
      setItemsLoading(false)
    }
  }

  const fetchSpecifications = async (itemId: string) => {
    if (!itemId) {
      console.error('fetchSpecifications: No itemId provided')
      setError('Item ID is required to fetch specifications')
      return
    }

    try {
      setSpecsLoading(true)
      setError('')
      console.log('Fetching specifications for itemId:', itemId)
      
      const res = await fetch(`/api/items?itemId=${itemId}`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('API error:', res.status, errorData)
        throw new Error(errorData.error || `Failed to fetch specifications (${res.status})`)
      }
      
      const item = await res.json()
      console.log('API response:', { itemId: item?.id, specsCount: item?.specifications?.length || 0 })
      
      if (item && item.specifications) {
        const specs = item.specifications || []
        // Sort specifications by order if they have an order field
        const sortedSpecs = specs.sort((a: any, b: any) => {
          // If both have order, sort by order
          if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
            return a.order - b.order
          }
          // If only a has order, it comes first
          if (a.order !== null && a.order !== undefined) return -1
          // If only b has order, it comes first
          if (b.order !== null && b.order !== undefined) return 1
          // Otherwise, keep original order (already sorted by API)
          return 0
        })
        setSpecifications(sortedSpecs)
        console.log(`Loaded ${sortedSpecs.length} specifications`)
        
        // Auto-advance to first spec step if specs exist
        if (sortedSpecs.length > 0) {
          setTimeout(() => {
            setStep(3) // First spec step (step 3)
            setCurrentSpecIndex(0)
          }, 100)
        } else {
          // No specs, advance to photos step
          // Photos step is: 3 + specifications.length = 3 + 0 = 3
          const photosStep = 3 + sortedSpecs.length
          setTimeout(() => {
            setStep(photosStep) // Photos step when no specs
          }, 100)
        }
      } else {
        console.log('No specifications found for item')
        setSpecifications([])
        // No specs, advance to photos step (which is step 3 when specs.length = 0)
        const photosStep = 3 + 0
        setTimeout(() => {
          setStep(photosStep)
        }, 100)
      }
    } catch (error: any) {
      console.error('Error fetching specifications:', error)
      const errorMessage = error.message || 'Error loading specifications. Please try again.'
      setError(errorMessage)
      setSpecifications([])
      // Still allow user to proceed even if specs fail
      setTimeout(() => {
        setStep(3)
      }, 100)
    } finally {
      setSpecsLoading(false)
    }
  }

  const handleCompanySelect = async (companyId: string, companyName: string) => {
    setFormData({ 
      ...formData, 
      company: companyId,
      companyName: companyName,
      item: null,
      itemName: null,
      specs: {}
    })
    setItems([])
    setSpecifications([])
    setCompanySearch('') // Clear search
    setItemSearch('') // Clear item search
    
    // Fetch items for this company filtered by category
    const categoryToUse = categoryName || formData.categoryName || categoryParam
    await fetchItems(companyId, categoryToUse)
    
    // Auto-advance to next step
    setTimeout(() => {
      setStep(2)
      setError('')
    }, 300)
  }

  const handleItemSelect = async (itemId: string, itemName: string) => {
    if (!itemId) {
      setError('Please select a valid item')
      return
    }

    console.log('Item selected:', { itemId, itemName })
    
    setFormData({ ...formData, item: itemId, itemName: itemName, specs: {} })
    setItemSearch('') // Clear search
    setCurrentSpecIndex(0) // Reset spec index
    setSpecifications([]) // Clear previous specs
    
    // Fetch specifications for this item
    try {
      await fetchSpecifications(itemId)
    } catch (error) {
      console.error('Error in handleItemSelect:', error)
      // Error is already handled in fetchSpecifications
    }
  }
  
  // Filter items based on selected specifications
  const filteredItems = useListingFilter(items, {
    categoryId: formData.category,
    categoryName: formData.categoryName || categoryName,
    companyId: formData.company,
    itemId: formData.item,
    specifications: formData.specs
  })

  const handleSpecChange = (specId: string, value: string) => {
    const newSpecs = {
      ...formData.specs,
      [specId]: value,
    }
    setFormData({
      ...formData,
      specs: newSpecs,
    })
    
    // Check if all specifications are now filled
    const allSpecsFilled = specifications.every((spec: any) => {
      return newSpecs[spec.id] && newSpecs[spec.id].trim() !== ''
    })
    
    // If all specs are filled, auto-advance to Photos & Location step
    if (allSpecsFilled && specifications.length > 0) {
      const photosStep = 3 + specifications.length
      setTimeout(() => {
        setStep(photosStep)
      }, 300)
      return
    }
    
    // Auto-advance to next spec if current spec is filled
    const currentSpecIndex = specifications.findIndex(s => s.id === specId)
    if (currentSpecIndex >= 0 && value && currentSpecIndex < specifications.length - 1) {
      // Check if we should auto-advance (only if this is the current step)
      const currentStep = step
      if (currentStep === 3 + currentSpecIndex) {
        setTimeout(() => {
          setStep(3 + currentSpecIndex + 1)
          setCurrentSpecIndex(currentSpecIndex + 1)
        }, 300)
      }
    }
  }

  const handleStepClick = (stepNumber: number) => {
    // Allow going back to any completed step
    if (stepNumber <= step) {
      setStep(stepNumber)
      setError('')
      
      // If clicking on a specification step, update currentSpecIndex
      if (stepNumber >= 3 && stepNumber < 3 + specifications.length) {
        const specIndex = stepNumber - 3
        setCurrentSpecIndex(specIndex)
      }
    }
  }

  const fetchMyLocation = async (retryCount = 0) => {
    const MAX_RETRIES = 1
    setLocationLoading(true)
    setError('')

    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser')
      }

      console.log('🌍 Requesting location permission...')

      // Get user's coordinates with optimized timeout strategy
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        let attemptedHighAccuracy = false
        let timeoutId: NodeJS.Timeout | null = null
        let isResolved = false

        // Try with low accuracy first (faster response)
        const tryGetPosition = (highAccuracy: boolean) => {
          // Clear any existing timeout
          if (timeoutId) clearTimeout(timeoutId)

          // If already resolved, don't try again
          if (isResolved) return

          // Faster timeouts: 2s for high accuracy, 5s for low accuracy
          const manualTimeout = highAccuracy ? 2000 : 5000
          const browserTimeout = highAccuracy ? 4000 : 8000

          // Manual timeout that triggers before browser timeout
          timeoutId = setTimeout(() => {
            if (isResolved) return

            if (!highAccuracy && !attemptedHighAccuracy) {
              attemptedHighAccuracy = true
              console.log('⏰ Low accuracy timeout, trying high accuracy...')
              tryGetPosition(true)
            } else {
              isResolved = true
              reject(new Error('Location request timed out. Please try again or enter manually.'))
            }
          }, manualTimeout)

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (isResolved) return
              isResolved = true
              if (timeoutId) clearTimeout(timeoutId)
              resolve(pos)
            },
            (error) => {
              if (isResolved) return

              if (timeoutId) clearTimeout(timeoutId)

              // Try high accuracy if low accuracy failed and we haven't tried it yet
              if (
                !highAccuracy &&
                !attemptedHighAccuracy &&
                (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT)
              ) {
                attemptedHighAccuracy = true
                console.log('⚠️ Low accuracy failed, trying high accuracy...')
                tryGetPosition(true)
                return
              }

              isResolved = true
              let errorMsg = 'Unable to get location'
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMsg = 'Location permission denied. Please enable location access in your browser settings.'
                  break
                case error.POSITION_UNAVAILABLE:
                  errorMsg = 'Location unavailable. Please check your device\'s location settings or enter manually.'
                  break
                case error.TIMEOUT:
                  errorMsg = 'Location request timed out. Please try again or enter manually.'
                  break
              }
              reject(new Error(errorMsg))
            },
            {
              enableHighAccuracy: highAccuracy,
              timeout: browserTimeout,
              maximumAge: 600000, // Use cached position if less than 10 minutes old (faster)
            }
          )
        }

        // Start with low accuracy for faster response
        tryGetPosition(false)
      })

      const { latitude, longitude } = position.coords
      console.log('✅ Coordinates obtained:', { latitude, longitude })

      // Get API key from environment
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

      if (!apiKey) {
        throw new Error('Google API key not configured')
      }

      // Use Google Geocoding API to get address details with timeout (no country restrictions)
      const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      console.log('📍 Fetching address from Google Geocoding API...')

      // Create AbortController for fetch timeout
      const controller = new AbortController()
      const fetchTimeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      let response
      try {
        response = await fetch(apiUrl, {
          signal: controller.signal,
        })
        clearTimeout(fetchTimeout)
      } catch (fetchError: any) {
        clearTimeout(fetchTimeout)
        if (fetchError.name === 'AbortError') {
          throw new Error('Address lookup timed out. Please try again.')
        }
        throw fetchError
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📦 Google API Response:', data)

      // Check for API errors
      if (data.status === 'REQUEST_DENIED') {
        console.error('❌ API Request Denied:', data.error_message)
        throw new Error('Google API access denied. Please check API key and restrictions.')
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('API quota exceeded. Please try again later.')
      } else if (data.status === 'ZERO_RESULTS') {
        throw new Error('No address found for your location.')
      } else if (data.status !== 'OK') {
        throw new Error(
          `Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`
        )
      }

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const fullAddress = result.formatted_address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

        setFormData({
          ...formData,
          latitude,
          longitude,
          location: fullAddress,
        })

        // Update map if it exists
        const mapElement = document.getElementById('map')
        if (mapElement && typeof window !== 'undefined' && (window as any).google) {
          const map = new (window as any).google.maps.Map(mapElement, {
            center: { lat: latitude, lng: longitude },
            zoom: 15,
          })
          new (window as any).google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: map,
          })
        }

        setLocationLoading(false)
      } else {
        throw new Error('No address data returned from Google.')
      }
    } catch (error: any) {
      console.error('❌ Location error:', error)

      // Retry logic for timeout errors
      if (
        error.message &&
        error.message.includes('timed out') &&
        retryCount < MAX_RETRIES
      ) {
        console.log(`🔄 Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`)
        setError(`Location detection timed out. Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
        // Reduced retry delay to 300ms for faster response
        setTimeout(() => {
          setLocationLoading(false) // Reset before retry
          fetchMyLocation(retryCount + 1)
        }, 300)
        return
      }

      setError(error.message || 'Unable to retrieve your location. Please enter it manually.')
      setLocationLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const maxSize = 1 * 1024 * 1024 // 1MB in bytes
    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    // Validate files first
    fileArray.forEach((file) => {
      if (file.size > maxSize) {
        errors.push(`${file.name} exceeds 1MB limit. Please compress it.`)
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

    // Check if adding these files would exceed the limit
    const totalImages = formData.images.length + validFiles.length
    if (totalImages > 10) {
      setError(`You can only upload up to 10 images. You already have ${formData.images.length} image(s).`)
      return
    }

    // Process valid files
    const promises = validFiles.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })

    Promise.all(promises)
      .then((base64Images) => {
        setFormData({
          ...formData,
          images: [...formData.images, ...base64Images].slice(0, 10)
        })
        setError('')
        // Reset file input
        e.target.value = ''
      })
      .catch((error) => {
        console.error('Error reading files:', error)
        setError('Error reading image files')
      })
  }

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_: any, i: number) => i !== index)
    setFormData({ ...formData, images: newImages })
  }

  const handleNext = () => {
    setError('')
    
    if (step === 0) {
      // Step 0: Category (if accessed directly without category)
      if (!formData.category && !categoryName) {
        setError('Please select a category')
        return
      }
      if (categoryName && !formData.categoryName) {
        setFormData({ ...formData, categoryName })
      }
    } else if (step === 1) {
      // Step 1: Select Brand (Company)
      if (!formData.company) {
        setError('Please select a brand/company')
        return
      }
    } else if (step === 2) {
      // Step 2: Search Device (Item/Model)
      if (!formData.item) {
        setError('Please select a device/model')
        return
      }
    } else if (step >= 3 && step < 3 + specifications.length) {
      // Specification steps - validate current spec
      const specIndex = step - 3
      const currentSpec = specifications[specIndex]
      if (currentSpec && !formData.specs[currentSpec.id]) {
        setError(`Please select ${currentSpec.name}`)
        return
      }
      // Move to next spec or photos
      if (specIndex < specifications.length - 1) {
        setCurrentSpecIndex(specIndex + 1)
      }
    } else if (step === 3 + specifications.length) {
      // Photos & Location step
      if (!formData.location) {
        setError('Please enter or fetch your location')
        return
      }
      // Photos are optional
    } else if (step === 4 + specifications.length) {
      // Review - Submit - Check authentication first
      if (!user) {
        setShowLoginModal(true)
        return
      }
      handleSubmit()
      return
    }
    
    setStep(step + 1)
  }

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1)
      setError('')
    } else if (step === 1 && categoryParam) {
      // If category was from homepage, go back to homepage
      router.push('/#category')
    }
  }

  const handleSubmit = async () => {
    // Check authentication
    if (!user) {
      setShowLoginModal(true)
      return
    }

    // Validate required fields
    const missingFields: string[] = []
    
    // Basic required fields
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
    
    // Check required specifications (only those marked as required in configurations)
    const requiredSpecs = specifications.filter(spec => spec.isRequired === true)
    for (const spec of requiredSpecs) {
      const specValue = formData.specs[spec.id]
      if (!specValue || specValue.toString().trim() === '') {
        missingFields.push(spec.name)
      }
    }
    
    // Show popup with missing fields
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
      // Build specs array
      const specs = Object.entries(formData.specs)
        .filter(([_, value]) => value && value.toString().trim() !== '')
        .map(([specId, value]) => ({
        specificationId: specId,
        value: value as string,
      }))

      const res = await fetch('/api/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
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
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          setShowLoginModal(true)
          setLoading(false)
          return
        }
        setError(data.error || 'Error creating listing')
        setLoading(false)
        return
      }

      // Clear saved progress
      localStorage.removeItem('listing_progress')
      
      setSubmitted(true)
      setLoading(false)

      // Redirect after 3 seconds
      setTimeout(() => {
      router.push('/dashboard')
      }, 3000)
    } catch (error) {
      setError('Network error')
      setLoading(false)
    }
  }

  const clearProgress = () => {
    setShowCancelModal(true)
  }

  const confirmCancel = () => {
      localStorage.removeItem('listing_progress')
    router.push('/#category')
  }

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
            <Link
              href="/dashboard"
              className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-[#F56A34] text-white rounded-lg hover:bg-[#ff7f50] transition-colors text-sm sm:text-base"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleRemoveCategory = () => {
    localStorage.removeItem('listing_progress')
    router.push('/#category')
  }

  const handleRemoveCompany = () => {
    setFormData({
      ...formData,
      company: null,
      companyName: null,
      item: null,
      itemName: null,
      specs: {},
      location: '',
      latitude: null,
      longitude: null,
      images: []
    })
    setItems([])
    setSpecifications([])
    setCompanySearch('')
    setItemSearch('')
    // Navigate back to step 1 (Brand selection)
    setStep(1)
  }

  const handleRemoveItem = () => {
    setFormData({
      ...formData,
      item: null,
      itemName: null,
      specs: {},
      location: '',
      latitude: null,
      longitude: null,
      images: []
    })
    setSpecifications([])
    setItemSearch('')
    // Navigate back to step 2 (Device selection)
    setStep(2)
  }

  const handleRemoveSpec = (specId: string) => {
    const newSpecs = { ...formData.specs }
    delete newSpecs[specId]
    // Find the index of the removed spec
    const specIndex = specifications.findIndex(s => s.id === specId)
    setFormData({
      ...formData,
      specs: newSpecs
    })
    // Navigate back to the spec step
    if (specIndex >= 0) {
      setStep(3 + specIndex)
      setCurrentSpecIndex(specIndex)
    } else {
      setStep(3)
    }
  }

  const handleClearAllSpecs = () => {
    // Clear all progress and redirect to browse category
    localStorage.removeItem('listing_progress')
    router.push('/#category')
  }

  const handleRemoveLocation = () => {
    setFormData({
      ...formData,
      location: '',
      latitude: null,
      longitude: null
    })
    // Navigate back to Photos & Location step (dynamic)
    setStep(3 + specifications.length)
  }


  const handleRemovePhotos = () => {
    setFormData({
      ...formData,
      images: []
    })
    // Navigate back to Photos & Location step (dynamic)
    setStep(3 + specifications.length)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col">
        <ListingHeader onCancel={clearProgress} />
        
        {/* Only show progress bar if category is selected (step >= 1) */}
        {step > 0 && (
          <ListingProgressBar 
            steps={STEPS}
            currentStep={step}
            onStepClick={handleStepClick}
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

        {/* Only show selected options bar if category is selected (step >= 1) */}
        {step > 0 && (
          <SelectedOptionsBar
            categoryName={categoryName || formData.categoryName}
            companyName={formData.companyName}
            itemName={formData.itemName}
            specs={formData.specs}
            location={formData.location}
            imagesCount={formData.images?.length || 0}
            specifications={specifications}
            onRemoveCategory={handleRemoveCategory}
            onRemoveCompany={handleRemoveCompany}
            onRemoveItem={handleRemoveItem}
            onRemoveSpec={handleRemoveSpec}
            onClearAllSpecs={handleClearAllSpecs}
            onRemoveLocation={handleRemoveLocation}
            onRemovePhotos={handleRemovePhotos}
            onClearAll={handleClearAllSpecs}
            onNavigateToStep={setStep}
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
                setStep(3 + currentSpecIndex + 1)
              } else {
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
            onCategorySelect={async (id, name) => {
              setFormData({ ...formData, category: id, categoryName: name })
              setCategoryName(name)
              // Fetch companies for this category
              await fetchCompaniesByCategory(name)
            }}
            onCompanySearchChange={setCompanySearch}
            onItemSearchChange={setItemSearch}
            onCompanySelect={handleCompanySelect}
            onItemSelect={handleItemSelect}
            onSpecChange={handleSpecChange}
            onLocationChange={(value) => setFormData({ ...formData, location: value })}
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

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-[#F56A34]/10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#F56A34]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Listing?</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel? Your progress will be lost.
              </p>
                  </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Continue Editing
              </button>
                  <button
                onClick={confirmCancel}
                className="flex-1 px-4 py-2 bg-[#F56A34] text-white rounded-lg hover:bg-[#ff7f50] transition-colors font-medium"
              >
                Yes, Cancel
                  </button>
                  </div>
                </div>
              </div>
            )}

      {/* Login/Signup Modal */}
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
                href={`/signup?redirect=${encodeURIComponent('/dashboard/create-listing')}`}
                className="w-full px-4 py-2.5 bg-[#F56A34] text-white rounded-lg hover:bg-[#ff7f50] transition-colors text-center text-sm sm:text-base font-semibold"
                onClick={() => {
                  // Save current progress before redirecting
                  const progress = {
                    step,
                    formData,
                    companyId: formData.company,
                    companyName: formData.companyName,
                    itemId: formData.item,
                    itemName: formData.itemName,
                    categoryName: categoryName,
                  }
                  localStorage.setItem('listing_progress', JSON.stringify(progress))
                }}
              >
                Create Account
              </Link>
              <Link
                href={`/login?redirect=${encodeURIComponent('/dashboard/create-listing')}`}
                className="w-full px-4 py-2.5 border-2 border-[#F56A34] text-[#F56A34] rounded-lg hover:bg-orange-50 transition-colors text-center text-sm sm:text-base font-semibold"
                onClick={() => {
                  // Save current progress before redirecting
                  const progress = {
                    step,
                    formData,
                    companyId: formData.company,
                    companyName: formData.companyName,
                    itemId: formData.item,
                    itemName: formData.itemName,
                    categoryName: categoryName,
                  }
                  localStorage.setItem('listing_progress', JSON.stringify(progress))
                }}
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

export default function CreateListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <CreateListingContent />
    </Suspense>
  )
}
