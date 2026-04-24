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
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          model: string
          project_id: string
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          model?: string
          project_id: string
          role?: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          model?: string
          project_id?: string
          role?: Database["public"]["Enums"]["message_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_exports: {
        Row: {
          created_at: string
          export_type: Database["public"]["Enums"]["export_type"]
          id: string
          project_id: string
          user_id: string
          zip_url: string | null
        }
        Insert: {
          created_at?: string
          export_type?: Database["public"]["Enums"]["export_type"]
          id?: string
          project_id: string
          user_id: string
          zip_url?: string | null
        }
        Update: {
          created_at?: string
          export_type?: Database["public"]["Enums"]["export_type"]
          id?: string
          project_id?: string
          user_id?: string
          zip_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          model: string | null
          project_id: string | null
          reason: string
          type: Database["public"]["Enums"]["credit_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          model?: string | null
          project_id?: string | null
          reason: string
          type: Database["public"]["Enums"]["credit_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          model?: string | null
          project_id?: string | null
          reason?: string
          type?: Database["public"]["Enums"]["credit_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_audit_logs: {
        Row: {
          accion: string
          archivos: Json
          cambios: Json
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          plan_json: Json
          project_id: string | null
          riesgo: string | null
          status: string
          user_id: string
        }
        Insert: {
          accion: string
          archivos?: Json
          cambios?: Json
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          plan_json: Json
          project_id?: string | null
          riesgo?: string | null
          status?: string
          user_id: string
        }
        Update: {
          accion?: string
          archivos?: Json
          cambios?: Json
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          plan_json?: Json
          project_id?: string | null
          riesgo?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          email: string
          full_name: string | null
          id: string
          is_unlimited: boolean
          plan: Database["public"]["Enums"]["user_plan"]
          updated_at: string
          webcontainers_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email: string
          full_name?: string | null
          id: string
          is_unlimited?: boolean
          plan?: Database["public"]["Enums"]["user_plan"]
          updated_at?: string
          webcontainers_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email?: string
          full_name?: string | null
          id?: string
          is_unlimited?: boolean
          plan?: Database["public"]["Enums"]["user_plan"]
          updated_at?: string
          webcontainers_enabled?: boolean
        }
        Relationships: []
      }
      project_deployments: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          project_id: string
          provider: Database["public"]["Enums"]["deployment_provider"]
          site_id: string | null
          status: Database["public"]["Enums"]["deployment_status"]
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          project_id: string
          provider?: Database["public"]["Enums"]["deployment_provider"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["deployment_status"]
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          project_id?: string
          provider?: Database["public"]["Enums"]["deployment_provider"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["deployment_status"]
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_github_repos: {
        Row: {
          auto_push: boolean
          branch: string
          created_at: string
          html_url: string | null
          id: string
          is_private: boolean
          last_push_error: string | null
          last_pushed_at: string | null
          last_pushed_sha: string | null
          last_pushed_version_id: string | null
          owner: string
          project_id: string
          repo: string
          repo_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_push?: boolean
          branch?: string
          created_at?: string
          html_url?: string | null
          id?: string
          is_private?: boolean
          last_push_error?: string | null
          last_pushed_at?: string | null
          last_pushed_sha?: string | null
          last_pushed_version_id?: string | null
          owner: string
          project_id: string
          repo: string
          repo_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_push?: boolean
          branch?: string
          created_at?: string
          html_url?: string | null
          id?: string
          is_private?: boolean
          last_push_error?: string | null
          last_pushed_at?: string | null
          last_pushed_sha?: string | null
          last_pushed_version_id?: string | null
          owner?: string
          project_id?: string
          repo?: string
          repo_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_knowledge: {
        Row: {
          content: string
          created_at: string
          enabled: boolean
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          enabled?: boolean
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          enabled?: boolean
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_viewed_at: string | null
          pinned_version_id: string | null
          project_id: string
          token: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_viewed_at?: string | null
          pinned_version_id?: string | null
          project_id: string
          token: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_viewed_at?: string | null
          pinned_version_id?: string | null
          project_id?: string
          token?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_pinned_version_id_fkey"
            columns: ["pinned_version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          created_at: string
          generated_files: Json
          id: string
          model_used: string
          output_json: Json | null
          preview_code: string | null
          project_id: string
          prompt: string
          version_number: number
        }
        Insert: {
          created_at?: string
          generated_files?: Json
          id?: string
          model_used?: string
          output_json?: Json | null
          preview_code?: string | null
          project_id: string
          prompt: string
          version_number?: number
        }
        Update: {
          created_at?: string
          generated_files?: Json
          id?: string
          model_used?: string
          output_json?: Json | null
          preview_code?: string | null
          project_id?: string
          prompt?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_mxn: number
          created_at: string
          credits: number
          external_payment_id: string | null
          id: string
          package_name: string
          payment_provider: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount_mxn: number
          created_at?: string
          credits: number
          external_payment_id?: string | null
          id?: string
          package_name: string
          payment_provider?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount_mxn?: number
          created_at?: string
          credits?: number
          external_payment_id?: string | null
          id?: string
          package_name?: string
          payment_provider?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: []
      }
      user_github_tokens: {
        Row: {
          access_token: string
          created_at: string
          github_avatar_url: string | null
          github_login: string
          github_user_id: number | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          github_avatar_url?: string | null
          github_login: string
          github_user_id?: number | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          github_avatar_url?: string | null
          github_login?: string
          github_user_id?: number | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          updated_at: string
          user_id: string
          welcome_credits_granted: boolean
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          updated_at?: string
          user_id: string
          welcome_credits_granted?: boolean
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          updated_at?: string
          user_id?: string
          welcome_credits_granted?: boolean
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      grant_welcome_credits: {
        Args: { _amount?: number; _user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_share_view: { Args: { _token: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      credit_type: "debit" | "credit" | "refund"
      deployment_provider: "netlify" | "vercel" | "custom"
      deployment_status: "pending" | "building" | "live" | "failed"
      export_type: "zip" | "deploy"
      message_role: "user" | "assistant" | "system"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      project_status: "draft" | "active" | "archived"
      user_plan: "free" | "starter" | "pro" | "enterprise"
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
      app_role: ["admin", "moderator", "user"],
      credit_type: ["debit", "credit", "refund"],
      deployment_provider: ["netlify", "vercel", "custom"],
      deployment_status: ["pending", "building", "live", "failed"],
      export_type: ["zip", "deploy"],
      message_role: ["user", "assistant", "system"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      project_status: ["draft", "active", "archived"],
      user_plan: ["free", "starter", "pro", "enterprise"],
    },
  },
} as const
