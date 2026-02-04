'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Package, AlertTriangle, Calendar, ArrowLeftRight, Check, X } from 'lucide-react'

// Mock notifications data
const mockNotifications = [
  {
    id: '1',
    type: 'low_stock',
    title: 'สินค้าใกล้หมด',
    message: 'Nobel Active Implant 3.5x10mm เหลือ 2 ชิ้น',
    time: '5 นาทีที่แล้ว',
    read: false,
    icon: Package,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    id: '2',
    type: 'expiring',
    title: 'สินค้าใกล้หมดอายุ',
    message: 'Bio-Oss Bone Graft 0.5g หมดอายุใน 60 วัน',
    time: '1 ชั่วโมงที่แล้ว',
    read: false,
    icon: AlertTriangle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    id: '3',
    type: 'case',
    title: 'เคสวันนี้',
    message: 'มี 3 เคสที่นัดหมายวันนี้',
    time: '3 ชั่วโมงที่แล้ว',
    read: true,
    icon: Calendar,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    id: '4',
    type: 'transfer',
    title: 'รอคืนของ',
    message: 'TR-2026-0001 เกินกำหนดคืน 2 วัน',
    time: '1 วันที่แล้ว',
    read: true,
    icon: ArrowLeftRight,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
]

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">การแจ้งเตือน</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const Icon = notification.icon
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition-colors ${
                        !notification.read ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${notification.iconBg} flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className={`w-5 h-5 ${notification.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p
                                className={`text-sm ${
                                  !notification.read ? 'font-semibold text-slate-900' : 'text-slate-700'
                                }`}
                              >
                                {notification.title}
                              </p>
                              <p className="text-sm text-slate-500 mt-0.5">{notification.message}</p>
                              <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                  title="ทำเครื่องหมายว่าอ่านแล้ว"
                                >
                                  <Check className="w-4 h-4 text-slate-400" />
                                </button>
                              )}
                              <button
                                onClick={() => removeNotification(notification.id)}
                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                                title="ลบ"
                              >
                                <X className="w-4 h-4 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => {
                setIsOpen(false)
                alert('ไปยังหน้าการแจ้งเตือนทั้งหมด')
              }}
              className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium text-center rounded-lg hover:bg-slate-100 transition-colors"
            >
              ดูการแจ้งเตือนทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
