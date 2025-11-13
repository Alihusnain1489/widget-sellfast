

interface SelectedOptionsBarProps {
  categoryName: string | null
  companyName: string | null
  itemName: string | null
  specs: Record<string, any>
  location: string
  imagesCount: number
  specifications: any[]
  onRemoveCategory: () => void
  onRemoveCompany: () => void
  onRemoveItem: () => void
  onRemoveSpec: (specId: string) => void
  onClearAllSpecs: () => void
  onRemoveLocation: () => void
  onRemovePhotos: () => void
  onClearAll: () => void
  onNavigateToStep: (step: number) => void
}

export default function SelectedOptionsBar({
  categoryName,
  companyName,
  itemName,
  specs,
  location,
  imagesCount,
  specifications,
  onRemoveCategory,
  onRemoveCompany,
  onRemoveItem,
  onRemoveSpec,
  onClearAllSpecs,
  onRemoveLocation,
  onRemovePhotos,
  onClearAll,
  onNavigateToStep,
}: SelectedOptionsBarProps) {
  const hasAnySelection = categoryName || companyName || itemName || Object.keys(specs).length > 0 || location || imagesCount > 0

  if (!hasAnySelection) return null

  return (
    <div className="mb-4 pb-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">Selected:</span>
        <button
          onClick={onClearAll}
          className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          title="Clear all selections and go back to browse category"
        >
          Clear All
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        
        {categoryName && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
            <span className="font-medium">Category:</span>
            <span>{categoryName}</span>
            <button
              onClick={onRemoveCategory}
              className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
              title="Remove category"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {companyName && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
            <span className="font-medium">Brand:</span>
            <span>{companyName}</span>
            <button
              onClick={onRemoveCompany}
              className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
              title="Remove company"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {itemName && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
            <span className="font-medium">Model:</span>
            <span>{itemName}</span>
            <button
              onClick={onRemoveItem}
              className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
              title="Remove model"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {Object.keys(specs).length > 0 && (
          <>
            {Object.entries(specs)
              .filter(([_, value]) => value && value.toString().trim() !== '')
              .map(([specId, value]) => {
                const spec = specifications.find(s => s.id === specId)
                const displayValue = value && value.toString().length > 15 
                  ? value.toString().substring(0, 15) + '...'
                  : value
                return (
                  <div key={specId} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                    <span className="font-medium">{spec?.name || 'Spec'}:</span>
                    <span className="max-w-[100px] truncate">{displayValue}</span>
                    <button
                      onClick={() => onRemoveSpec(specId)}
                      className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                      title="Remove this specification"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            {Object.keys(specs).filter(id => specs[id] && specs[id].toString().trim() !== '').length > 0 && (
              <button
                onClick={onClearAllSpecs}
                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs hover:bg-purple-300 transition-colors"
                title="Clear all specifications"
              >
                <span>Clear All</span>
              </button>
            )}
          </>
        )}

        {location && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
            <span className="font-medium">Location:</span>
            <span className="max-w-[120px] truncate">{location}</span>
            <button
              onClick={onRemoveLocation}
              className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
              title="Clear location"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {imagesCount > 0 && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-pink-800 rounded-full text-xs">
            <span className="font-medium">Photos:</span>
            <span>{imagesCount}</span>
            <button
              onClick={onRemovePhotos}
              className="ml-1 hover:bg-pink-200 rounded-full p-0.5 transition-colors"
              title="Clear all photos"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

