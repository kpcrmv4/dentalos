'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileSidebarProvider } from './mobile-sidebar-context'

interface DashboardShellProps {
  children: ReactNode
  profile: {
    full_name: string
    roles: {
      name: string
      display_name: string
    } | null
  } | null
}

export function DashboardShell({ children, profile }: DashboardShellProps) {
  return (
    <MobileSidebarProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar profile={profile} />
        <div className="lg:pl-64">
          <Header profile={profile} />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  )
}
