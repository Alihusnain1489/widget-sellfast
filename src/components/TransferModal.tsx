'use client'

import { useState } from 'react'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (transferTo: string, createNew: boolean, newName?: string, forceDelete?: boolean) => void
  entityType: 'category' | 'brand' | 'item'
  entityName: string
  relatedData: {
    items?: number
    listings?: number
    specifications?: number
    brands?: number
    itemRelationships?: number
  }
  transferOptions: Array<{ id: string; name: string }>
  transferType: 'category' | 'brand' | 'item'
}

export default function TransferModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  relatedData,
  transferOptions,
  transferType
}: TransferModalProps) {
  const [transferTo, setTransferTo] = useState('')
  const [createNew, setCreateNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [forceDelete, setForceDelete] = useState(false)
  const [actionType, setActionType] = useState<'transfer' | 'delete'>('transfer')

  if (!isOpen) return null

  const getRelatedDataText = () => {
    const parts: string[] = []
    if (relatedData.items) parts.push(`${relatedData.items} item(s)`)
    if (relatedData.listings) parts.push(`${relatedData.listings} listing(s)`)
    if (relatedData.specifications) parts.push(`${relatedData.specifications} specification(s)`)
    if (relatedData.brands) parts.push(`${relatedData.brands} brand(s)`)
    if (relatedData.itemRelationships) parts.push(`${relatedData.itemRelationships} item relationship(s)`)
    return parts.join(', ')
  }

  const handleConfirm = () => {
    if (actionType === 'delete') {
      // Force delete - no validation needed
      onConfirm('', false, undefined, true)
      return
    }
    
    // Transfer validation
    if (!createNew && !transferTo) {
      alert('Please select a transfer target or create a new one')
      return
    }
    if (createNew && !newName.trim()) {
      alert('Please enter a name for the new entity')
      return
    }
    onConfirm(transferTo, createNew, newName.trim(), false)
  }

  const handleClose = () => {
    setTransferTo('')
    setCreateNew(false)
    setNewName('')
    setForceDelete(false)
    setActionType('transfer')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-red-600">
          Delete {entityType.charAt(0).toUpperCase() + entityType.slice(1)}: {entityName}
        </h3>
        
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>Warning:</strong> This {entityType} contains related data:
          </p>
          <p className="text-sm text-yellow-800 font-semibold">
            {getRelatedDataText()}
          </p>
          <p className="text-sm text-yellow-800 mt-2">
            Choose to transfer this data to another {transferType} or delete with all related data.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Action:
            </label>
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="radio"
                  name="actionType"
                  checked={actionType === 'transfer'}
                  onChange={() => {
                    setActionType('transfer')
                    setForceDelete(false)
                  }}
                  className="mr-2 mt-1"
                />
                <span className="flex-1">Transfer data to another {transferType}</span>
              </label>
              
              {actionType === 'transfer' && (
                <div className="ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                  <div>
                    <label className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="transferOption"
                        checked={!createNew}
                        onChange={() => {
                          setCreateNew(false)
                          setTransferTo('')
                        }}
                        className="mr-2"
                      />
                      <span>Existing {transferType}</span>
                    </label>
                    {!createNew && (
                      <select
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
                      >
                        <option value="">Select {transferType}</option>
                        {transferOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="transferOption"
                        checked={createNew}
                        onChange={() => {
                          setCreateNew(true)
                          setTransferTo('')
                        }}
                        className="mr-2"
                      />
                      <span>Create new {transferType}</span>
                    </label>
                    {createNew && (
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={`Enter new ${transferType} name`}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
                      />
                    )}
                  </div>
                </div>
              )}

              <label className="flex items-start">
                <input
                  type="radio"
                  name="actionType"
                  checked={actionType === 'delete'}
                  onChange={() => {
                    setActionType('delete')
                    setCreateNew(false)
                    setTransferTo('')
                    setForceDelete(true)
                  }}
                  className="mr-2 mt-1"
                />
                <div className="flex-1">
                  <span className="font-semibold text-red-600">Delete with all related data</span>
                  <p className="text-xs text-gray-600 mt-1">
                    This will permanently delete this {entityType} and all associated data: {getRelatedDataText()}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={actionType === 'transfer' && ((!createNew && !transferTo) || (createNew && !newName.trim()))}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionType === 'delete' ? 'Delete with Data' : 'Delete & Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}

