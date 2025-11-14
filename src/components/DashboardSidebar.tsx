'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, User, List, Plus, Grid, Handshake, ShoppingBag, 
  Users, FileText, Folder, Tag, Package, Settings, Shield, 
  Mail, LogOut, Menu, X
} from 'lucide-react'
import { PermissionConfig } from '@/lib/permissions'

const iconMap: Record<string, any> = {
  Home,
  User,
  List,
  Plus,
  Grid,
  Handshake,
  ShoppingBag,
  Users,
  FileText,
  Folder,
  Tag,
  Package,
  Settings,
  Shield,
  Mail,
}

interface DashboardSidebarProps {
  menuItems: PermissionConfig[]
  user: any
  onLogout: () => void
  mobileMenuOpen: boolean
  onToggleMobileMenu: () => void
}

export default function DashboardSidebar({
  menuItems,
  user,
  onLogout,
  mobileMenuOpen,
  onToggleMobileMenu
}: DashboardSidebarProps) {
  const pathname = usePathname()

  const groupedMenu = menuItems.reduce((acc, item) => {
    const category = item.category || 'main'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, PermissionConfig[]>)

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 w-8 h-8 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="text-xl font-bold text-gray-900">SellFast</span>
        </Link>
        <div className="mt-2 text-xs text-gray-500">
          {user?.name} ({user?.role || 'USER'})
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {Object.entries(groupedMenu).map(([category, items]) => (
          <div key={category}>
            {category !== 'main' && (
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                {category === 'admin' ? 'Administration' : category === 'buyer' ? 'Buying' : ''}
              </div>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = iconMap[item.icon || 'Home'] || Home
                const isActive = pathname === item.route || pathname?.startsWith(item.route + '/')
                
                if (item.route.startsWith('/dashboard')) {
                  return (
                    <Link
                      key={item.id}
                      href={item.route}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                } else {
                  return (
                    <a
                      key={item.id}
                      href={item.route}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </a>
                  )
                }
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm min-h-screen fixed left-0 top-0 bottom-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={onToggleMobileMenu}
          className="bg-white p-2 rounded-lg shadow-md border border-gray-200"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onToggleMobileMenu}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 overflow-y-auto">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}

