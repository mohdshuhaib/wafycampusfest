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
      committee_members: {
        Row: {
          id: string
          name: string
          role: string
          whatsapp_number: string
          phone_number: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: string
          whatsapp_number: string
          phone_number: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          whatsapp_number?: string
          phone_number?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
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
          role: 'admin' | 'captain' | 'judge'
          team_id: string | null
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'captain' | 'judge'
          team_id?: string | null
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'captain' | 'judge'
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
          section: 'Senior'
          team_role: 'member' | 'manager' | 'assistant_manager'
          team_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          chest_no?: string | null
          class_grade?: string | null
          image_link?: string | null
          section: 'Senior'
          team_role?: 'member' | 'manager' | 'assistant_manager'
          team_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          chest_no?: string | null
          class_grade?: string | null
          image_link?: string | null
          section?: 'Senior'
          team_role?: 'member' | 'manager' | 'assistant_manager'
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
          topic: string | null
          topic_language: 'english' | 'malayalam' | 'arabic' | null
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
          topic?: string | null
          topic_language?: 'english' | 'malayalam' | 'arabic' | null
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
          topic?: string | null
          topic_language?: 'english' | 'malayalam' | 'arabic' | null
          created_at?: string
        }
      }
      event_topics: {
        Row: {
          id: string
          event_id: string
          topic_type: 'general' | 'personal' | 'participant'
          topic_language: 'english' | 'malayalam' | 'arabic'
          publish_type: 'immediate' | 'scheduled'
          scheduled_publish_time: string | null
          general_topic: string | null
          team_topics: Record<string, string> | null
          participant_topics: Record<string, string> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          topic_type?: 'general' | 'personal' | 'participant'
          topic_language?: 'english' | 'malayalam' | 'arabic'
          publish_type?: 'immediate' | 'scheduled'
          scheduled_publish_time?: string | null
          general_topic?: string | null
          team_topics?: Record<string, string> | null
          participant_topics?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          topic_type?: 'general' | 'personal' | 'participant'
          topic_language?: 'english' | 'malayalam' | 'arabic'
          publish_type?: 'immediate' | 'scheduled'
          scheduled_publish_time?: string | null
          general_topic?: string | null
          team_topics?: Record<string, string> | null
          participant_topics?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
      }
      programme_schedules: {
        Row: {
          id: string
          programme_id: string
          schedule_date: string
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          programme_id: string
          schedule_date: string
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          programme_id?: string
          schedule_date?: string
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      programme_timers: {
        Row: {
          id: string
          programme_id: string | null
          language: 'english' | 'malayalam' | 'arabic' | null
          subject: string | null
          duration_seconds: number | null
          slots_count: number
          programme_slots: any[]
          access_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          programme_id?: string | null
          language?: 'english' | 'malayalam' | 'arabic' | null
          subject?: string | null
          duration_seconds?: number | null
          slots_count?: number
          programme_slots?: any[]
          access_code?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          programme_id?: string | null
          language?: 'english' | 'malayalam' | 'arabic' | null
          subject?: string | null
          duration_seconds?: number | null
          slots_count?: number
          programme_slots?: any[]
          access_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      seating_arrangements: {
        Row: {
          id: string
          title: string
          programme_ids: any[]
          seats_per_row: number
          layout_grid: any[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          programme_ids?: any[]
          seats_per_row: number
          layout_grid?: any[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          programme_ids?: any[]
          seats_per_row?: number
          layout_grid?: any[]
          created_at?: string
          updated_at?: string
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
      judges: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email: string
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          created_at?: string
        }
        Relationships: []
      }
      judge_assignments: {
        Row: {
          id: string
          judge_id: string
          event_id: string
          rule_criterion_1: string
          rule_criterion_2: string
          rule_criterion_3: string
          rule_criterion_4: string
          overall_remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          judge_id: string
          event_id: string
          rule_criterion_1?: string
          rule_criterion_2?: string
          rule_criterion_3?: string
          rule_criterion_4?: string
          overall_remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          judge_id?: string
          event_id?: string
          rule_criterion_1?: string
          rule_criterion_2?: string
          rule_criterion_3?: string
          rule_criterion_4?: string
          overall_remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      judge_evaluations: {
        Row: {
          id: string
          assignment_id: string | null
          judge_id: string
          event_id: string
          chest_no: string
          student_id: string | null
          student_name: string | null
          team_name: string | null
          mark_criterion_1: number
          mark_criterion_2: number
          mark_criterion_3: number
          mark_criterion_4: number
          total_marks: number
          grade: string
          positive_remarks: string | null
          negative_remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id?: string | null
          judge_id: string
          event_id: string
          chest_no: string
          student_id?: string | null
          student_name?: string | null
          team_name?: string | null
          mark_criterion_1: number
          mark_criterion_2: number
          mark_criterion_3: number
          mark_criterion_4: number
          total_marks: number
          grade: string
          positive_remarks?: string | null
          negative_remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string | null
          judge_id?: string
          event_id?: string
          chest_no?: string
          student_id?: string | null
          student_name?: string | null
          team_name?: string | null
          mark_criterion_1?: number
          mark_criterion_2?: number
          mark_criterion_3?: number
          mark_criterion_4?: number
          total_marks?: number
          grade?: string
          positive_remarks?: string | null
          negative_remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
  }
}
