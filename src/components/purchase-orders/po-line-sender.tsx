'use client'

import { useState } from 'react'
import { Send, Loader2, Check, AlertCircle, MessageSquare } from 'lucide-react'

interface POLineSenderProps {
  poId: string
  poNumber: string
  supplierId: string
  supplierName: string
  hasLineContact: boolean
  alreadySent: boolean
  onSent?: () => void
}

export function POLineSender({
  poId,
  poNumber,
  supplierId,
  supplierName,
  hasLineContact,
  alreadySent,
  onSent
}: POLineSenderProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(alreadySent)
  const [error, setError] = useState<string | null>(null)
  const [showMessageType, setShowMessageType] = useState(false)

  const handleSend = async (messageType: 'urgent_order' | 'normal_order' = 'normal_order') => {
    if (!hasLineContact) {
      alert('Supplier นี้ยังไม่มี LINE Contact กรุณาเพิ่มใน Settings ก่อน')
      return
    }

    if (sent && !confirm('ข้อความถูกส่งไปแล้ว ต้องการส่งอีกครั้ง?')) {
      return
    }

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/line/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          po_id: poId,
          supplier_id: supplierId,
          message_type: messageType
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setSent(true)
      setShowMessageType(false)
      
      if (onSent) {
        onSent()
      }

      alert(`✅ ส่งข้อความสำเร็จ!\n\nPO: ${poNumber}\nSupplier: ${supplierName}\nส่งไปยัง: ${data.sent_to}/${data.total_contacts} contacts`)

    } catch (err: any) {
      setError(err.message)
      console.error('Error sending LINE message:', err)
    } finally {
      setSending(false)
    }
  }

  if (!hasLineContact) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <AlertCircle className="w-4 h-4" />
        <span>ยังไม่มี LINE Contact</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {showMessageType ? (
        <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
          <button
            onClick={() => handleSend('urgent_order')}
            disabled={sending}
            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 rounded-lg flex items-center gap-2 text-red-600"
          >
            🚨 คำสั่งซื้อด่วน
          </button>
          <button
            onClick={() => handleSend('normal_order')}
            disabled={sending}
            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg flex items-center gap-2 text-blue-600"
          >
            📦 คำสั่งซื้อปกติ
          </button>
          <button
            onClick={() => setShowMessageType(false)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-lg text-slate-600 border-t border-slate-100 mt-1"
          >
            ยกเลิก
          </button>
        </div>
      ) : null}

      <button
        onClick={() => setShowMessageType(true)}
        disabled={sending}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          sent
            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            : 'bg-green-600 text-white hover:bg-green-700'
        } disabled:opacity-50`}
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            กำลังส่ง...
          </>
        ) : sent ? (
          <>
            <Check className="w-4 h-4" />
            ส่งแล้ว
            <MessageSquare className="w-4 h-4" />
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            ส่ง LINE
          </>
        )}
      </button>

      {error && (
        <div className="absolute right-0 top-full mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 max-w-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">ส่งข้อความไม่สำเร็จ</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
