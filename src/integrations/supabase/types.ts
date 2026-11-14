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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          project_id: string
          readiness: Json | null
          stage: string
          status: string
          summary: string | null
          user_id: string
          verdict: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          project_id: string
          readiness?: Json | null
          stage?: string
          status?: string
          summary?: string | null
          user_id: string
          verdict?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          project_id?: string
          readiness?: Json | null
          stage?: string
          status?: string
          summary?: string | null
          user_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          audit_run_id: string | null
          created_at: string
          evidence_ids: string[]
          id: string
          project_id: string
          reason: string
          requirement: string | null
          status: string
          test_type: string | null
          text: string
          user_id: string
          verification_method: string
        }
        Insert: {
          audit_run_id?: string | null
          created_at?: string
          evidence_ids?: string[]
          id?: string
          project_id: string
          reason?: string
          requirement?: string | null
          status?: string
          test_type?: string | null
          text: string
          user_id: string
          verification_method?: string
        }
        Update: {
          audit_run_id?: string | null
          created_at?: string
          evidence_ids?: string[]
          id?: string
          project_id?: string
          reason?: string
          requirement?: string | null
          status?: string
          test_type?: string | null
          text?: string
          user_id?: string
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          created_at: string
          extracted_text: string
          id: string
          kind: string
          mime_type: string | null
          project_id: string
          source: string
          storage_path: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string
          id?: string
          kind?: string
          mime_type?: string | null
          project_id: string
          source?: string
          storage_path?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string
          id?: string
          kind?: string
          mime_type?: string | null
          project_id?: string
          source?: string
          storage_path?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          audit_run_id: string | null
          created_at: string
          error_evidence: string
          fixable: boolean
          hypotheses: Json | null
          id: string
          project_id: string
          repro_steps: string
          severity: string
          status: string
          test_result_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          audit_run_id?: string | null
          created_at?: string
          error_evidence?: string
          fixable?: boolean
          hypotheses?: Json | null
          id?: string
          project_id: string
          repro_steps?: string
          severity?: string
          status?: string
          test_result_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          audit_run_id?: string | null
          created_at?: string
          error_evidence?: string
          fixable?: boolean
          hypotheses?: Json | null
          id?: string
          project_id?: string
          repro_steps?: string
          severity?: string
          status?: string
          test_result_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      fix_proposals: {
        Row: {
          applied: boolean
          approved_at: string | null
          created_at: string
          explanation: string
          file_path: string
          finding_id: string
          id: string
          original_code: string
          patched_code: string
          project_id: string
          retest_passed: boolean | null
          status: string
          user_id: string
        }
        Insert: {
          applied?: boolean
          approved_at?: string | null
          created_at?: string
          explanation?: string
          file_path: string
          finding_id: string
          id?: string
          original_code: string
          patched_code: string
          project_id: string
          retest_passed?: boolean | null
          status?: string
          user_id: string
        }
        Update: {
          applied?: boolean
          approved_at?: string | null
          created_at?: string
          explanation?: string
          file_path?: string
          finding_id?: string
          id?: string
          original_code?: string
          patched_code?: string
          project_id?: string
          retest_passed?: boolean | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fix_proposals_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fix_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_consent: boolean
          code_consent: boolean
          consent_at: string | null
          created_at: string
          description: string
          fix_consent: boolean
          github_meta: Json | null
          github_url: string | null
          id: string
          is_demo: boolean
          name: string
          organization_name: string
          organization_type: string
          progress_report: string
          requirements: string
          test_consent: boolean
          user_id: string
          website_url: string | null
        }
        Insert: {
          ai_consent?: boolean
          code_consent?: boolean
          consent_at?: string | null
          created_at?: string
          description?: string
          fix_consent?: boolean
          github_meta?: Json | null
          github_url?: string | null
          id?: string
          is_demo?: boolean
          name: string
          organization_name?: string
          organization_type?: string
          progress_report?: string
          requirements?: string
          test_consent?: boolean
          user_id: string
          website_url?: string | null
        }
        Update: {
          ai_consent?: boolean
          code_consent?: boolean
          consent_at?: string | null
          created_at?: string
          description?: string
          fix_consent?: boolean
          github_meta?: Json | null
          github_url?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          organization_name?: string
          organization_type?: string
          progress_report?: string
          requirements?: string
          test_consent?: boolean
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      test_results: {
        Row: {
          audit_run_id: string | null
          created_at: string
          details: string
          id: string
          is_retest: boolean
          logs: Json
          passed: boolean
          project_id: string
          target: string
          test_type: string
          user_id: string
        }
        Insert: {
          audit_run_id?: string | null
          created_at?: string
          details?: string
          id?: string
          is_retest?: boolean
          logs?: Json
          passed: boolean
          project_id: string
          target: string
          test_type: string
          user_id: string
        }
        Update: {
          audit_run_id?: string | null
          created_at?: string
          details?: string
          id?: string
          is_retest?: boolean
          logs?: Json
          passed?: boolean
          project_id?: string
          target?: string
          test_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_calls: {
        Row: {
          args: Json
          audit_run_id: string
          created_at: string
          duration_ms: number | null
          id: string
          result: Json | null
          status: string
          step: number
          tool: string
          user_id: string
        }
        Insert: {
          args?: Json
          audit_run_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          result?: Json | null
          status?: string
          step: number
          tool: string
          user_id: string
        }
        Update: {
          args?: Json
          audit_run_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          result?: Json | null
          status?: string
          step?: number
          tool?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_calls_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
