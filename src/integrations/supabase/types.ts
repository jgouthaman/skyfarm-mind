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
      agrisky_drones: {
        Row: {
          capacity_litres: number | null
          created_at: string
          id: string
          model: string | null
          name: string
          notes: string | null
          serial_no: string | null
          status: string
        }
        Insert: {
          capacity_litres?: number | null
          created_at?: string
          id?: string
          model?: string | null
          name: string
          notes?: string | null
          serial_no?: string | null
          status?: string
        }
        Update: {
          capacity_litres?: number | null
          created_at?: string
          id?: string
          model?: string | null
          name?: string
          notes?: string | null
          serial_no?: string | null
          status?: string
        }
        Relationships: []
      }
      agrisky_farms: {
        Row: {
          created_at: string
          crop: string | null
          farmer: string | null
          id: string
          location: string | null
          name: string
          service_needed: string | null
          size_acres: number | null
        }
        Insert: {
          created_at?: string
          crop?: string | null
          farmer?: string | null
          id?: string
          location?: string | null
          name: string
          service_needed?: string | null
          size_acres?: number | null
        }
        Update: {
          created_at?: string
          crop?: string | null
          farmer?: string | null
          id?: string
          location?: string | null
          name?: string
          service_needed?: string | null
          size_acres?: number | null
        }
        Relationships: []
      }
      agrisky_field_uploads: {
        Row: {
          caption: string | null
          captured_at: string
          created_at: string
          farm_id: string | null
          id: string
          image_url: string
          lat: number | null
          lng: number | null
          mission_id: string | null
          pilot_id: string | null
        }
        Insert: {
          caption?: string | null
          captured_at?: string
          created_at?: string
          farm_id?: string | null
          id?: string
          image_url: string
          lat?: number | null
          lng?: number | null
          mission_id?: string | null
          pilot_id?: string | null
        }
        Update: {
          caption?: string | null
          captured_at?: string
          created_at?: string
          farm_id?: string | null
          id?: string
          image_url?: string
          lat?: number | null
          lng?: number | null
          mission_id?: string | null
          pilot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agrisky_field_uploads_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "agrisky_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agrisky_field_uploads_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "agrisky_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agrisky_field_uploads_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "agrisky_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      agrisky_missions: {
        Row: {
          created_at: string
          drone_id: string | null
          farm_id: string
          id: string
          notes: string | null
          pilot_id: string | null
          scheduled_at: string | null
          service: string
          status: string
        }
        Insert: {
          created_at?: string
          drone_id?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          pilot_id?: string | null
          scheduled_at?: string | null
          service: string
          status?: string
        }
        Update: {
          created_at?: string
          drone_id?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          pilot_id?: string | null
          scheduled_at?: string | null
          service?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agrisky_missions_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "agrisky_drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agrisky_missions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "agrisky_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agrisky_missions_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "agrisky_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      agrisky_pilots: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          status?: string
        }
        Relationships: []
      }
      design_studio_leads: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          location: string
          message: string | null
          organisation: string | null
          phone: string
          plan: string
          role: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          location: string
          message?: string | null
          organisation?: string | null
          phone: string
          plan: string
          role: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          location?: string
          message?: string | null
          organisation?: string | null
          phone?: string
          plan?: string
          role?: string
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_components: {
        Row: {
          created_at: string
          id: string
          payload: Json
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_designs: {
        Row: {
          created_at: string
          id: string
          payload: Json
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_designs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_projects: {
        Row: {
          advisor_messages: Json
          created_at: string
          id: string
          project_name: string
          purpose: string | null
          risk_level: string | null
          status: string
          updated_at: string
          user_type: string | null
          vertical: string
        }
        Insert: {
          advisor_messages?: Json
          created_at?: string
          id?: string
          project_name: string
          purpose?: string | null
          risk_level?: string | null
          status?: string
          updated_at?: string
          user_type?: string | null
          vertical: string
        }
        Update: {
          advisor_messages?: Json
          created_at?: string
          id?: string
          project_name?: string
          purpose?: string | null
          risk_level?: string | null
          status?: string
          updated_at?: string
          user_type?: string | null
          vertical?: string
        }
        Relationships: []
      }
      studio_purposes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      studio_reports: {
        Row: {
          created_at: string
          id: string
          project_id: string
          snapshot: Json
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          snapshot?: Json
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          snapshot?: Json
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_requirements: {
        Row: {
          created_at: string
          id: string
          payload: Json
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_simulations: {
        Row: {
          created_at: string
          finalized: boolean
          id: string
          inputs: Json
          label: string | null
          outcome: Json
          project_id: string
          risk_level: string | null
        }
        Insert: {
          created_at?: string
          finalized?: boolean
          id?: string
          inputs?: Json
          label?: string | null
          outcome?: Json
          project_id: string
          risk_level?: string | null
        }
        Update: {
          created_at?: string
          finalized?: boolean
          id?: string
          inputs?: Json
          label?: string | null
          outcome?: Json
          project_id?: string
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_simulations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_user_types: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      studio_verticals: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "sme"
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
      app_role: ["admin", "sme"],
    },
  },
} as const
