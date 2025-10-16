export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_date: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string
          discount_amount: number | null
          discount_code_id: string | null
          display_id: number
          expires_at: string | null
          final_amount: number
          global_code_id: string | null
          guest_count: number
          id: string
          package_id: string
          payment_status: string | null
          special_requests: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_date: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id: string
          discount_amount?: number | null
          discount_code_id?: string | null
          display_id?: number
          expires_at?: string | null
          final_amount: number
          global_code_id?: string | null
          guest_count?: number
          id?: string
          package_id: string
          payment_status?: string | null
          special_requests?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          booking_date?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string
          discount_amount?: number | null
          discount_code_id?: string | null
          display_id?: number
          expires_at?: string | null
          final_amount?: number
          global_code_id?: string | null
          guest_count?: number
          id?: string
          package_id?: string
          payment_status?: string | null
          special_requests?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_global_code_id_fkey"
            columns: ["global_code_id"]
            isOneToOne: false
            referencedRelation: "global_discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "travel_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          advertiser_id: string
          booking_id: string
          commission_amount: number
          commission_percentage: number
          created_at: string
          discount_code_id: string | null
          id: string
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          booking_id: string
          commission_amount: number
          commission_percentage?: number
          created_at?: string
          discount_code_id?: string | null
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          booking_id?: string
          commission_amount?: number
          commission_percentage?: number
          created_at?: string
          discount_code_id?: string | null
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          advertiser_id: string
          code: string
          commission_rate: number | null
          created_at: string
          current_uses: number | null
          discount_percentage: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          package_id: string | null
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          code: string
          commission_rate?: number | null
          created_at?: string
          current_uses?: number | null
          discount_percentage: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          package_id?: string | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          code?: string
          commission_rate?: number | null
          created_at?: string
          current_uses?: number | null
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          package_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "travel_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      global_discount_codes: {
        Row: {
          code: string
          created_at: string | null
          discount_percentage: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_percentage: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_read: boolean
          message: string
          priority: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          message: string
          priority?: number | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          message?: string
          priority?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      package_advertisers: {
        Row: {
          advertiser_id: string
          created_at: string | null
          travel_package_id: string
        }
        Insert: {
          advertiser_id: string
          created_at?: string | null
          travel_package_id: string
        }
        Update: {
          advertiser_id?: string
          created_at?: string | null
          travel_package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_advertisers_travel_package_id_fkey"
            columns: ["travel_package_id"]
            isOneToOne: false
            referencedRelation: "travel_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          display_id: number
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          display_id?: number
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          display_id?: number
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          package_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          package_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          package_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      travel_packages: {
        Row: {
          advertiser_id: string | null
          available_from: string | null
          available_to: string | null
          created_at: string
          current_bookings: number | null
          description: string | null
          discount_percentage: number | null
          display_id: number
          duration: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          location: string | null
          max_guests: number | null
          mobile_number: string | null
          pdf_url: string | null
          price: number | null
          rating: number | null
          review_count: number | null
          tags: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          advertiser_id?: string | null
          available_from?: string | null
          available_to?: string | null
          created_at?: string
          current_bookings?: number | null
          description?: string | null
          discount_percentage?: number | null
          display_id?: number
          duration?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          max_guests?: number | null
          mobile_number?: string | null
          pdf_url?: string | null
          price?: number | null
          rating?: number | null
          review_count?: number | null
          tags?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string | null
          available_from?: string | null
          available_to?: string | null
          created_at?: string
          current_bookings?: number | null
          description?: string | null
          discount_percentage?: number | null
          display_id?: number
          duration?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          max_guests?: number | null
          mobile_number?: string | null
          pdf_url?: string | null
          price?: number | null
          rating?: number | null
          review_count?: number | null
          tags?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "customer" | "advertiser" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "advertiser", "manager"],
    },
  },
} as const
