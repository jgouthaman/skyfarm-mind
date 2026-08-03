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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academy_course_module_progress: {
        Row: {
          completed_at: string
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_course_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_course_module_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "academy_users"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_course_modules: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index: number
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_courses: {
        Row: {
          created_at: string | null
          description: string | null
          hours: number | null
          id: string
          level: string | null
          modules: string[] | null
          order_index: number | null
          outcome: string | null
          prerequisite: string | null
          price: number | null
          project_count: number | null
          slug: string
          status: string | null
          title: string
          vertical: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          level?: string | null
          modules?: string[] | null
          order_index?: number | null
          outcome?: string | null
          prerequisite?: string | null
          price?: number | null
          project_count?: number | null
          slug: string
          status?: string | null
          title: string
          vertical?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          level?: string | null
          modules?: string[] | null
          order_index?: number | null
          outcome?: string | null
          prerequisite?: string | null
          price?: number | null
          project_count?: number | null
          slug?: string
          status?: string | null
          title?: string
          vertical?: string | null
        }
        Relationships: []
      }
      academy_enrollments: {
        Row: {
          course_id: string | null
          enrolled_at: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_module_sections: {
        Row: {
          cached_at: string | null
          cached_content: string | null
          created_at: string | null
          id: string
          module_id: string
          order_index: number
          section_type: string
          title: string
          topic_brief: string
        }
        Insert: {
          cached_at?: string | null
          cached_content?: string | null
          created_at?: string | null
          id?: string
          module_id: string
          order_index: number
          section_type: string
          title: string
          topic_brief: string
        }
        Update: {
          cached_at?: string | null
          cached_content?: string | null
          created_at?: string | null
          id?: string
          module_id?: string
          order_index?: number
          section_type?: string
          title?: string
          topic_brief?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_module_sections_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string | null
          generated_questions: Json
          id: string
          passed: boolean
          score: number
          section_id: string
          total: number
          user_answers: Json
          user_id: string
        }
        Insert: {
          attempt_number?: number
          attempted_at?: string | null
          generated_questions: Json
          id?: string
          passed?: boolean
          score?: number
          section_id: string
          total: number
          user_answers?: Json
          user_id: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string | null
          generated_questions?: Json
          id?: string
          passed?: boolean
          score?: number
          section_id?: string
          total?: number
          user_answers?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_attempts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "academy_module_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "academy_users"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_users: {
        Row: {
          access_url: string | null
          activated_at: string
          course_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          status: string
        }
        Insert: {
          access_url?: string | null
          activated_at?: string
          course_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          status?: string
        }
        Update: {
          access_url?: string | null
          activated_at?: string
          course_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_users_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_waitlist: {
        Row: {
          course_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          notified_at: string | null
          source: string
          status: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          notified_at?: string | null
          source?: string
          status?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          notified_at?: string | null
          source?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_waitlist_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          location: string | null
          message: string | null
          name: string
          organisation: string | null
          phone: string
          source: string
          status: string
          vertical_interest: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          location?: string | null
          message?: string | null
          name: string
          organisation?: string | null
          phone: string
          source?: string
          status?: string
          vertical_interest?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          location?: string | null
          message?: string | null
          name?: string
          organisation?: string | null
          phone?: string
          source?: string
          status?: string
          vertical_interest?: string | null
        }
        Relationships: []
      }
      design_rules: {
        Row: {
          automation_level: string | null
          battery_config: string | null
          budget_range: string | null
          confidence_level: number | null
          cost_max_inr: number | null
          cost_min_inr: number | null
          created_at: string
          created_by: string | null
          drone_type: string | null
          engineer_name: string
          engineer_notes: string | null
          esc_rating: string | null
          fallback_count: number
          flight_controller: string | null
          flight_time_max: number | null
          flight_time_min: number | null
          frame_size: string | null
          gps_type: string | null
          id: string
          last_matched_at: string | null
          match_count: number
          motor_class: string | null
          motor_count: number | null
          payload_max_kg: number | null
          payload_min_kg: number | null
          payload_system: string | null
          propeller_spec: string | null
          purpose: string
          risk_flags: string[] | null
          risk_level: string | null
          rule_name: string | null
          status: string
          terrain_types: string[] | null
          twr_min: number | null
          updated_at: string
          user_type: string | null
          vehicle_type: string
          vertical: string
          wind_condition: string | null
        }
        Insert: {
          automation_level?: string | null
          battery_config?: string | null
          budget_range?: string | null
          confidence_level?: number | null
          cost_max_inr?: number | null
          cost_min_inr?: number | null
          created_at?: string
          created_by?: string | null
          drone_type?: string | null
          engineer_name: string
          engineer_notes?: string | null
          esc_rating?: string | null
          fallback_count?: number
          flight_controller?: string | null
          flight_time_max?: number | null
          flight_time_min?: number | null
          frame_size?: string | null
          gps_type?: string | null
          id?: string
          last_matched_at?: string | null
          match_count?: number
          motor_class?: string | null
          motor_count?: number | null
          payload_max_kg?: number | null
          payload_min_kg?: number | null
          payload_system?: string | null
          propeller_spec?: string | null
          purpose: string
          risk_flags?: string[] | null
          risk_level?: string | null
          rule_name?: string | null
          status?: string
          terrain_types?: string[] | null
          twr_min?: number | null
          updated_at?: string
          user_type?: string | null
          vehicle_type?: string
          vertical: string
          wind_condition?: string | null
        }
        Update: {
          automation_level?: string | null
          battery_config?: string | null
          budget_range?: string | null
          confidence_level?: number | null
          cost_max_inr?: number | null
          cost_min_inr?: number | null
          created_at?: string
          created_by?: string | null
          drone_type?: string | null
          engineer_name?: string
          engineer_notes?: string | null
          esc_rating?: string | null
          fallback_count?: number
          flight_controller?: string | null
          flight_time_max?: number | null
          flight_time_min?: number | null
          frame_size?: string | null
          gps_type?: string | null
          id?: string
          last_matched_at?: string | null
          match_count?: number
          motor_class?: string | null
          motor_count?: number | null
          payload_max_kg?: number | null
          payload_min_kg?: number | null
          payload_system?: string | null
          propeller_spec?: string | null
          purpose?: string
          risk_flags?: string[] | null
          risk_level?: string | null
          rule_name?: string | null
          status?: string
          terrain_types?: string[] | null
          twr_min?: number | null
          updated_at?: string
          user_type?: string | null
          vehicle_type?: string
          vertical?: string
          wind_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mission_hub_users"
            referencedColumns: ["id"]
          },
        ]
      }
      destud_users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          Industry: string | null
          location: string | null
          message: string | null
          organisation: string | null
          phone: string | null
          plan: string | null
          role: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          Industry?: string | null
          location?: string | null
          message?: string | null
          organisation?: string | null
          phone?: string | null
          plan?: string | null
          role?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          Industry?: string | null
          location?: string | null
          message?: string | null
          organisation?: string | null
          phone?: string | null
          plan?: string | null
          role?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      destud_waitlist: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          Industry: string | null
          location: string | null
          message: string | null
          organisation: string | null
          phone: string
          plan: string
          role: string | null
          source: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          Industry?: string | null
          location?: string | null
          message?: string | null
          organisation?: string | null
          phone: string
          plan: string
          role?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          Industry?: string | null
          location?: string | null
          message?: string | null
          organisation?: string | null
          phone?: string
          plan?: string
          role?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      drone_components: {
        Row: {
          category: string
          compatible_verticals: string[] | null
          created_at: string
          created_by: string | null
          datasheet_url: string | null
          id: string
          in_stock: boolean
          lead_time_days: number | null
          manufacturer: string
          name: string
          part_number: string | null
          specs: Json | null
          status: string
          supplier_name: string | null
          supplier_url: string | null
          tags: string[] | null
          unit_price_inr: number | null
          updated_at: string
        }
        Insert: {
          category: string
          compatible_verticals?: string[] | null
          created_at?: string
          created_by?: string | null
          datasheet_url?: string | null
          id?: string
          in_stock?: boolean
          lead_time_days?: number | null
          manufacturer: string
          name: string
          part_number?: string | null
          specs?: Json | null
          status?: string
          supplier_name?: string | null
          supplier_url?: string | null
          tags?: string[] | null
          unit_price_inr?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          compatible_verticals?: string[] | null
          created_at?: string
          created_by?: string | null
          datasheet_url?: string | null
          id?: string
          in_stock?: boolean
          lead_time_days?: number | null
          manufacturer?: string
          name?: string
          part_number?: string | null
          specs?: Json | null
          status?: string
          supplier_name?: string | null
          supplier_url?: string | null
          tags?: string[] | null
          unit_price_inr?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drone_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mission_hub_users"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      mission_hub_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          industries: string[] | null
          notification_prefs: Json | null
          role: string
          status: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          industries?: string[] | null
          notification_prefs?: Json | null
          role?: string
          status?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          industries?: string[] | null
          notification_prefs?: Json | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      reference_designs: {
        Row: {
          approval_status: string
          approved_by: string | null
          battery: string | null
          component_list: Json | null
          confidence_score: number | null
          created_at: string
          created_by: string | null
          description: string | null
          drone_type: string
          engineer_notes: string | null
          estimated_flight_time: number | null
          frame_size: string | null
          id: string
          is_active: boolean | null
          motor_class: string | null
          name: string
          payload_weight: number | null
          purpose: string
          requirements: Json | null
          risk_level: string | null
          source_project_id: string | null
          tags: string[] | null
          updated_at: string
          user_type: string | null
          vehicle_type: string
          vertical: string
        }
        Insert: {
          approval_status?: string
          approved_by?: string | null
          battery?: string | null
          component_list?: Json | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          drone_type: string
          engineer_notes?: string | null
          estimated_flight_time?: number | null
          frame_size?: string | null
          id?: string
          is_active?: boolean | null
          motor_class?: string | null
          name: string
          payload_weight?: number | null
          purpose: string
          requirements?: Json | null
          risk_level?: string | null
          source_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_type?: string | null
          vehicle_type?: string
          vertical: string
        }
        Update: {
          approval_status?: string
          approved_by?: string | null
          battery?: string | null
          component_list?: Json | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          drone_type?: string
          engineer_notes?: string | null
          estimated_flight_time?: number | null
          frame_size?: string | null
          id?: string
          is_active?: boolean | null
          motor_class?: string | null
          name?: string
          payload_weight?: number | null
          purpose?: string
          requirements?: Json | null
          risk_level?: string | null
          source_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_type?: string | null
          vehicle_type?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_designs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "mission_hub_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mission_hub_users"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_projects: {
        Row: {
          advisor_messages: Json | null
          created_at: string
          design_recommendation: Json | null
          id: string
          payload_details: Json | null
          project_name: string
          purpose: string
          recommended_design: Json | null
          requirements: Json | null
          risk_level: string | null
          safety: Json | null
          simulation_results: Json | null
          status: string
          updated_at: string
          user_id: string
          user_type: string
          vehicle_type: string
          vertical: string
        }
        Insert: {
          advisor_messages?: Json | null
          created_at?: string
          design_recommendation?: Json | null
          id?: string
          payload_details?: Json | null
          project_name: string
          purpose: string
          recommended_design?: Json | null
          requirements?: Json | null
          risk_level?: string | null
          safety?: Json | null
          simulation_results?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          user_type?: string
          vehicle_type?: string
          vertical: string
        }
        Update: {
          advisor_messages?: Json | null
          created_at?: string
          design_recommendation?: Json | null
          id?: string
          payload_details?: Json | null
          project_name?: string
          purpose?: string
          recommended_design?: Json | null
          requirements?: Json | null
          risk_level?: string | null
          safety?: Json | null
          simulation_results?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          user_type?: string
          vehicle_type?: string
          vertical?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cache_module_section_content: {
        Args: { p_content: string; p_section_id: string }
        Returns: undefined
      }
      convert_destud_waitlist_entry: {
        Args: { p_id: string }
        Returns: undefined
      }
      enroll_waitlist_user: {
        Args: { p_waitlist_id: string }
        Returns: undefined
      }
      get_course_modules: {
        Args: { p_course_id: string }
        Returns: {
          description: string
          id: string
          order_index: number
          title: string
        }[]
      }
      get_course_modules_for_user: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: {
          completed: boolean
          description: string
          id: string
          order_index: number
          title: string
        }[]
      }
      is_mhu_admin: { Args: never; Returns: boolean }
      promote_waitlist_to_active: {
        Args: { p_access_url?: string; p_waitlist_id: string }
        Returns: string
      }
      set_module_complete: {
        Args: { p_done: boolean; p_module_id: string; p_user_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      verify_academy_user: {
        Args: { p_email: string; p_name: string }
        Returns: Json
      }
      verify_destud_user: {
        Args: { p_email: string; p_name: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
