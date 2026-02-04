'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  ClipboardList,
  FileText,
  ShoppingCart,
  ArrowLeftRight,
  BarChart3,
  Settings,
} from 'lucide-react'

interface SidebarProps {
  profile: {
    full_name: string
    roles: {
      name: string
      display_name: string
    } | null
  } | null
}

const menuItems = [
  { href: '/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/calendar', label: 'ปฏิทินเคสผ่าตัด', icon: Calendar },
  { href: '/patients', label: 'รายชื่อคนไข้', icon: Users },
  { href: '/inventory', label: 'สต็อกวัสดุและรากเทียม', icon: Package },
  { href: '/reservations', label: 'การจองของสำหรับเคส', icon: ClipboardList },
  { href: '/orders', label: 'ใบสั่งซื้อ', icon: ShoppingCart },
  { href: '/transfers', label: 'ยืม-คืน/แลกเปลี่ยนกับบริษัท', icon: ArrowLeftRight },
  { href: '/reports', label: 'รายงาน', icon: BarChart3 },
  { href: '/settings', label: 'ตั้งค่าระบบ', icon: Settings },
]

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white lg:block hidden">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <span className="text-lg font-bold text-white">D</span>
        </div>
        <div>
          <p className="font-semibold text-slate-900">DentalStock</p>
          <p className="text-xs text-slate-500">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <span className="text-sm font-medium text-slate-600">
              {profile?.full_name?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.full_name || 'ผู้ใช้งาน'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {profile?.roles?.display_name || 'ผู้ดูแลระบบ'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
