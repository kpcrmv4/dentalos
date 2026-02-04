import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LineMessage {
  type: 'text' | 'flex'
  text?: string
  altText?: string
  contents?: unknown
}

interface LineSettings {
  channel_access_token: string
  message_templates: Record<string, string>
}

interface POItem {
  product: { name: string; ref_code: string | null }
  quantity_ordered: number
}

interface PurchaseOrder {
  po_number: string
  expected_delivery_date: string | null
  items: POItem[]
}

interface SupplierContact {
  id: string
  line_user_id: string | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get request body
    const body = await request.json()
    const { po_id, supplier_id, message_type = 'normal_order' } = body

    // Get LINE settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('line_settings')
      .select('*')
      .single()

    const settings = settingsData as LineSettings | null

    if (settingsError || !settings || !settings.channel_access_token) {
      return NextResponse.json(
        { error: 'LINE API not configured' },
        { status: 400 }
      )
    }

    // Get PO details
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers (*),
        items:purchase_order_items (
          *,
          product:products (*)
        )
      `)
      .eq('id', po_id)
      .single()

    const po = poData as PurchaseOrder | null

    if (poError || !po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Get supplier LINE contacts
    const { data: contactsData, error: contactsError } = await supabase
      .from('supplier_line_contacts')
      .select('*')
      .eq('supplier_id', supplier_id)
      .eq('is_active', true)
      .order('contact_type', { ascending: true }) // primary first

    const contacts = contactsData as SupplierContact[] | null

    if (contactsError || !contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No active LINE contact found for this supplier' },
        { status: 404 }
      )
    }

    // Build message from template
    const template = settings.message_templates[message_type] || settings.message_templates.normal_order
    
    // Format items list
    const itemsList = po.items
      .map((item: POItem, index: number) => 
        `${index + 1}. ${item.product.name} x${item.quantity_ordered} (${item.product.ref_code || '-'})`
      )
      .join('\n')

    // Replace template variables
    let message = template
      .replace('{po_number}', po.po_number)
      .replace('{items}', itemsList)
      .replace('{delivery_date}', po.expected_delivery_date || 'ไม่ระบุ')

    // Prepare LINE message
    const lineMessage: LineMessage = {
      type: 'text',
      text: message
    }

    // Send to all active contacts
    const sendPromises = contacts.map(async (contact) => {
      if (!contact.line_user_id) return null

      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.channel_access_token}`
        },
        body: JSON.stringify({
          to: contact.line_user_id,
          messages: [lineMessage]
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`Failed to send to ${contact.line_user_id}:`, error)
        return { success: false, contact_id: contact.id, error }
      }

      return { success: true, contact_id: contact.id }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r?.success).length

    // Update PO to mark LINE message as sent
    if (successCount > 0) {
      await supabase
        .from('purchase_orders')
        .update({
          line_message_sent: true,
          line_message_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', po_id)
    }

    return NextResponse.json({
      success: true,
      sent_to: successCount,
      total_contacts: contacts.length,
      results
    })

  } catch (error) {
    console.error('Error sending LINE message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
