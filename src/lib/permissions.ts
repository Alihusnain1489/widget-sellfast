// Permission system for role-based access control
export type Permission = string
export type Role = 'USER' | 'BUYER' | 'ADMIN' | string

export interface PermissionConfig {
  id: string
  name: string
  description: string
  route: string
  icon?: string
  permission?: Permission
  category?: string
}

// All available permissions in the system
export const PERMISSIONS = {
  // Dashboard & Navigation
  DASHBOARD_VIEW: 'dashboard:view',
  PROFILE_VIEW: 'profile:view',
  PROFILE_EDIT: 'profile:edit',
  
  // Listings
  LISTINGS_VIEW_OWN: 'listings:view:own',
  LISTINGS_CREATE: 'listings:create',
  LISTINGS_EDIT_OWN: 'listings:edit:own',
  LISTINGS_DELETE_OWN: 'listings:delete:own',
  LISTINGS_VIEW_ALL: 'listings:view:all',
  LISTINGS_EDIT_ALL: 'listings:edit:all',
  LISTINGS_DELETE_ALL: 'listings:delete:all',
  LISTINGS_APPROVE: 'listings:approve',
  
  // Bidding & Deals
  BIDS_VIEW: 'bids:view',
  BIDS_CREATE: 'bids:create',
  BIDS_EDIT: 'bids:edit',
  DEALS_VIEW: 'deals:view',
  DEALS_MANAGE: 'deals:manage',
  
  // Admin - Users
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage:roles',
  
  // Admin - Categories
  CATEGORIES_VIEW: 'categories:view',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_EDIT: 'categories:edit',
  CATEGORIES_DELETE: 'categories:delete',
  
  // Admin - Brands
  BRANDS_VIEW: 'brands:view',
  BRANDS_CREATE: 'brands:create',
  BRANDS_EDIT: 'brands:edit',
  BRANDS_DELETE: 'brands:delete',
  
  // Admin - Items
  ITEMS_VIEW: 'items:view',
  ITEMS_CREATE: 'items:create',
  ITEMS_EDIT: 'items:edit',
  ITEMS_DELETE: 'items:delete',
  
  // Admin - Specifications
  SPECIFICATIONS_VIEW: 'specifications:view',
  SPECIFICATIONS_CREATE: 'specifications:create',
  SPECIFICATIONS_EDIT: 'specifications:edit',
  SPECIFICATIONS_DELETE: 'specifications:delete',
  
  // Admin - Roles & Permissions
  ROLES_VIEW: 'roles:view',
  ROLES_CREATE: 'roles:create',
  ROLES_EDIT: 'roles:edit',
  ROLES_DELETE: 'roles:delete',
  
  // Admin - Contacts
  CONTACTS_VIEW: 'contacts:view',
  CONTACTS_MANAGE: 'contacts:manage',
} as const

// Sidebar menu items with permissions
export const SIDEBAR_MENU: PermissionConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'View dashboard',
    route: '/dashboard',
    icon: 'Home',
    category: 'main'
  },
  {
    id: 'profile',
    name: 'My Profile',
    description: 'View and edit profile',
    route: '/dashboard/profile',
    icon: 'User',
    permission: PERMISSIONS.PROFILE_VIEW,
    category: 'main'
  },
  {
    id: 'my-listings',
    name: 'My Listings',
    description: 'View your listings',
    route: '/dashboard/listings',
    icon: 'List',
    permission: PERMISSIONS.LISTINGS_VIEW_OWN,
    category: 'main'
  },
  {
    id: 'create-listing',
    name: 'Create Listing',
    description: 'Create a new listing',
    route: '/dashboard/create-listing',
    icon: 'Plus',
    permission: PERMISSIONS.LISTINGS_CREATE,
    category: 'main'
  },
  {
    id: 'all-listings',
    name: 'All Listings',
    description: 'View all listings',
    route: '/dashboard/all-listings',
    icon: 'Grid',
    permission: PERMISSIONS.LISTINGS_VIEW_ALL,
    category: 'buyer'
  },
  {
    id: 'bids',
    name: 'My Bids',
    description: 'View your bids',
    route: '/dashboard/bids',
    icon: 'Handshake',
    permission: PERMISSIONS.BIDS_VIEW,
    category: 'buyer'
  },
  {
    id: 'deals',
    name: 'My Deals',
    description: 'View your deals',
    route: '/dashboard/deals',
    icon: 'ShoppingBag',
    permission: PERMISSIONS.DEALS_VIEW,
    category: 'buyer'
  },
  {
    id: 'admin-users',
    name: 'Users',
    description: 'Manage users',
    route: '/dashboard/admin/users',
    icon: 'Users',
    permission: PERMISSIONS.USERS_VIEW,
    category: 'admin'
  },
  {
    id: 'admin-listings',
    name: 'Listings',
    description: 'Manage all listings',
    route: '/dashboard/admin/listings',
    icon: 'FileText',
    permission: PERMISSIONS.LISTINGS_VIEW_ALL,
    category: 'admin'
  },
  {
    id: 'admin-categories',
    name: 'Categories',
    description: 'Manage categories',
    route: '/dashboard/admin/categories',
    icon: 'Folder',
    permission: PERMISSIONS.CATEGORIES_VIEW,
    category: 'admin'
  },
  {
    id: 'admin-brands',
    name: 'Brands',
    description: 'Manage brands',
    route: '/dashboard/admin/brands',
    icon: 'Tag',
    permission: PERMISSIONS.BRANDS_VIEW,
    category: 'admin'
  },
  {
    id: 'admin-items',
    name: 'Items',
    description: 'Manage items',
    route: '/dashboard/admin/items',
    icon: 'Package',
    permission: PERMISSIONS.ITEMS_VIEW,
    category: 'admin'
  },
  {
    id: 'admin-specifications',
    name: 'Specifications',
    description: 'Manage specifications',
    route: '/dashboard/admin/specifications',
    icon: 'Settings',
    permission: PERMISSIONS.SPECIFICATIONS_VIEW,
    category: 'admin'
  },
  {
    id: 'admin-roles',
    name: 'Roles & Permissions',
    description: 'Manage roles and permissions',
    route: '/dashboard/admin/roles',
    icon: 'Shield',
    permission: PERMISSIONS.ROLES_VIEW,
    category: 'admin'
  },
  {
    id: 'admin-contacts',
    name: 'Contacts',
    description: 'Manage contact messages',
    route: '/dashboard/admin/contacts',
    icon: 'Mail',
    permission: PERMISSIONS.CONTACTS_VIEW,
    category: 'admin'
  },
]

// Role definitions with default permissions
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  USER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
    PERMISSIONS.LISTINGS_VIEW_OWN,
    PERMISSIONS.LISTINGS_CREATE,
    PERMISSIONS.LISTINGS_EDIT_OWN,
    PERMISSIONS.LISTINGS_DELETE_OWN,
  ],
  BUYER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
    PERMISSIONS.LISTINGS_VIEW_ALL,
    PERMISSIONS.BIDS_VIEW,
    PERMISSIONS.BIDS_CREATE,
    PERMISSIONS.BIDS_EDIT,
    PERMISSIONS.DEALS_VIEW,
  ],
  ADMIN: Object.values(PERMISSIONS),
}

// Helper function to check if user has permission
export function hasPermission(userPermissions: Permission[], permission: Permission): boolean {
  return userPermissions.includes(permission)
}

// Helper function to get sidebar items for a user
export function getSidebarItems(userPermissions: Permission[]): PermissionConfig[] {
  return SIDEBAR_MENU.filter(item => {
    if (!item.permission) return true
    return hasPermission(userPermissions, item.permission)
  })
}

// Helper function to get permissions for a role
export function getRolePermissions(role: Role, customPermissions?: Permission[]): Permission[] {
  const basePermissions = ROLE_PERMISSIONS[role] || []
  return customPermissions || basePermissions
}

