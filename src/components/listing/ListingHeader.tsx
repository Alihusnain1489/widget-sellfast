
interface ListingHeaderProps {
  onCancel: () => void
}

export default function ListingHeader({ onCancel }: ListingHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Create Listing</h1>
      <button
        onClick={onCancel}
        className="text-gray-600 hover:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

