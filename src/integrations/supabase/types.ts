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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      attendances: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          lodge_id: string
          profile_id: string
          session_date: string
          session_type: string
          updated_at: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          lodge_id: string
          profile_id: string
          session_date?: string
          session_type: string
          updated_at?: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          lodge_id?: string
          profile_id?: string
          session_date?: string
          session_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "lodge_members_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_lodge_id_fkey"
            columns: ["lodge_id"]
            isOneToOne: false
            referencedRelation: "lodges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "lodge_members_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_date: string
          created_at: string
          id: string
          name: string
          profile_id: string
        }
        Insert: {
          birth_date: string
          created_at?: string
          id?: string
          name: string
          profile_id: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          id?: string
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "lodge_members_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          lodge_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          lodge_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          lodge_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_lodge_id_fkey"
            columns: ["lodge_id"]
            isOneToOne: false
            referencedRelation: "lodges"
            referencedColumns: ["id"]
          },
        ]
      }
      lodges: {
        Row: {
          city: string | null
          created_at: string
          default_payment_amount: number | null
          id: string
          name: string
          organization_id: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          default_payment_amount?: number | null
          id?: string
          name: string
          organization_id?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          default_payment_amount?: number | null
          id?: string
          name?: string
          organization_id?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lodges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          paid_at: string | null
          payment_method: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          pix_transaction_id: string | null
          profile_id: string
          reference_month: number
          reference_year: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          pix_transaction_id?: string | null
          profile_id: string
          reference_month: number
          reference_year: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          pix_transaction_id?: string | null
          profile_id?: string
          reference_month?: number
          reference_year?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "lodge_members_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agrees_investigation_fee: boolean | null
          aware_no_refund: boolean | null
          believes_supreme_being: boolean | null
          birth_date: string
          can_afford_financial: boolean | null
          cargo: string | null
          cell_phone: string | null
          cep: string | null
          cim_number: string | null
          city: string | null
          civil_status: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          degree: string | null
          education_level: string | null
          email: string | null
          employer: string | null
          employer_phone: string | null
          expectation_masonry: string | null
          father_name: string | null
          full_name: string
          id: string
          identity_issuer: string | null
          identity_number: string | null
          informed_financial_values: boolean | null
          initiation_date: string | null
          is_retired: boolean | null
          lodge_id: string | null
          lodge_position: string | null
          marriage_date: string | null
          member_status: string
          monthly_income: string | null
          mother_name: string | null
          nationality: string | null
          naturality: string | null
          neighborhood: string | null
          number: string | null
          opinion_equality: string | null
          opinion_family: string | null
          opinion_fraternity: string | null
          opinion_freedom: string | null
          opinion_masonry: string | null
          phone: string | null
          photo_url: string | null
          profession: string | null
          proposal_date: string | null
          residence_time: string | null
          sponsor_name: string | null
          spouse_name: string | null
          spouse_profession: string | null
          spouse_retired: boolean | null
          state: string | null
          status: string
          street: string | null
          updated_at: string
          user_id: string | null
          voter_city: string | null
          voter_title: string | null
          voter_zone: string | null
          work_cep: string | null
          work_city: string | null
          work_neighborhood: string | null
          work_state: string | null
          work_street: string | null
          work_time: string | null
        }
        Insert: {
          agrees_investigation_fee?: boolean | null
          aware_no_refund?: boolean | null
          believes_supreme_being?: boolean | null
          birth_date: string
          can_afford_financial?: boolean | null
          cargo?: string | null
          cell_phone?: string | null
          cep?: string | null
          cim_number?: string | null
          city?: string | null
          civil_status?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          degree?: string | null
          education_level?: string | null
          email?: string | null
          employer?: string | null
          employer_phone?: string | null
          expectation_masonry?: string | null
          father_name?: string | null
          full_name: string
          id?: string
          identity_issuer?: string | null
          identity_number?: string | null
          informed_financial_values?: boolean | null
          initiation_date?: string | null
          is_retired?: boolean | null
          lodge_id?: string | null
          lodge_position?: string | null
          marriage_date?: string | null
          member_status?: string
          monthly_income?: string | null
          mother_name?: string | null
          nationality?: string | null
          naturality?: string | null
          neighborhood?: string | null
          number?: string | null
          opinion_equality?: string | null
          opinion_family?: string | null
          opinion_fraternity?: string | null
          opinion_freedom?: string | null
          opinion_masonry?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          proposal_date?: string | null
          residence_time?: string | null
          sponsor_name?: string | null
          spouse_name?: string | null
          spouse_profession?: string | null
          spouse_retired?: boolean | null
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          user_id?: string | null
          voter_city?: string | null
          voter_title?: string | null
          voter_zone?: string | null
          work_cep?: string | null
          work_city?: string | null
          work_neighborhood?: string | null
          work_state?: string | null
          work_street?: string | null
          work_time?: string | null
        }
        Update: {
          agrees_investigation_fee?: boolean | null
          aware_no_refund?: boolean | null
          believes_supreme_being?: boolean | null
          birth_date?: string
          can_afford_financial?: boolean | null
          cargo?: string | null
          cell_phone?: string | null
          cep?: string | null
          cim_number?: string | null
          city?: string | null
          civil_status?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          degree?: string | null
          education_level?: string | null
          email?: string | null
          employer?: string | null
          employer_phone?: string | null
          expectation_masonry?: string | null
          father_name?: string | null
          full_name?: string
          id?: string
          identity_issuer?: string | null
          identity_number?: string | null
          informed_financial_values?: boolean | null
          initiation_date?: string | null
          is_retired?: boolean | null
          lodge_id?: string | null
          lodge_position?: string | null
          marriage_date?: string | null
          member_status?: string
          monthly_income?: string | null
          mother_name?: string | null
          nationality?: string | null
          naturality?: string | null
          neighborhood?: string | null
          number?: string | null
          opinion_equality?: string | null
          opinion_family?: string | null
          opinion_fraternity?: string | null
          opinion_freedom?: string | null
          opinion_masonry?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          proposal_date?: string | null
          residence_time?: string | null
          sponsor_name?: string | null
          spouse_name?: string | null
          spouse_profession?: string | null
          spouse_retired?: boolean | null
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          user_id?: string | null
          voter_city?: string | null
          voter_title?: string | null
          voter_zone?: string | null
          work_cep?: string | null
          work_city?: string | null
          work_neighborhood?: string | null
          work_state?: string | null
          work_street?: string | null
          work_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_lodge_id_fkey"
            columns: ["lodge_id"]
            isOneToOne: false
            referencedRelation: "lodges"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          max_lodges: number
          max_members_per_lodge: number
          name: string
          price_monthly: number
          price_yearly: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_lodges?: number
          max_members_per_lodge?: number
          name: string
          price_monthly?: number
          price_yearly?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_lodges?: number
          max_members_per_lodge?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_edit_profile: boolean
          can_register_attendance: boolean
          can_view_attendance: boolean
          can_view_card: boolean
          can_view_daily_attendances: boolean
          created_at: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          can_edit_profile?: boolean
          can_register_attendance?: boolean
          can_view_attendance?: boolean
          can_view_card?: boolean
          can_view_daily_attendances?: boolean
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          can_edit_profile?: boolean
          can_register_attendance?: boolean
          can_view_attendance?: boolean
          can_view_card?: boolean
          can_view_daily_attendances?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "lodge_members_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      lodge_members_public: {
        Row: {
          birth_date: string | null
          degree: string | null
          full_name: string | null
          id: string | null
          initiation_date: string | null
          lodge_id: string | null
          lodge_position: string | null
          member_status: string | null
          photo_url: string | null
          status: string | null
        }
        Insert: {
          birth_date?: string | null
          degree?: string | null
          full_name?: string | null
          id?: string | null
          initiation_date?: string | null
          lodge_id?: string | null
          lodge_position?: string | null
          member_status?: string | null
          photo_url?: string | null
          status?: string | null
        }
        Update: {
          birth_date?: string | null
          degree?: string | null
          full_name?: string | null
          id?: string | null
          initiation_date?: string | null
          lodge_id?: string | null
          lodge_position?: string | null
          member_status?: string | null
          photo_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_lodge_id_fkey"
            columns: ["lodge_id"]
            isOneToOne: false
            referencedRelation: "lodges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_cim_number: { Args: never; Returns: string }
      generate_monthly_payments_for_all: { Args: never; Returns: undefined }
      get_user_lodge_id: { Args: { _user_id: string }; Returns: string }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
