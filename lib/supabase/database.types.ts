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
    PostgrestVersion: "14.15"
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
      budgets: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived_at: string | null
          budget_id: string
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
          budget_id: string
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
          budget_id?: string
          created_at?: string
          id?: string
          monthly_amount?: number
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          archived_at: string | null
          balance: number
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          balance?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          balance?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          decimal_places: number
          retention_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decimal_places?: number
          retention_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decimal_places?: number
          retention_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sinking_expenses: {
        Row: {
          amount: number
          archived_at: string | null
          budget_id: string
          contribution_type: string
          created_at: string
          frequency: string | null
          fund_id: string | null
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
          budget_id: string
          contribution_type?: string
          created_at?: string
          frequency?: string | null
          fund_id?: string | null
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
          budget_id?: string
          contribution_type?: string
          created_at?: string
          frequency?: string | null
          fund_id?: string | null
          id?: string
          name?: string
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinking_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinking_expenses_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      source_funds: {
        Row: {
          created_at: string
          fund_id: string
          id: string
          source_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fund_id: string
          id?: string
          source_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          fund_id?: string
          id?: string
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_funds_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_funds_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_funds_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_reimbursements_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_funds_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_source_balances"
            referencedColumns: ["id"]
          },
        ]
      }
      source_transfers: {
        Row: {
          amount: number
          budget_id: string
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
          budget_id: string
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
          budget_id?: string
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
            foreignKeyName: "source_transfers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_reimbursements_pending"
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
          budget_id: string | null
          budget_period_start: string | null
          created_at: string
          deposit_date: string | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          balance?: number
          budget_id?: string | null
          budget_period_start?: string | null
          created_at?: string
          deposit_date?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          balance?: number
          budget_id?: string | null
          budget_period_start?: string | null
          created_at?: string
          deposit_date?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          account_id: string | null
          bank_connection_id: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          transactions_fetched: number | null
          transactions_new: number | null
          triggered_by: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          bank_connection_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          transactions_fetched?: number | null
          transactions_new?: number | null
          triggered_by: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          bank_connection_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          transactions_fetched?: number | null
          transactions_new?: number | null
          triggered_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_log_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "v_reimbursements_pending"
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
          is_split: boolean
          is_transfer: boolean
          merchant_normalized: string | null
          notes: string | null
          posted_date: string
          provider_transaction_id: string | null
          source_id: string | null
          status: string
          transfer_from_fund_id: string | null
          transfer_from_source_id: string | null
          transfer_to_fund_id: string | null
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
          is_split?: boolean
          is_transfer?: boolean
          merchant_normalized?: string | null
          notes?: string | null
          posted_date: string
          provider_transaction_id?: string | null
          source_id?: string | null
          status?: string
          transfer_from_fund_id?: string | null
          transfer_from_source_id?: string | null
          transfer_to_fund_id?: string | null
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
          is_split?: boolean
          is_transfer?: boolean
          merchant_normalized?: string | null
          notes?: string | null
          posted_date?: string
          provider_transaction_id?: string | null
          source_id?: string | null
          status?: string
          transfer_from_fund_id?: string | null
          transfer_from_source_id?: string | null
          transfer_to_fund_id?: string | null
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
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
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
            referencedRelation: "v_reimbursements_pending"
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
            foreignKeyName: "transactions_transfer_from_fund_id_fkey"
            columns: ["transfer_from_fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
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
            referencedRelation: "v_reimbursements_pending"
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
            foreignKeyName: "transactions_transfer_to_fund_id_fkey"
            columns: ["transfer_to_fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
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
            referencedRelation: "v_reimbursements_pending"
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
          category_id: string
          created_at: string
          id: string
          last_used_at: string
          merchant_normalized: string
          source_id: string | null
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          last_used_at?: string
          merchant_normalized: string
          source_id?: string | null
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
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
            referencedRelation: "v_reimbursements_pending"
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
      v_account_balances: {
        Row: {
          account_name: string | null
          account_type: string | null
          available_balance: number | null
          current_balance: number | null
          id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          account_name?: string | null
          account_type?: string | null
          available_balance?: number | null
          current_balance?: number | null
          id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          account_name?: string | null
          account_type?: string | null
          available_balance?: number | null
          current_balance?: number | null
          id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_float_outstanding: {
        Row: {
          float_outstanding: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_inflow_outflow: {
        Row: {
          inflow: number | null
          month: string | null
          outflow: number | null
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
      v_reimbursements_pending: {
        Row: {
          balance: number | null
          deposit_date: string | null
          id: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          deposit_date?: string | null
          id?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          deposit_date?: string | null
          id?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_source_balances: {
        Row: {
          balance: number | null
          deposit_date: string | null
          id: string | null
          name: string | null
          type: string | null
          user_id: string | null
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
    }
    Functions: {
      adjust_fund_balance: {
        Args: { p_delta: number; p_fund_id: string }
        Returns: number
      }
      adjust_source_balance: {
        Args: { p_delta: number; p_source_id: string }
        Returns: number
      }
      delete_bank_connection: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      ensure_budget_source_current: {
        Args: { p_budget_id: string }
        Returns: undefined
      }
      ensure_source_transfers_current: {
        Args: { p_budget_id: string }
        Returns: undefined
      }
      get_bank_connection_access_url: {
        Args: { p_connection_id: string }
        Returns: string
      }
      match_transfer_pairs: { Args: { p_user_id: string }; Returns: number }
      purge_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      store_bank_connection_secret: {
        Args: { p_access_url: string }
        Returns: string
      }
      sync_source_or_fund_balance: {
        Args: { p_delta: number; p_source_id: string }
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const
