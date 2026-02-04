// Dental Implant Management - Database Types
// Generated from SQL migrations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role_id: number
          full_name: string
          avatar_url: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role_id?: number
          full_name: string
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role_id?: number
          full_name?: string
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            referencedRelation: "roles"
            referencedColumns: ["id"]
          }
        ]
      }
      roles: {
        Row: {
          id: number
          name: string
          display_name: string
          permissions: Json
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          display_name: string
          permissions?: Json
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          display_name?: string
          permissions?: Json
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      suppliers: {
        Row: {
          id: string
          code: string | null
          name: string
          contact_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          lead_time_days: number
          payment_terms: string | null
          score: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code?: string | null
          name: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          lead_time_days?: number
          payment_terms?: string | null
          score?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string | null
          name?: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          lead_time_days?: number
          payment_terms?: string | null
          score?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          supplier_id: string | null
          category_id: string | null
          sku: string | null
          ref_code: string | null
          name: string
          display_name: string | null
          brand: string | null
          model: string | null
          size: string | null
          unit: string
          reorder_point: number
          standard_cost: number | null
          is_active: boolean
          search_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id?: string | null
          category_id?: string | null
          sku?: string | null
          ref_code?: string | null
          name: string
          display_name?: string | null
          brand?: string | null
          model?: string | null
          size?: string | null
          unit?: string
          reorder_point?: number
          standard_cost?: number | null
          is_active?: boolean
          search_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string | null
          category_id?: string | null
          sku?: string | null
          ref_code?: string | null
          name?: string
          display_name?: string | null
          brand?: string | null
          model?: string | null
          size?: string | null
          unit?: string
          reorder_point?: number
          standard_cost?: number | null
          is_active?: boolean
          search_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      product_attributes: {
        Row: {
          id: string
          product_id: string
          attribute_key: string
          attribute_value: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          attribute_key: string
          attribute_value: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          attribute_key?: string
          attribute_value?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_items: {
        Row: {
          id: string
          product_id: string
          lot_number: string
          expiry_date: string | null
          quantity: number
          reserved_quantity: number
          cost_price: number | null
          location: string | null
          received_at: string
          received_by: string | null
          invoice_number: string | null
          purchase_order_id: string | null
          po_item_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          lot_number: string
          expiry_date?: string | null
          quantity?: number
          reserved_quantity?: number
          cost_price?: number | null
          location?: string | null
          received_at?: string
          received_by?: string | null
          invoice_number?: string | null
          purchase_order_id?: string | null
          po_item_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          lot_number?: string
          expiry_date?: string | null
          quantity?: number
          reserved_quantity?: number
          cost_price?: number | null
          location?: string | null
          received_at?: string
          received_by?: string | null
          invoice_number?: string | null
          purchase_order_id?: string | null
          po_item_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_received_by_fkey"
            columns: ["received_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      patients: {
        Row: {
          id: string
          hn_number: string | null
          full_name: string
          phone: string | null
          email: string | null
          date_of_birth: string | null
          allergies: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hn_number?: string | null
          full_name: string
          phone?: string | null
          email?: string | null
          date_of_birth?: string | null
          allergies?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hn_number?: string | null
          full_name?: string
          phone?: string | null
          email?: string | null
          date_of_birth?: string | null
          allergies?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          id: string
          case_number: string | null
          patient_id: string
          dentist_id: string
          assistant_id: string | null
          scheduled_date: string
          scheduled_time: string | null
          procedure_type: string | null
          traffic_light: string
          status: string
          notes: string | null
          photo_evidence: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_number?: string | null
          patient_id: string
          dentist_id: string
          assistant_id?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          procedure_type?: string | null
          traffic_light?: string
          status?: string
          notes?: string | null
          photo_evidence?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_number?: string | null
          patient_id?: string
          dentist_id?: string
          assistant_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          procedure_type?: string | null
          traffic_light?: string
          status?: string
          notes?: string | null
          photo_evidence?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_patient_id_fkey"
            columns: ["patient_id"]
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_dentist_id_fkey"
            columns: ["dentist_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_assistant_id_fkey"
            columns: ["assistant_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reservations: {
        Row: {
          id: string
          case_id: string
          stock_item_id: string
          original_stock_item_id: string | null
          quantity: number
          status: string
          reserved_by: string
          reserved_at: string
          used_at: string | null
          used_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancel_reason: string | null
        }
        Insert: {
          id?: string
          case_id: string
          stock_item_id: string
          original_stock_item_id?: string | null
          quantity?: number
          status?: string
          reserved_by: string
          reserved_at?: string
          used_at?: string | null
          used_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancel_reason?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          stock_item_id?: string
          original_stock_item_id?: string | null
          quantity?: number
          status?: string
          reserved_by?: string
          reserved_at?: string
          used_at?: string | null
          used_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancel_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_stock_item_id_fkey"
            columns: ["stock_item_id"]
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_original_stock_item_id_fkey"
            columns: ["original_stock_item_id"]
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_reserved_by_fkey"
            columns: ["reserved_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_used_by_fkey"
            columns: ["used_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      case_materials: {
        Row: {
          id: string
          case_id: string
          reservation_id: string | null
          product_id: string
          lot_number: string
          quantity_used: number
          photo_url: string
          notes: string | null
          used_at: string
          used_by: string
        }
        Insert: {
          id?: string
          case_id: string
          reservation_id?: string | null
          product_id: string
          lot_number: string
          quantity_used?: number
          photo_url: string
          notes?: string | null
          used_at?: string
          used_by: string
        }
        Update: {
          id?: string
          case_id?: string
          reservation_id?: string | null
          product_id?: string
          lot_number?: string
          quantity_used?: number
          photo_url?: string
          notes?: string | null
          used_at?: string
          used_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_materials_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_materials_reservation_id_fkey"
            columns: ["reservation_id"]
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_materials_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_materials_used_by_fkey"
            columns: ["used_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          supplier_id: string
          status: string
          ordered_at: string | null
          expected_at: string | null
          received_at: string | null
          invoice_number: string | null
          total_amount: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_number: string
          supplier_id: string
          status?: string
          ordered_at?: string | null
          expected_at?: string | null
          received_at?: string | null
          invoice_number?: string | null
          total_amount?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_number?: string
          supplier_id?: string
          status?: string
          ordered_at?: string | null
          expected_at?: string | null
          received_at?: string | null
          invoice_number?: string | null
          total_amount?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      po_items: {
        Row: {
          id: string
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received: number
          unit_price: number | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_price?: number | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          po_id?: string
          product_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_price?: number | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          target_user_id: string | null
          type: string
          title: string
          message: string
          related_entity_type: string | null
          related_entity_id: string | null
          is_read: boolean
          priority: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          target_user_id?: string | null
          type: string
          title: string
          message: string
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          priority?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          target_user_id?: string | null
          type?: string
          title?: string
          message?: string
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          priority?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      out_of_stock_requests: {
        Row: {
          id: string
          case_id: string
          product_id: string
          quantity_requested: number
          status: string
          requested_by: string
          requested_at: string
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
        }
        Insert: {
          id?: string
          case_id: string
          product_id: string
          quantity_requested: number
          status?: string
          requested_by: string
          requested_at?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          product_id?: string
          quantity_requested?: number
          status?: string
          requested_by?: string
          requested_at?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "out_of_stock_requests_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "out_of_stock_requests_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "out_of_stock_requests_requested_by_fkey"
            columns: ["requested_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "out_of_stock_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_receives: {
        Row: {
          id: string
          invoice_number: string | null
          supplier_id: string | null
          received_date: string
          total_amount: number | null
          notes: string | null
          received_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_number?: string | null
          supplier_id?: string | null
          received_date?: string
          total_amount?: number | null
          notes?: string | null
          received_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string | null
          supplier_id?: string | null
          received_date?: string
          total_amount?: number | null
          notes?: string | null
          received_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receives_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receives_received_by_fkey"
            columns: ["received_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_receive_items: {
        Row: {
          id: string
          stock_receive_id: string
          product_id: string
          quantity: number
          unit_cost: number | null
          lot_number: string
          expiry_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stock_receive_id: string
          product_id: string
          quantity: number
          unit_cost?: number | null
          lot_number: string
          expiry_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stock_receive_id?: string
          product_id?: string
          quantity?: number
          unit_cost?: number | null
          lot_number?: string
          expiry_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receive_items_stock_receive_id_fkey"
            columns: ["stock_receive_id"]
            referencedRelation: "stock_receives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receive_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      category_attribute_templates: {
        Row: {
          id: string
          category_id: string
          attribute_key: string
          display_name: string
          input_type: string
          options: Json | null
          is_required: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          attribute_key: string
          display_name: string
          input_type?: string
          options?: Json | null
          is_required?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          attribute_key?: string
          display_name?: string
          input_type?: string
          options?: Json | null
          is_required?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_attribute_templates_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      line_contacts: {
        Row: {
          id: string
          user_id: string | null
          line_user_id: string
          display_name: string | null
          picture_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          line_user_id: string
          display_name?: string | null
          picture_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          line_user_id?: string
          display_name?: string | null
          picture_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_contacts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // =====================================================
      // Reservation Functions
      // =====================================================
      reserve_stock: {
        Args: {
          p_case_id: string
          p_product_id: string
          p_quantity: number
          p_user_id: string
        }
        Returns: string
      }
      use_reserved_stock: {
        Args: {
          p_reservation_id: string
          p_photo_url: string | null
          p_user_id: string | null
        }
        Returns: string
      }
      partial_use_reservation: {
        Args: {
          p_reservation_id: string
          p_quantity_used: number
          p_photo_url: string | null
          p_reason: string | null
          p_user_id: string | null
        }
        Returns: string
      }
      cancel_reservation: {
        Args: {
          p_reservation_id: string
          p_reason: string | null
          p_user_id: string | null
        }
        Returns: boolean
      }
      swap_reservation_stock: {
        Args: {
          p_reservation_id: string
          p_new_stock_item_id: string
          p_reason: string | null
          p_user_id: string | null
        }
        Returns: string
      }
      steal_reservation: {
        Args: {
          p_from_reservation_id: string
          p_to_case_id: string
          p_reason: string | null
          p_user_id: string | null
        }
        Returns: string
      }
      use_unreserved_stock: {
        Args: {
          p_case_id: string
          p_stock_item_id: string
          p_quantity: number
          p_photo_url: string | null
          p_user_id: string | null
        }
        Returns: string
      }
      get_available_stock_for_swap: {
        Args: {
          p_reservation_id: string
        }
        Returns: {
          stock_item_id: string
          lot_number: string
          expiry_date: string | null
          available_quantity: number
          is_same_lot: boolean
        }[]
      }
      
      // =====================================================
      // Case Functions
      // =====================================================
      update_case_traffic_light: {
        Args: {
          p_case_id: string
        }
        Returns: undefined
      }
      
      // =====================================================
      // Smart Search Functions
      // =====================================================
      search_products: {
        Args: {
          p_search_term: string | null
          p_category_id: string | null
          p_supplier_id: string | null
          p_limit: number | null
        }
        Returns: {
          id: string
          name: string
          display_name: string | null
          brand: string | null
          ref_code: string | null
          category_id: string | null
          category_name: string | null
          supplier_name: string | null
          attributes: Json
        }[]
      }
      search_products_with_stock: {
        Args: {
          p_search_term: string | null
          p_category_id: string | null
          p_supplier_id: string | null
          p_limit: number | null
        }
        Returns: {
          id: string
          name: string
          display_name: string | null
          brand: string | null
          ref_code: string | null
          category_id: string | null
          category_name: string | null
          supplier_name: string | null
          attributes: Json
          stock_items: Json
          total_available: number
          earliest_expiry: string | null
          days_until_expiry: number | null
        }[]
      }
      find_similar_products: {
        Args: {
          p_product_id: string
          p_limit: number | null
        }
        Returns: {
          id: string
          name: string
          display_name: string | null
          brand: string | null
          ref_code: string | null
          category_id: string | null
          category_name: string | null
          supplier_name: string | null
          attributes: Json
          stock_items: Json
          total_available: number
          earliest_expiry: string | null
          days_until_expiry: number | null
          similarity_score: number
          similarity_reason: string
        }[]
      }
      get_fefo_stock_recommendation: {
        Args: {
          p_product_id: string
          p_quantity: number
        }
        Returns: {
          stock_item_id: string
          lot_number: string
          expiry_date: string | null
          available_quantity: number
          recommended_quantity: number
          days_until_expiry: number | null
        }[]
      }
      search_products_autocomplete: {
        Args: {
          p_search_term: string
          p_limit: number | null
        }
        Returns: {
          id: string
          name: string
          display_name: string | null
          brand: string | null
          ref_code: string | null
          category_name: string | null
          total_available: number
        }[]
      }
      check_duplicate_product: {
        Args: {
          p_name: string
          p_brand: string | null
          p_ref_code: string | null
          p_supplier_id: string | null
          p_exclude_id: string | null
        }
        Returns: {
          id: string
          name: string
          brand: string | null
          ref_code: string | null
          supplier_name: string | null
          similarity_type: string
        }[]
      }
      
      // =====================================================
      // Out of Stock Request Functions
      // =====================================================
      request_out_of_stock_item: {
        Args: {
          p_case_id: string
          p_product_id: string
          p_quantity: number
          p_notes: string | null
          p_user_id: string
        }
        Returns: string
      }
      get_pending_oos_requests: {
        Args: Record<string, never>
        Returns: {
          id: string
          case_id: string
          case_number: string
          patient_name: string
          surgery_date: string
          product_id: string
          product_name: string
          product_ref: string | null
          quantity_requested: number
          requested_by_name: string
          requested_at: string
          notes: string | null
          days_until_surgery: number
        }[]
      }
      create_po_from_oos_requests: {
        Args: {
          p_request_ids: string[]
          p_supplier_id: string
          p_user_id: string
        }
        Returns: string
      }
      
      // =====================================================
      // PO Receive Functions
      // =====================================================
      get_po_items_for_receive: {
        Args: {
          p_po_id: string
        }
        Returns: {
          po_item_id: string
          product_id: string
          product_name: string
          product_ref_code: string | null
          product_brand: string | null
          quantity_ordered: number
          quantity_received: number
          quantity_remaining: number
          unit_price: number | null
          status: string
        }[]
      }
      receive_from_purchase_order: {
        Args: {
          p_po_id: string
          p_received_by: string
          p_items: Json
          p_invoice_number: string | null
        }
        Returns: Json
      }
      auto_allocate_received_stock: {
        Args: {
          p_stock_item_id: string
        }
        Returns: Json
      }
      
      // =====================================================
      // Dentist Dashboard Functions
      // =====================================================
      get_dentist_stats: {
        Args: {
          p_dentist_id: string
          p_start_date: string | null
          p_end_date: string | null
        }
        Returns: Json
      }
      get_new_assigned_cases: {
        Args: {
          p_dentist_id: string
          p_limit: number | null
        }
        Returns: {
          case_id: string
          patient_name: string
          patient_hn: string | null
          surgery_date: string
          surgery_time: string | null
          procedure_type: string | null
          case_notes: string | null
          assigned_at: string
          days_until_surgery: number
          has_reservation: boolean
        }[]
      }
      get_action_required_cases: {
        Args: {
          p_dentist_id: string
          p_limit: number | null
        }
        Returns: {
          case_id: string
          patient_name: string
          surgery_date: string
          action_type: string
          action_description: string
          priority: string
          traffic_light: string
        }[]
      }
      get_dentist_cases_calendar: {
        Args: {
          p_dentist_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          case_id: string
          patient_name: string
          patient_hn: string | null
          surgery_date: string
          surgery_time: string | null
          procedure_type: string | null
          case_notes: string | null
          status: string
          traffic_light: string
          reservation_count: number
          total_items_reserved: number
          items_ready: number
        }[]
      }
      get_dentist_cases_by_date: {
        Args: {
          p_dentist_id: string
          p_date: string
        }
        Returns: {
          case_id: string
          patient_name: string
          patient_hn: string | null
          patient_phone: string | null
          surgery_time: string | null
          procedure_type: string | null
          case_notes: string | null
          status: string
          traffic_light: string
          notes: string | null
          reservations: Json
        }[]
      }
      get_frequently_used_products: {
        Args: {
          p_dentist_id: string
          p_limit: number | null
          p_months: number | null
        }
        Returns: {
          product_id: string
          product_name: string
          product_ref: string | null
          product_brand: string | null
          category_name: string | null
          usage_count: number
          total_quantity: number
          last_used: string
        }[]
      }
      get_dentist_performance: {
        Args: {
          p_dentist_id: string
          p_start_date: string | null
          p_end_date: string | null
        }
        Returns: Json
      }
      get_calendar_summary: {
        Args: {
          p_dentist_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: Json
      }
      
      // =====================================================
      // Daily Maintenance Functions
      // =====================================================
      run_daily_maintenance: {
        Args: Record<string, never>
        Returns: Json
      }
      daily_update_traffic_lights: {
        Args: Record<string, never>
        Returns: number
      }
      daily_notify_today_cases: {
        Args: Record<string, never>
        Returns: number
      }
      daily_notify_inventory_issues: {
        Args: Record<string, never>
        Returns: number
      }
      daily_notify_expiring_items: {
        Args: Record<string, never>
        Returns: number
      }
      daily_notify_overdue_po: {
        Args: Record<string, never>
        Returns: number
      }
      daily_check_dead_stock: {
        Args: Record<string, never>
        Returns: number
      }
      
      // =====================================================
      // Utility Functions
      // =====================================================
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      generate_product_display_name: {
        Args: {
          p_product_id: string
        }
        Returns: string
      }
      update_product_search_text: {
        Args: {
          p_product_id: string
        }
        Returns: undefined
      }
      generate_po_number: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
