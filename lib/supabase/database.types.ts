export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
          is_archived: boolean
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
          is_archived?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
          is_archived?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          role: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: string
          content?: string
          created_at?: string
        }
      }
    }
  }
}
