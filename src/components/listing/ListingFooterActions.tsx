'use client'

interface ListingFooterActionsProps {
  currentStep: number
  totalSteps: number
  loading: boolean
  onPrevious: () => void
  onNext: () => void
}

export default function ListingFooterActions({
  currentStep,
  totalSteps,
  loading,
  onPrevious,
  onNext,
}: ListingFooterActionsProps) {
  return (
    <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
      <div className="flex gap-3">
        {currentStep > 1 && (
          <button
            onClick={onPrevious}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            Previous
          </button>
        )}
        <button
          onClick={onNext}
          disabled={loading}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Submitting...' : currentStep === totalSteps ? 'Submit Listing' : 'Save and continue'}
        </button>
      </div>
    </div>
  )
}

