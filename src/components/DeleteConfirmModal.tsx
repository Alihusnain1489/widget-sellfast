'use client'

import { useState } from 'react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (transferToId?: string) => void
  title: string
  message: string
  hasData: boolean
  dataCount: number
  dataType: 'items' | 'listings' | 'specifications'
  transferOptions?: Array<{ id: string; name: string }>
  transferLabel?: string
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  hasData,
  dataCount,
  dataType,
  transferOptions = [],
  transferLabel = 'Transfer to'
}: DeleteConfirmModalProps) {
  const [transferToId, setTransferToId] = useState('')
  const [deleteWithData, setDeleteWithData] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (hasData && transferToId) {
      onConfirm(transferToId)
    } else if (hasData && deleteWithData) {
      onConfirm() // Delete with data
    } else if (!hasData) {
      onConfirm() // No data, just delete
    }
  }

  const canConfirm = !hasData || transferToId || deleteWithData

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{message}</p>

          {hasData && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ This {dataType === 'items' ? 'category' : dataType === 'listings' ? 'brand/item' : 'item'} has {dataCount} {dataType} associated with it.
              </p>
            </div>
          )}

          {hasData && transferOptions.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {transferLabel}:
              </label>
              <select
                value={transferToId}
                onChange={(e) => {
                  setTransferToId(e.target.value)
                  setDeleteWithData(false)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select to transfer data...</option>
                {transferOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasData && (
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={deleteWithData}
                  onChange={(e) => {
                    setDeleteWithData(e.target.checked)
                    if (e.target.checked) {
                      setTransferToId('')
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-red-600">
                  Delete with all {dataType} (this action cannot be undone)
                </span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`px-4 py-2 rounded-md text-white ${
                canConfirm
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {hasData && transferToId
                ? 'Transfer & Delete'
                : hasData && deleteWithData
                ? 'Delete with Data'
                : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

