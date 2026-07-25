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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bids: {
        Row: {
          assembly_date: string | null
          bid_type: string
          bid_value: number | null
          client_name: string
          company_id: string | null
          company_name: string | null
          created_at: string | null
          id: string
          observations: string | null
          percentage: number | null
          quota_id: string | null
          status: string
        }
        Insert: {
          assembly_date?: string | null
          bid_type: string
          bid_value?: number | null
          client_name: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          observations?: string | null
          percentage?: number | null
          quota_id?: string | null
          status?: string
        }
        Update: {
          assembly_date?: string | null
          bid_type?: string
          bid_value?: number | null
          client_name?: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          observations?: string | null
          percentage?: number | null
          quota_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_time: string | null
          created_at: string | null
          id: string
          lead_name: string
          result: string
          user_id: string | null
        }
        Insert: {
          call_time?: string | null
          created_at?: string | null
          id?: string
          lead_name: string
          result: string
          user_id?: string | null
        }
        Update: {
          call_time?: string | null
          created_at?: string | null
          id?: string
          lead_name?: string
          result?: string
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_calls: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          observations: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          observations?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          observations?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_calls_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_history: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archived_at: string | null
          available_down_payment: number | null
          created_at: string
          created_by: string
          decides_alone: string | null
          desired_credit_value: number | null
          desired_installment: number | null
          has_restriction: string | null
          id: string
          income: number | null
          interest: string
          is_archived: boolean
          name: string
          next_follow_up_at: string | null
          normalized_phone: string
          notes: string | null
          phone: string
          profession: string | null
          responsible_user_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          available_down_payment?: number | null
          created_at?: string
          created_by: string
          decides_alone?: string | null
          desired_credit_value?: number | null
          desired_installment?: number | null
          has_restriction?: string | null
          id?: string
          income?: number | null
          interest: string
          is_archived?: boolean
          name: string
          next_follow_up_at?: string | null
          normalized_phone: string
          notes?: string | null
          phone: string
          profession?: string | null
          responsible_user_id: string
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          available_down_payment?: number | null
          created_at?: string
          created_by?: string
          decides_alone?: string | null
          desired_credit_value?: number | null
          desired_installment?: number | null
          has_restriction?: string | null
          id?: string
          income?: number | null
          interest?: string
          is_archived?: boolean
          name?: string
          next_follow_up_at?: string | null
          normalized_phone?: string
          notes?: string | null
          phone?: string
          profession?: string | null
          responsible_user_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads_distribution: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string
          date: string
          id: string
          observations: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by: string
          date?: string
          id?: string
          observations?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          observations?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_distribution_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_distribution_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          archived: boolean
          city: string | null
          consultant: string
          created_at: string
          date: string
          down_payment: string | null
          funnel_stage: string | null
          id: string
          installment: string | null
          lead_name: string
          marking_type: string
          meeting_type: string
          notes: string | null
          phone: string
          pre_seller: string
          restriction: string
          sale_date: string | null
          status: string
          status_history: string[] | null
          time: string
          trigger: string
          user_id: string | null
        }
        Insert: {
          archived?: boolean
          city?: string | null
          consultant: string
          created_at?: string
          date: string
          down_payment?: string | null
          funnel_stage?: string | null
          id?: string
          installment?: string | null
          lead_name: string
          marking_type?: string
          meeting_type?: string
          notes?: string | null
          phone: string
          pre_seller: string
          restriction?: string
          sale_date?: string | null
          status?: string
          status_history?: string[] | null
          time: string
          trigger?: string
          user_id?: string | null
        }
        Update: {
          archived?: boolean
          city?: string | null
          consultant?: string
          created_at?: string
          date?: string
          down_payment?: string | null
          funnel_stage?: string | null
          id?: string
          installment?: string | null
          lead_name?: string
          marking_type?: string
          meeting_type?: string
          notes?: string | null
          phone?: string
          pre_seller?: string
          restriction?: string
          sale_date?: string | null
          status?: string
          status_history?: string[] | null
          time?: string
          trigger?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mia_usage_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          detected_domain: string | null
          detected_intent: string | null
          error_message: string | null
          filters_used: Json | null
          id: string
          question: string
          response_summary: string | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          detected_domain?: string | null
          detected_intent?: string | null
          error_message?: string | null
          filters_used?: Json | null
          id?: string
          question: string
          response_summary?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          detected_domain?: string | null
          detected_intent?: string | null
          error_message?: string | null
          filters_used?: Json | null
          id?: string
          question?: string
          response_summary?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mia_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          meeting_id: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operational_leads: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string
          date: string
          id: string
          observations: string | null
          source: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by: string
          date?: string
          id?: string
          observations?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          observations?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          assigned_user_id: string
          available_down_payment: string | null
          city: string | null
          contact_attempts: number
          created_at: string
          created_by: string
          desired_installment: string | null
          desired_value: string | null
          id: string
          import_batch_id: string | null
          last_contact_date: string | null
          lead_name: string | null
          notes: string | null
          ocr_raw_text: string | null
          opportunity_type: string | null
          phone: string | null
          status: string
          updated_at: string
          vehicle_or_property: string | null
        }
        Insert: {
          assigned_user_id: string
          available_down_payment?: string | null
          city?: string | null
          contact_attempts?: number
          created_at?: string
          created_by: string
          desired_installment?: string | null
          desired_value?: string | null
          id?: string
          import_batch_id?: string | null
          last_contact_date?: string | null
          lead_name?: string | null
          notes?: string | null
          ocr_raw_text?: string | null
          opportunity_type?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          vehicle_or_property?: string | null
        }
        Update: {
          assigned_user_id?: string
          available_down_payment?: string | null
          city?: string | null
          contact_attempts?: number
          created_at?: string
          created_by?: string
          desired_installment?: string | null
          desired_value?: string | null
          id?: string
          import_batch_id?: string | null
          last_contact_date?: string | null
          lead_name?: string | null
          notes?: string | null
          ocr_raw_text?: string | null
          opportunity_type?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          vehicle_or_property?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_goal_progress: {
        Row: {
          amount: number
          end_date: string
          id: string
          month: string | null
          start_date: string
          target_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          end_date: string
          id?: string
          month?: string | null
          start_date: string
          target_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          end_date?: string
          id?: string
          month?: string | null
          start_date?: string
          target_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      period_goals: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          month: string | null
          split_count: number | null
          start_date: string
          status: string
          total_goal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          month?: string | null
          split_count?: number | null
          start_date: string
          status?: string
          total_goal?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          month?: string | null
          split_count?: number | null
          start_date?: string
          status?: string
          total_goal?: number
          updated_at?: string
        }
        Relationships: []
      }
      production_sales: {
        Row: {
          created_at: string | null
          id: string
          product_name: string
          production_date: string
          quantity: number
          total_price: number | null
          unit_price: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_name: string
          production_date: string
          quantity: number
          total_price?: number | null
          unit_price: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_name?: string
          production_date?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          is_blocked: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          is_blocked?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_blocked?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quotas: {
        Row: {
          client_name: string
          company_id: string | null
          company_name: string | null
          created_at: string | null
          credit_value: number | null
          group_number: string | null
          id: string
          installment_value: number | null
          phone: string | null
          quota_number: string | null
          sale_id: string | null
          seller_id: string
          seller_name: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          client_name: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          credit_value?: number | null
          group_number?: string | null
          id?: string
          installment_value?: number | null
          phone?: string | null
          quota_number?: string | null
          sale_id?: string | null
          seller_id: string
          seller_name?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          client_name?: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          credit_value?: number | null
          group_number?: string | null
          id?: string
          installment_value?: number | null
          phone?: string | null
          quota_number?: string | null
          sale_id?: string | null
          seller_id?: string
          seller_name?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recognitions: {
        Row: {
          admin_user_id: string
          created_at: string
          goal_progress_id: string | null
          id: string
          message: string
          metric_label: string | null
          metric_value: string | null
          recipient_user_id: string
          seen_at: string | null
          title: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          goal_progress_id?: string | null
          id?: string
          message: string
          metric_label?: string | null
          metric_value?: string | null
          recipient_user_id: string
          seen_at?: string | null
          title: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          goal_progress_id?: string | null
          id?: string
          message?: string
          metric_label?: string | null
          metric_value?: string | null
          recipient_user_id?: string
          seen_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognitions_goal_progress_id_fkey"
            columns: ["goal_progress_id"]
            isOneToOne: false
            referencedRelation: "period_goal_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_funnel_days: {
        Row: {
          created_at: string | null
          date: string
          id: string
          total_leads_captured: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          total_leads_captured?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          total_leads_captured?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_funnel_distribution: {
        Row: {
          appointments_made: number | null
          calls_made: number | null
          created_at: string | null
          day_id: string | null
          id: string
          leads_received: number | null
          negotiations_started: number | null
          sales_completed: number | null
          updated_at: string | null
          user_id: string | null
          visits_completed: number | null
        }
        Insert: {
          appointments_made?: number | null
          calls_made?: number | null
          created_at?: string | null
          day_id?: string | null
          id?: string
          leads_received?: number | null
          negotiations_started?: number | null
          sales_completed?: number | null
          updated_at?: string | null
          user_id?: string | null
          visits_completed?: number | null
        }
        Update: {
          appointments_made?: number | null
          calls_made?: number | null
          created_at?: string | null
          day_id?: string | null
          id?: string
          leads_received?: number | null
          negotiations_started?: number | null
          sales_completed?: number | null
          updated_at?: string | null
          user_id?: string | null
          visits_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_funnel_distribution_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "sales_funnel_days"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_to_status_history: {
        Args: { _meeting_id: string; _new_status: string }
        Returns: string[]
      }
      get_occupied_slots: {
        Args: { _date: string }
        Returns: {
          lead_name: string
          meeting_id: string
          slot_time: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "pre_seller"
        | "seller"
        | "consultant"
        | "commercial_manager"
        | "admin_assistant"
      opportunity_status:
        | "not_contacted"
        | "answered"
        | "not_answered"
        | "scheduled"
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
      app_role: [
        "admin",
        "pre_seller",
        "seller",
        "consultant",
        "commercial_manager",
        "admin_assistant",
      ],
      opportunity_status: [
        "not_contacted",
        "answered",
        "not_answered",
        "scheduled",
      ],
    },
  },
} as const
