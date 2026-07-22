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
      app_config: {
        Row: {
          id: number
          registration_open: boolean
          on_stage_registration_open: boolean
          off_stage_registration_open: boolean
        }
        Insert: {
          id?: number
          registration_open?: boolean
          on_stage_registration_open?: boolean
          off_stage_registration_open?: boolean
        }
        Update: {
          id?: number
          registration_open?: boolean
          on_stage_registration_open?: boolean
          off_stage_registration_open?: boolean
        }
      }
      finance_transactions: {
        Row: {
          id: string
          name: string
          type: 'CREDIT' | 'DEBIT'
          method: 'LIQUID' | 'UPI' | 'BANK_TRANSFER'
          details: string | null
          amount: number
          transaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'CREDIT' | 'DEBIT'
          method: 'LIQUID' | 'UPI' | 'BANK_TRANSFER'
          details?: string | null
          amount?: number
          transaction_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'CREDIT' | 'DEBIT'
          method?: 'LIQUID' | 'UPI' | 'BANK_TRANSFER'
          details?: string | null
          amount?: number
          transaction_date?: string
          created_at?: string
        }
      }
      grade_settings: {
        Row: {
          id: string
          grade_type: 'A' | 'B' | 'C' | 'D'
          first_place: number
          second_place: number
          third_place: number
        }
        Insert: {
          id?: string
          grade_type: 'A' | 'B' | 'C' | 'D'
          first_place?: number
          second_place?: number
          third_place?: number
        }
        Update: {
          id?: string
          grade_type?: 'A' | 'B' | 'C' | 'D'
          first_place?: number
          second_place?: number
          third_place?: number
        }
      }
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'captain'
          team_id: string | null
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'captain'
          team_id?: string | null
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'captain'
          team_id?: string | null
          full_name?: string | null
          created_at?: string
        }
      }
      performance_grade_settings: {
        Row: {
          id: string
          grade_label: 'A+' | 'A' | 'B' | 'C'
          points: number
        }
        Insert: {
          id?: string
          grade_label: 'A+' | 'A' | 'B' | 'C'
          points?: number
        }
        Update: {
          id?: string
          grade_label?: 'A+' | 'A' | 'B' | 'C'
          points?: number
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          color_hex: string
          access_override: boolean | null
          penalty_points: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          color_hex: string
          access_override?: boolean | null
          penalty_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          color_hex?: string
          access_override?: boolean | null
          penalty_points?: number
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          name: string
          chest_no: string | null
          class_grade: string | null
          image_link: string | null
          section: 'Senior' | 'Junior' | 'Sub-Junior'
          team_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          chest_no?: string | null
          class_grade?: string | null
          image_link?: string | null
          section: 'Senior' | 'Junior' | 'Sub-Junior'
          team_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          chest_no?: string | null
          class_grade?: string | null
          image_link?: string | null
          section?: 'Senior' | 'Junior' | 'Sub-Junior'
          team_id?: string
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          name: string
          event_code: string | null
          category: 'OFF STAGE' | 'ON STAGE' | 'GENERAL' | 'SPECIAL'
          max_participants_per_team: number
          grade_type: 'A' | 'B' | 'C' | 'D' | null
          duration_minutes: number | null
          applicable_section: string[]
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          event_code?: string | null
          category: 'OFF STAGE' | 'ON STAGE' | 'GENERAL' | 'SPECIAL'
          max_participants_per_team?: number
          grade_type?: 'A' | 'B' | 'C' | 'D' | null
          duration_minutes?: number | null
          applicable_section?: string[]
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          event_code?: string | null
          category?: 'OFF STAGE' | 'ON STAGE' | 'GENERAL' | 'SPECIAL'
          max_participants_per_team?: number
          grade_type?: 'A' | 'B' | 'C' | 'D' | null
          duration_minutes?: number | null
          applicable_section?: string[]
          description?: string | null
          created_at?: string
        }
      }
      participations: {
        Row: {
          id: string
          student_id: string | null
          event_id: string
          team_id: string
          status: 'registered' | 'completed' | 'disqualified' | 'winner'
          result_position: 'FIRST' | 'SECOND' | 'THIRD' | null
          points_earned: number
          performance_grade: 'A+' | 'A' | 'B' | 'C' | 'NONE' | null
          attendance_status: 'pending' | 'present' | 'absent'
          created_at: string
        }
        Insert: {
          id?: string
          student_id?: string | null
          event_id: string
          team_id: string
          status?: 'registered' | 'completed' | 'disqualified' | 'winner'
          result_position?: 'FIRST' | 'SECOND' | 'THIRD' | null
          points_earned?: number
          performance_grade?: 'A+' | 'A' | 'B' | 'C' | 'NONE' | null
          attendance_status?: 'pending' | 'present' | 'absent'
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string | null
          event_id?: string
          team_id?: string
          status?: 'registered' | 'completed' | 'disqualified' | 'winner'
          result_position?: 'FIRST' | 'SECOND' | 'THIRD' | null
          points_earned?: number
          performance_grade?: 'A+' | 'A' | 'B' | 'C' | 'NONE' | null
          attendance_status?: 'pending' | 'present' | 'absent'
          created_at?: string
        }
      }
      section_limits: {
        Row: {
          id: string
          section: string
          category: 'ON STAGE' | 'OFF STAGE' | 'GENERAL' | 'SPECIAL'
          limit_count: number
        }
        Insert: {
          id?: string
          section: string
          category: 'ON STAGE' | 'OFF STAGE' | 'GENERAL' | 'SPECIAL'
          limit_count?: number
        }
        Update: {
          id?: string
          section?: string
          category?: 'ON STAGE' | 'OFF STAGE' | 'GENERAL' | 'SPECIAL'
          limit_count?: number
        }
      }
      site_assets: {
        Row: {
          id: string
          key: string
          label: string
          type: 'image' | 'link' | 'file'
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          type: 'image' | 'link' | 'file'
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          type?: 'image' | 'link' | 'file'
          value?: string
          description?: string | null
          updated_at?: string
        }
      }
      keep_alive_status: {
        Row: {
          id: number
          last_ping: string
        }
        Insert: {
          id: number
          last_ping?: string
        }
        Update: {
          id?: number
          last_ping?: string
        }
      }
    }
  }
}
