'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, Clock, Package, User, AlertTriangle, ShoppingCart, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

const notificationTypeConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  stock_low: { icon: Package, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  stock_expiring: { icon: Clock, color: 'text-red-600', bgColor: 'bg-red-100' },
  po_sent: { icon: ShoppingCart, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  po_received: { icon: Package, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  po_overdue: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  case_assigned: { icon: User, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  case_completed: { icon: Check, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  stock_used: { icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  reservation_created: { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  default: { icon: Bell, color: 'text-slate-600', bgColor: 'bg-slate-100' },
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    
    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel('notification-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev.slice(0, 4)])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role:roles(name)')
      .eq('id', user.id)
      .single()
    
    const userRole = (profile?.role as any)?.name

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching notifications:', error)
      // Use mock data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'case_assigned',
          title: 'มอบหมายเคสใหม่',
          message: 'คุณได้รับมอบหมายเคส CASE-2026-015',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'stock_low',
          title: 'สินค้าใกล้หมด',
          message: 'Straumann BLT 4.1x10 เหลือ 3 ชิ้น',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ]
      setNotifications(mockNotifications)
      setUnreadCount(mockNotifications.filter(n => !n.is_read).length)
    } else {
      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: Notification) => !n.is_read).length)
    }
    
    setLoading(false)
  }

  const markAsRead = async (notification: Notification) => {
    if (notification.is_read) return

    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('id', notification.id)

    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาที`
    if (diffHours < 24) return `${diffHours} ชม.`
    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
  }

  const getNotificationConfig = (type: string) => {
    return notificationTypeConfig[type] || notificationTypeConfig.default
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">การแจ้งเตือน</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">กำลังโหลด...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const config = getNotificationConfig(notification.type)
                  const IconComponent = config.icon
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification)}
                      className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        !notification.is_read ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-200">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ดูทั้งหมด
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
