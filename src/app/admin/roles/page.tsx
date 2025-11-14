'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Role {
  id: string
  name: string
  description?: string
  permissions: string
  isActive: boolean
  _count?: {
    users: number
  }
}

const PERMISSION_OPTIONS = [
  'view_listings',
  'create_listings',
  'edit_listings',
  'delete_listings',
  'view_users',
  'manage_users',
  'view_products',
  'manage_products',
  'view_categories',
  'manage_categories',
  'view_brands',
  'manage_brands',
  'view_items',
  'manage_items',
  'view_specifications',
  'manage_specifications',
  'view_roles',
  'manage_roles'
]

export default function AdminRolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    isActive: true
  })

  useLayoutEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/roles', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRoles(data.roles || [])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingRole(null)
    setFormData({ name: '', description: '', permissions: [], isActive: true })
    setShowModal(true)
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    try {
      const permissions = typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: Array.isArray(permissions) ? permissions : [],
        isActive: role.isActive
      })
    } catch (e) {
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: [],
        isActive: role.isActive
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingRole
        ? `/api/admin/roles/${editingRole.id}`
        : '/api/admin/roles'
      const method = editingRole ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
          isActive: formData.isActive
        })
      })

      if (res.ok) {
        setShowModal(false)
        fetchRoles()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save role')
      }
    } catch (error) {
      console.error('Error saving role:', error)
      alert('Failed to save role')
    }
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchRoles()
      } else {
        const error = await res.json()
        if (error.userCount > 0) {
          alert(`Cannot delete role. It has ${error.userCount} assigned users.`)
        } else {
          alert(error.error || 'Failed to delete role')
        }
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Failed to delete role')
    }
  }

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Roles</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage user roles and permissions</p>
          </div>
          <button
            onClick={handleNew}
            className="px-6 py-3 bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 font-semibold"
          >
            + Add Role
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34]"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => {
                  let permissions: string[] = []
                  try {
                    permissions = typeof role.permissions === 'string' 
                      ? JSON.parse(role.permissions) 
                      : role.permissions || []
                  } catch (e) {
                    permissions = []
                  }
                  
                  return (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{role.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{role.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {permissions.length} permission(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {role._count?.users || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          role.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(role)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(role.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No roles found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit/Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingRole ? 'Edit Role' : 'New Role'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {PERMISSION_OPTIONS.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="w-4 h-4 text-[#F56A34] border-gray-300 rounded focus:ring-[#F56A34]"
                          />
                          <span className="text-sm text-gray-700">
                            {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#F56A34] border-gray-300 rounded focus:ring-[#F56A34]"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#F56A34] text-white rounded-md hover:bg-orange-600"
                  >
                    {editingRole ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

