'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Filter, 
  Loader2,
  Package,
  Calendar,
  ShoppingCart,
  AlertTriangle,
  User,
  Clock,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Modal, Button } from '@/components/ui/modal'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, any> | null
  is_read: boolean
  created_at: string
  target_roles: string[] | null
  target_user_id: string | null
}

interface NotificationStats {
  total: number
  unread: number
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchNotifications()
    
    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          // Add new notification to the list
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setStats(prev => ({ ...prev, total: prev.total + 1, unread: prev.unread + 1 }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchCurrentUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role:roles(name)')
        .eq('id', user.id)
        .single()
      
      const typedProfile = profile as { role: { name: string } | null } | null
      if (typedProfile?.role) {
        setCurrentUserRole(typedProfile.role.name)
      }
    }
  }

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
    
    const typedProfile2 = profile as { role: { name: string } | null } | null
    const userRole = typedProfile2?.role?.name

    // Fetch notifications for this user's role or specifically targeted to them
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    // Filter by role or user-specific
    // In a real app, this would be done with RLS policies
    // For now, we'll fetch all and filter client-side
    
    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      // Use mock data for demo
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'case_assigned',
          title: 'มอบหมายเคสใหม่',
          message: 'คุณได้รับมอบหมายเคส CASE-2026-015 (นายสมชาย ใจดี) กำหนดวันที่ 5 ก.พ. 2569',
          data: { case_id: '1', case_number: 'CASE-2026-015' },
          is_read: false,
          created_at: new Date().toISOString(),
          target_roles: ['dentist'],
          target_user_id: null,
        },
        {
          id: '2',
          type: 'stock_low',
          title: 'สินค้าใกล้หมด',
          message: 'Straumann BLT 4.1x10 เหลือ 3 ชิ้น (ต่ำกว่าจุดสั่งซื้อ)',
          data: { product_id: '1', product_name: 'Straumann BLT 4.1x10', quantity: 3 },
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          target_roles: ['inventory', 'admin'],
          target_user_id: null,
        },
        {
          id: '3',
          type: 'po_overdue',
          title: 'ใบสั่งซื้อเกินกำหนด',
          message: 'PO-2026-008 จาก Nobel Biocare เกินกำหนดรับ 3 วัน',
          data: { po_id: '1', po_number: 'PO-2026-008', days_overdue: 3 },
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          target_roles: ['inventory', 'admin'],
          target_user_id: null,
        },
        {
          id: '4',
          type: 'stock_expiring',
          title: 'สินค้าใกล้หมดอายุ',
          message: 'Bio-Oss 0.5g (LOT: BG-2025-A1) จะหมดอายุในอีก 30 วัน',
          data: { stock_item_id: '1', lot_number: 'BG-2025-A1', days_until_expiry: 30 },
          is_read: true,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          target_roles: ['inventory', 'admin'],
          target_user_id: null,
        },
        {
          id: '5',
          type: 'case_completed',
          title: 'เคสเสร็จสิ้น',
          message: 'เคส CASE-2026-012 (นางสาวสมหญิง รักสุข) เสร็จสิ้นแล้ว',
          data: { case_id: '2', case_number: 'CASE-2026-012' },
          is_read: true,
          created_at: new Date(Date.now() - 259200000).toISOString(),
          target_roles: ['cs', 'dentist', 'admin'],
          target_user_id: null,
        },
      ]
      
      // Filter by role
      const filtered = mockNotifications.filter(n => 
        n.target_user_id === user.id || 
        (n.target_roles && n.target_roles.includes(userRole || '')) ||
        (!n.target_roles && !n.target_user_id)
      )
      
      setNotifications(filtered)
      setStats({
        total: filtered.length,
        unread: filtered.filter(n => !n.is_read).length,
      })
    } else {
      // Filter by role
      const filtered = (data || []).filter((n: Notification) => 
        n.target_user_id === user.id || 
        (n.target_roles && n.target_roles.includes(userRole || '')) ||
        (!n.target_roles && !n.target_user_id)
      )
      
      setNotifications(filtered)
      setStats({
        total: filtered.length,
        unread: filtered.filter((n: Notification) => !n.is_read).length,
      })
    }
    
    setLoading(false)
  }

  const markAsRead = async (notification: Notification) => {
    if (notification.is_read) return

    const supabase = createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('id', notification.id)

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      )
      setStats(prev => ({ ...prev, unread: prev.unread - 1 }))
    }
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    
    if (unreadIds.length === 0) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .in('id', unreadIds)

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setStats(prev => ({ ...prev, unread: 0 }))
    }
  }

  const deleteNotification = async (notification: Notification) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification.id)

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
      setStats(prev => ({
        total: prev.total - 1,
        unread: notification.is_read ? prev.unread : prev.unread - 1,
      }))
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification)
    setSelectedNotification(notification)
    setIsDetailModalOpen(true)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`
    
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getNotificationConfig = (type: string) => {
    return notificationTypeConfig[type] || notificationTypeConfig.default
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (typeFilter && n.type !== typeFilter) return false
    return true
  })

  const notificationTypes = Array.from(new Set(notifications.map(n => n.type)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">การแจ้งเตือน</h1>
          <p className="text-slate-500 mt-1">
            {stats.unread > 0 ? `มี ${stats.unread} รายการที่ยังไม่ได้อ่าน` : 'ไม่มีการแจ้งเตือนใหม่'}
          </p>
        </div>
        {stats.unread > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <CheckCheck className="w-5 h-5" />
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">การแจ้งเตือนทั้งหมด</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{stats.unread}</p>
              <p className="text-sm text-slate-500">ยังไม่ได้อ่าน</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ยังไม่ได้อ่าน
            </button>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ทุกประเภท</option>
            {notificationTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredNotifications.map((notification) => {
              const config = getNotificationConfig(notification.type)
              const IconComponent = config.icon
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !notification.is_read ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`font-medium ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-400">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-600" />
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification)
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="รายละเอียดการแจ้งเตือน"
        size="md"
      >
        {selectedNotification && (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              {(() => {
                const config = getNotificationConfig(selectedNotification.type)
                const IconComponent = config.icon
                return (
                  <div className={`w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`w-6 h-6 ${config.color}`} />
                  </div>
                )
              })()}
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">{selectedNotification.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{formatTime(selectedNotification.created_at)}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-slate-700">{selectedNotification.message}</p>
            </div>

            {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-600 mb-2">ข้อมูลเพิ่มเติม</p>
                <div className="space-y-2">
                  {Object.entries(selectedNotification.data).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{key}</span>
                      <span className="text-slate-900 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                ปิด
              </Button>
              {selectedNotification.data?.case_id && (
                <Button onClick={() => window.location.href = `/reservations?case=${selectedNotification.data?.case_id}`}>
                  ดูเคส
                </Button>
              )}
              {selectedNotification.data?.po_id && (
                <Button onClick={() => window.location.href = `/orders`}>
                  ดูใบสั่งซื้อ
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
