'use client'

import { getDefaultBrand } from '@/lib/default-brands'

interface ListingStepContentProps {
  step: number
  formData: any
  categoryName: string | null
  categories: any[]
  companies: any[]
  items: any[]
  specifications: any[]
  categoriesLoading: boolean
  companiesLoading: boolean
  itemsLoading: boolean
  specsLoading: boolean
  companySearch: string
  itemSearch: string
  locationLoading: boolean
  currentSpecIndex?: number
  onCategorySelect: (id: string, name: string) => void
  onCompanySearchChange: (value: string) => void
  onItemSearchChange: (value: string) => void
  onCompanySelect: (id: string, name: string) => void
  onItemSelect: (id: string, name: string) => void
  onSpecChange: (specId: string, value: string) => void
  onLocationChange: (value: string) => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (index: number) => void
  onFetchLocation: () => void
  onSpecComplete?: () => void
}

export default function ListingStepContent({
  step,
  formData,
  categoryName,
  categories,
  companies,
  items,
  specifications,
  categoriesLoading,
  companiesLoading,
  itemsLoading,
  specsLoading,
  companySearch,
  itemSearch,
  locationLoading,
  currentSpecIndex = 0,
  onCategorySelect,
  onCompanySearchChange,
  onItemSearchChange,
  onCompanySelect,
  onItemSelect,
  onSpecChange,
  onLocationChange,
  onImageUpload,
  onRemoveImage,
  onFetchLocation,
  onSpecComplete,
}: ListingStepContentProps) {
  // Step titles and descriptions
  const stepConfig = [
    { 
      title: 'Category', 
      subtitle: 'Choose a category for your listing' 
    },
    { 
      title: 'SELECT DEVICE BRAND', 
      subtitle: `Choose the brand for ${categoryName || 'your device'}` 
    },
    { 
      title: 'SELECT DEVICE', 
      subtitle: `Choose your ${formData.companyName || 'brand'} device model` 
    },
    { 
      title: 'Specifications', 
      subtitle: `Provide details about your ${formData.itemName || 'device'}` 
    },
    { 
      title: 'Photos & Location', 
      subtitle: 'Upload photos and set your location' 
    },
    { 
      title: 'Review & Submit', 
      subtitle: 'Review your listing before submitting' 
    },
  ]

  const currentStepConfig = stepConfig[step] || stepConfig[0]

  // Helper function to filter spec options based on item type
  const getFilteredSpecOptions = (spec: any) => {
    if (spec.valueType !== 'select' || !spec.options) return []
    try {
      const allOptions = JSON.parse(spec.options || '[]')
      const itemName = formData.itemName?.toLowerCase() || ''
      
      if (spec.name.toLowerCase().includes('ram')) {
        if (itemName.includes('phone') || itemName.includes('mobile') || itemName.includes('smartphone')) {
          return allOptions.filter((opt: string) => 
            opt.includes('4GB') || opt.includes('6GB') || opt.includes('8GB') || opt.includes('12GB') || opt.includes('16GB')
          )
        } else if (itemName.includes('laptop') || itemName.includes('notebook')) {
          return allOptions.filter((opt: string) => 
            opt.includes('8GB') || opt.includes('16GB') || opt.includes('32GB') || opt.includes('64GB')
          )
        }
      }
      return allOptions
    } catch (e) {
      return []
    }
  }

  return (
    <div className="rounded-lg h-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentStepConfig.title}</h2>
      <p className="text-sm text-gray-600 mb-6">{currentStepConfig.subtitle}</p>

      {/* Step 0: Category Selection (if accessed directly) */}
      {step === 0 && (
        <>
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading categories...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categories.map((category) => {
                // Helper function to determine if icon is an image (URL or base64)
                const isImage = (icon: string | null | undefined): boolean => {
                  if (!icon) return false
                  // Check for image URLs
                  if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')) {
                    return true
                  }
                  // Check for base64 image data
                  if (icon.startsWith('data:image/')) {
                    return true
                  }
                  // Filter out corrupted/garbled data (long strings that look like corrupted base64)
                  if (icon.length > 50 && icon.includes(';') && icon.includes('@')) {
                    return false
                  }
                  return false
                }
                
                // Get default emoji for category
                const getDefaultEmoji = (categoryName: string): string => {
                  const name = categoryName.toLowerCase()
                  if (name.includes('laptop')) return '💻'
                  if (name.includes('mobile') || name.includes('phone')) return '📱'
                  if (name.includes('tablet')) return '📱'
                  if (name.includes('watch') || name.includes('smartwatch')) return '⌚'
                  return '📦'
                }
                
                const categoryIcon = category.icon
                const isValidImage = categoryIcon && isImage(categoryIcon)
                // Show emoji if icon exists but is not an image, and is short (likely an emoji)
                const showEmoji = categoryIcon && !isValidImage && categoryIcon.length <= 5
                const defaultEmoji = getDefaultEmoji(category.name)
                
                return (
                  <button
                    key={category.id}
                    onClick={() => onCategorySelect(category.id, category.name)}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                      formData.category === category.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-center h-12 w-12">
                      {isValidImage ? (
                        <img 
                          src={categoryIcon} 
                          alt={category.name}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            // Hide image and show emoji fallback on error
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              const fallback = parent.querySelector('.emoji-fallback') as HTMLElement
                              if (fallback) fallback.style.display = 'block'
                            }
                          }}
                        />
                      ) : null}
                      <span 
                        className={`emoji-fallback text-3xl ${isValidImage ? 'hidden' : ''}`}
                        style={{ display: isValidImage ? 'none' : 'block' }}
                      >
                        {showEmoji ? categoryIcon : defaultEmoji}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm text-gray-900 text-center">{category.name}</h3>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Step 1: Select Brand (Company) */}
      {step === 1 && (
        <>
          {companiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading brands...</p>
              </div>
            </div>
          ) : (
            <>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                {companies
                  .filter(company => company.name.toLowerCase().includes(companySearch.toLowerCase()))
                  .map((company) => {
                    // Get default brand logo if available
                    const defaultBrand = getDefaultBrand(company.name)
                    const brandLogo = defaultBrand?.logo || company.icon || null
                    
                    // Check if company.icon is a valid image (URL or base64)
                    const isImageUrl = company.icon && (
                      company.icon.startsWith('http://') || 
                      company.icon.startsWith('https://') || 
                      company.icon.startsWith('data:image/') ||
                      company.icon.startsWith('/')
                    )
                    
                    return (
                      <button
                        key={company.id}
                        onClick={() => onCompanySelect(company.id, company.name)}
                        className={`p-3 sm:p-6 rounded-xl border-2 transition-all bg-white shadow-sm hover:shadow-lg ${
                          formData.company === company.id
                            ? 'border-[#F56A34] bg-[#F56A34]/5 ring-2 ring-[#F56A34]/30 '
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {brandLogo ? (
                          <div className="mb-2 sm:mb-3 flex items-center justify-center h-12 sm:h-16">
                            {defaultBrand || isImageUrl ? (
                              <img 
                                src={brandLogo} 
                                alt={company.name}
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => {
                                  // Fallback to emoji if image fails
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const fallback = target.nextElementSibling as HTMLElement
                                  if (fallback) fallback.style.display = 'block'
                                }}
                              />
                            ) : (
                              <div className="text-2xl sm:text-3xl">{company.icon}</div>
                            )}
                            <span className="text-xs font-semibold text-gray-900 hidden">{company.name}</span>
                            {/* Fallback emoji if image fails */}
                            <span className="text-2xl sm:text-3xl hidden">📱</span>
                          </div>
                        ) : (
                          <div className="mb-2 sm:mb-3 flex items-center justify-center h-12 sm:h-16">
                            <span className="text-2xl sm:text-3xl">📱</span>
                          </div>
                        )}
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-900 text-center leading-tight">
                          {company.name}
                        </h3>
                      </button>
                    )
                  })}
              </div>
              {companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && !companiesLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {companySearch 
                      ? `No brands found matching "${companySearch}"`
                      : 'No brands available.'}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Step 2: Search Device (Item/Model) */}
      {step === 2 && (
        <>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading devices...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Search Input for Devices */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={itemSearch}
                  onChange={(e) => onItemSearchChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F56A34] focus:border-transparent text-base"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items
                  .filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onItemSelect(item.id, item.name)}
                      className={`p-4 rounded-xl border-2 transition-all bg-white shadow-sm hover:shadow-md ${
                        formData.item === item.id
                          ? 'border-[#F56A34] bg-[#F56A34]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="font-semibold text-sm text-gray-900 text-center">{item.name}</h3>
                    </button>
                  ))}
              </div>
              {items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && !itemsLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {itemSearch 
                      ? `No devices found matching "${itemSearch}"`
                      : 'No devices available for this brand.'}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Specifications (Step-by-step) - Each spec is its own step */}
      {(() => {
        // Find if current step is a specification step
        const isSpecStep = specifications.some((spec, index) => {
          const specStepNumber = 3 + index
          return step === specStepNumber
        })
        
        if (!isSpecStep || !formData.item) return null
        
        const specStepIndex = step - 3
        const currentSpec = specifications[specStepIndex]
        
        if (!currentSpec) return null
        
        return (
          <>
            {specsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading specifications...</p>
                </div>
              </div>
            ) : specifications.length > 0 ? (
              (() => {
              
              const filteredOptions = getFilteredSpecOptions(currentSpec)
              const isLastSpec = specStepIndex === specifications.length - 1
              
              return (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">{currentSpec.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Provide details about your {formData.itemName || 'device'}
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {currentSpec.name} <span className="text-red-500">*</span>
                    </label>
                    {currentSpec.valueType === 'select' ? (
                      <div className="space-y-2">
                        {(filteredOptions.length > 0 ? filteredOptions : JSON.parse(currentSpec.options || '[]')).map((opt: string) => {
                          const isSelected = formData.specs[currentSpec.id] === opt
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                onSpecChange(currentSpec.id, opt)
                                if (opt && onSpecComplete && !isLastSpec) {
                                  setTimeout(() => onSpecComplete(), 300)
                                }
                              }}
                              className={`w-full px-4 py-3 text-left border-2 rounded-lg transition-all text-sm ${
                                isSelected
                                  ? 'border-[#F56A34] bg-orange-50 text-[#F56A34] font-medium'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{opt}</span>
                                {isSelected && (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          )
                        })}
                        {(!filteredOptions.length && !currentSpec.options) && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No options available for {currentSpec.name}
                          </p>
                        )}
                      </div>
                    ) : currentSpec.valueType === 'textarea' ? (
                      <textarea
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-[#F56A34] text-sm"
                        rows={4}
                        value={formData.specs[currentSpec.id] || ''}
                        onChange={(e) => onSpecChange(currentSpec.id, e.target.value)}
                        placeholder={`Enter ${currentSpec.name.toLowerCase()}`}
                      />
                    ) : (
                      <input
                        type={currentSpec.valueType || 'text'}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-[#F56A34] text-sm"
                        value={formData.specs[currentSpec.id] || ''}
                        onChange={(e) => {
                          onSpecChange(currentSpec.id, e.target.value)
                          if (e.target.value && onSpecComplete && !isLastSpec) {
                            setTimeout(() => onSpecComplete(), 300)
                          }
                        }}
                        placeholder={`Enter ${currentSpec.name.toLowerCase()}`}
                      />
                    )}
                  </div>
                </div>
              )
            })()
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No specifications required for this item.</p>
              </div>
            )}
          </>
        )
      })()}

      {/* Photos & Location - Dynamic step number */}
      {(() => {
        const photosStepNumber = 3 + specifications.length
        return step === photosStepNumber && formData.item && (
        <div className="space-y-6">
          {/* Photos Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 ">Device Pictures</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
                <span className="text-xs text-gray-400">PNG, JPG, GIF up to 1MB each</span>
              </label>
            </div>
            
            {formData.images && formData.images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {formData.images.map((image: string, index: number) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={() => onRemoveImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Address</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  id="location-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="Enter your address"
                  value={formData.location}
                  onChange={(e) => onLocationChange(e.target.value)}
                />
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-gray-500 text-sm">OR</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                <button
                  onClick={onFetchLocation}
                  disabled={locationLoading}
                  className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {locationLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Fetching location...</span>
                    </>
                  ) : (
                    <span>Fetch My Location</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Review - Dynamic step number */}
      {(() => {
        const reviewStepNumber = 4 + specifications.length
        return step === reviewStepNumber && formData.item && (
        <div className="space-y-6">
          {formData.images && formData.images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview Photo</h3>
              <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-300">
                <img
                  src={formData.images[0]}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {formData.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    +{formData.images.length - 1} more
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Listing Summary</h3>
            
            {categoryName && (
              <div className="flex">
                <span className="text-sm font-medium text-gray-600 w-32">Category:</span>
                <span className="text-sm text-gray-900">{categoryName}</span>
              </div>
            )}
            
            {formData.companyName && (
              <div className="flex">
                <span className="text-sm font-medium text-gray-600 w-32">Company:</span>
                <span className="text-sm text-gray-900">{formData.companyName}</span>
              </div>
            )}
            
            {formData.itemName && (
              <div className="flex">
                <span className="text-sm font-medium text-gray-600 w-32">Model:</span>
                <span className="text-sm text-gray-900">{formData.itemName}</span>
              </div>
            )}
            
            {Object.keys(formData.specs).length > 0 && (
              <div className="flex">
                <span className="text-sm font-medium text-gray-600 w-32">Specifications:</span>
                <div className="flex-1">
                  {Object.entries(formData.specs)
                    .filter(([_, value]) => value && value.toString().trim() !== '')
                    .map(([specId, value]) => {
                      const spec = specifications.find(s => s.id === specId)
                      return (
                        <div key={specId} className="text-sm text-gray-900">
                          <span className="font-medium">{spec?.name || 'Spec'}:</span> {value as string}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
            
            {formData.location && (
              <div className="flex">
                <span className="text-sm font-medium text-gray-600 w-32">Location:</span>
                <span className="text-sm text-gray-900">{formData.location}</span>
              </div>
            )}
            
            {formData.images && formData.images.length > 0 && (
              <div className="flex">
                <span className="text-sm font-medium text-gray-600 w-32">Photos:</span>
                <span className="text-sm text-gray-900">{formData.images.length} image(s)</span>
              </div>
            )}
          </div>
        </div>
        )
      })()}
    </div>
  )
}

