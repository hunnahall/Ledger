type Json =
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
      accounts: {
        Row: {
          account_name: string
          account_type: string
          available_balance: number | null
          bank_connection_id: string | null
          created_at: string
          current_balance: number
          id: string
          institution_name: string | null
          is_manual: boolean
          last4: string | null
          provider_account_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_type?: string
          available_balance?: number | null
          bank_connection_id?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          institution_name?: string | null
          is_manual?: boolean
          last4?: string | null
          provider_account_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_type?: string
          available_balance?: number | null
          bank_connection_id?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          institution_name?: string | null
          is_manual?: boolean
          last4?: string | null
          provider_account_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          page: string
          user_id: string
          variable: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          page: string
          user_id: string
          variable: string
        }
        Update: {
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          page?: string
          user_id?: string
          variable?: string
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          access_url_secret_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_url_secret_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_url_secret_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          monthly_amount: number
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          monthly_amount?: number
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          monthly_amount?: number
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forecast_entries: {
        Row: {
          amount: number
          created_at: string
          description: string
          forecast_id: string
          id: string
          is_expense: boolean
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          forecast_id: string
          id?: string
          is_expense?: boolean
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          forecast_id?: string
          id?: string
          is_expense?: boolean
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_entries_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "forecasts"
            referencedColumns: ["id"]
          },
        ]
      }
      forecasts: {
        Row: {
          created_at: string
          id: string
          monthly_transfer_override: number | null
          name: string
          source_id: string
          starting_balance_override: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_transfer_override?: number | null
          name: string
          source_id: string
          starting_balance_override?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_transfer_override?: number | null
          name?: string
          source_id?: string
          starting_balance_override?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecasts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_source_balances"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          decimal_places: number
          month_ahead: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decimal_places?: number
          month_ahead?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decimal_places?: number
          month_ahead?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sinking_expenses: {
        Row: {
          amount: number
          archived_at: string | null
          contributed_to_date: number
          contribution_type: string
          created_at: string
          frequency: string | null
          id: string
          name: string
          target_amount: number | null
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          archived_at?: string | null
          contributed_to_date?: number
          contribution_type?: string
          created_at?: string
          frequency?: string | null
          id?: string
          name: string
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          archived_at?: string | null
          contributed_to_date?: number
          contribution_type?: string
          created_at?: string
          frequency?: string | null
          id?: string
          name?: string
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      source_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          last_applied_month: string | null
          name: string
          source_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          last_applied_month?: string | null
          name: string
          source_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          last_applied_month?: string | null
          name?: string
          source_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_transfers_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_transfers_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_source_balances"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          archived_at: string | null
          balance: number
          created_at: string
          deposit_date: string | null
          id: string
          is_system: boolean
          last_applied_month: string | null
          name: string
          type: Database["public"]["Enums"]["source_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          balance?: number
          created_at?: string
          deposit_date?: string | null
          id?: string
          is_system?: boolean
          last_applied_month?: string | null
          name: string
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          balance?: number
          created_at?: string
          deposit_date?: string | null
          id?: string
          is_system?: boolean
          last_applied_month?: string | null
          name?: string
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_splits: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          source_id: string | null
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_id?: string | null
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_id?: string | null
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_source_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          category_source: string | null
          created_at: string
          description: string
          exclude_from_budget: boolean
          id: string
          is_income: boolean
          is_split: boolean
          is_transfer: boolean
          merchant_normalized: string | null
          notes: string | null
          posted_date: string
          provider_transaction_id: string | null
          source_id: string | null
          status: string
          transfer_from_source_id: string | null
          transfer_to_source_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          category_source?: string | null
          created_at?: string
          description: string
          exclude_from_budget?: boolean
          id?: string
          is_income?: boolean
          is_split?: boolean
          is_transfer?: boolean
          merchant_normalized?: string | null
          notes?: string | null
          posted_date: string
          provider_transaction_id?: string | null
          source_id?: string | null
          status?: string
          transfer_from_source_id?: string | null
          transfer_to_source_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          category_source?: string | null
          created_at?: string
          description?: string
          exclude_from_budget?: boolean
          id?: string
          is_income?: boolean
          is_split?: boolean
          is_transfer?: boolean
          merchant_normalized?: string | null
          notes?: string | null
          posted_date?: string
          provider_transaction_id?: string | null
          source_id?: string | null
          status?: string
          transfer_from_source_id?: string | null
          transfer_to_source_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_source_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_from_source_id_fkey"
            columns: ["transfer_from_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_from_source_id_fkey"
            columns: ["transfer_from_source_id"]
            isOneToOne: false
            referencedRelation: "v_source_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_to_source_id_fkey"
            columns: ["transfer_to_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_to_source_id_fkey"
            columns: ["transfer_to_source_id"]
            isOneToOne: false
            referencedRelation: "v_source_balances"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_category_rules: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_income: boolean
          last_used_at: string
          merchant_normalized: string
          source_id: string | null
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_income?: boolean
          last_used_at?: string
          merchant_normalized: string
          source_id?: string | null
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_income?: boolean
          last_used_at?: string
          merchant_normalized?: string
          source_id?: string | null
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_category_rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_category_rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_source_balances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_inflow_outflow: {
        Row: {
          income: number | null
          month: string | null
          other_inflow: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_outflow_by_bucket: {
        Row: {
          amount: number | null
          bucket: string | null
          month: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_source_balances: {
        Row: {
          balance: number | null
          deposit_date: string | null
          id: string | null
          name: string | null
          type: Database["public"]["Enums"]["source_type"] | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          deposit_date?: string | null
          id?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["source_type"] | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          deposit_date?: string | null
          id?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["source_type"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_spending_by_category: {
        Row: {
          amount: number | null
          category_id: string | null
          month: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_spending_by_source: {
        Row: {
          amount: number | null
          month: string | null
          source_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_vendor_rules: {
        Args: { p_user_id?: string }
        Returns: number
      }
      delete_bank_connection: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      delete_own_account: { Args: never; Returns: undefined }
      ensure_month_current: { Args: never; Returns: undefined }
      get_bank_connection_access_url: {
        Args: { p_connection_id: string; p_user_id: string }
        Returns: string
      }
      learn_vendor_rule: {
        Args: {
          p_category_id: string | null
          p_is_income: boolean
          p_merchant_normalized: string
          p_source_id: string | null
        }
        Returns: undefined
      }
      match_transfer_pairs: { Args: { p_user_id: string }; Returns: number }
      purge_expired_data: { Args: never; Returns: undefined }
      route_current_month_income_to_fund: { Args: never; Returns: undefined }
      save_transaction_splits: {
        Args: { p_rows: Json; p_transaction_id: string }
        Returns: undefined
      }
      store_bank_connection_secret: {
        Args: { p_access_url: string }
        Returns: string
      }
      sync_bank_transactions: { Args: { p_rows: Json }; Returns: undefined }
      user_month_start: { Args: { p_user_id: string }; Returns: string }
    }
    Enums: {
      source_type:
        | "budget"
        | "reimbursement"
        | "fund"
        | "float"
        | "sinking_fund"
        | "income"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// The generated Tables/TablesInsert/TablesUpdate/Enums/CompositeTypes
// helper generics and the Constants export were removed: nothing in the app
// used them, and they were the only thing keeping DefaultSchema alive. Types
// are read straight off `Database` through the typed Supabase client
// instead. Re-add them from a fresh `supabase gen types` if a caller ever
// needs them.
