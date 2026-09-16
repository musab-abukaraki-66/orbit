export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          comment_id: string | null
          created_at: string
          data: Json
          id: number
          project_id: string | null
          work_item_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          data?: Json
          id?: never
          project_id?: string | null
          work_item_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          data?: Json
          id?: never
          project_id?: string | null
          work_item_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          { foreignKeyName: "activity_log_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "activity_log_comment_id_fkey"; columns: ["comment_id"]; isOneToOne: false; referencedRelation: "comments"; referencedColumns: ["id"] },
          { foreignKeyName: "activity_log_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "activity_log_work_item_id_fkey"; columns: ["work_item_id"]; isOneToOne: false; referencedRelation: "work_items"; referencedColumns: ["id"] },
          { foreignKeyName: "activity_log_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          edited_at: string | null
          id: string
          mentions: string[]
          updated_at: string
          work_item_id: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: string[]
          updated_at?: string
          work_item_id: string
          workspace_id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: string[]
          updated_at?: string
          work_item_id?: string
          workspace_id?: string
        }
        Relationships: [
          { foreignKeyName: "comments_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "comments_work_item_id_fkey"; columns: ["work_item_id"]; isOneToOne: false; referencedRelation: "work_items"; referencedColumns: ["id"] },
          { foreignKeyName: "comments_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["ws_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token_hash: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["ws_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token_hash: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["ws_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token_hash?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          { foreignKeyName: "invitations_invited_by_fkey"; columns: ["invited_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "invitations_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      labels: {
        Row: { color: string; created_at: string; id: string; name: string; updated_at: string; workspace_id: string }
        Insert: { color?: string; created_at?: string; id?: string; name: string; updated_at?: string; workspace_id: string }
        Update: { color?: string; created_at?: string; id?: string; name?: string; updated_at?: string; workspace_id?: string }
        Relationships: [
          { foreignKeyName: "labels_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          comment_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          project_id: string | null
          read_at: string | null
          title: string
          user_id: string
          work_item_id: string | null
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          project_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
          work_item_id?: string | null
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          project_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
          work_item_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          { foreignKeyName: "notifications_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_comment_id_fkey"; columns: ["comment_id"]; isOneToOne: false; referencedRelation: "comments"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_work_item_id_fkey"; columns: ["work_item_id"]; isOneToOne: false; referencedRelation: "work_items"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: { avatar_url: string | null; created_at: string; email: string | null; full_name: string | null; id: string; updated_at: string }
        Insert: { avatar_url?: string | null; created_at?: string; email?: string | null; full_name?: string | null; id: string; updated_at?: string }
        Update: { avatar_url?: string | null; created_at?: string; email?: string | null; full_name?: string | null; id?: string; updated_at?: string }
        Relationships: []
      }
      project_memberships: {
        Row: { created_at: string; project_id: string; user_id: string }
        Insert: { created_at?: string; project_id: string; user_id: string }
        Update: { created_at?: string; project_id?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "project_memberships_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "project_memberships_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      project_updates: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          health: Database["public"]["Enums"]["project_health"]
          id: string
          project_id: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          health: Database["public"]["Enums"]["project_health"]
          id?: string
          project_id: string
          workspace_id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          health?: Database["public"]["Enums"]["project_health"]
          id?: string
          project_id?: string
          workspace_id?: string
        }
        Relationships: [
          { foreignKeyName: "project_updates_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_updates_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "project_updates_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          health: Database["public"]["Enums"]["project_health"]
          id: string
          lead_id: string | null
          name: string
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          team_id: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          health?: Database["public"]["Enums"]["project_health"]
          id?: string
          lead_id?: string | null
          name: string
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          team_id?: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          health?: Database["public"]["Enums"]["project_health"]
          id?: string
          lead_id?: string | null
          name?: string
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          team_id?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          { foreignKeyName: "projects_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_team_id_workspace_id_fkey"; columns: ["team_id", "workspace_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id", "workspace_id"] },
          { foreignKeyName: "projects_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      statuses: {
        Row: {
          category: Database["public"]["Enums"]["status_category"]
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          position: number
          team_id: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["status_category"]
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          position?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["status_category"]
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "statuses_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] },
        ]
      }
      teams: {
        Row: { created_at: string; id: string; is_default: boolean; name: string; updated_at: string; workspace_id: string }
        Insert: { created_at?: string; id?: string; is_default?: boolean; name: string; updated_at?: string; workspace_id: string }
        Update: { created_at?: string; id?: string; is_default?: boolean; name?: string; updated_at?: string; workspace_id?: string }
        Relationships: [
          { foreignKeyName: "teams_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      work_item_labels: {
        Row: { created_at: string; label_id: string; work_item_id: string }
        Insert: { created_at?: string; label_id: string; work_item_id: string }
        Update: { created_at?: string; label_id?: string; work_item_id?: string }
        Relationships: [
          { foreignKeyName: "work_item_labels_label_id_fkey"; columns: ["label_id"]; isOneToOne: false; referencedRelation: "labels"; referencedColumns: ["id"] },
          { foreignKeyName: "work_item_labels_work_item_id_fkey"; columns: ["work_item_id"]; isOneToOne: false; referencedRelation: "work_items"; referencedColumns: ["id"] },
        ]
      }
      work_items: {
        Row: {
          archived_at: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          key: string
          number: number
          position: number
          priority: Database["public"]["Enums"]["item_priority"]
          project_id: string
          status_id: string
          team_id: string
          title: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          key?: string
          number?: number
          position?: number
          priority?: Database["public"]["Enums"]["item_priority"]
          project_id: string
          status_id?: string
          team_id?: string
          title: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Update: {
          archived_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          key?: string
          number?: number
          position?: number
          priority?: Database["public"]["Enums"]["item_priority"]
          project_id?: string
          status_id?: string
          team_id?: string
          title?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          { foreignKeyName: "work_items_assignee_id_fkey"; columns: ["assignee_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "work_items_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "work_items_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "work_items_status_id_team_id_fkey"; columns: ["status_id", "team_id"]; isOneToOne: false; referencedRelation: "statuses"; referencedColumns: ["id", "team_id"] },
          { foreignKeyName: "work_items_team_id_workspace_id_fkey"; columns: ["team_id", "workspace_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id", "workspace_id"] },
          { foreignKeyName: "work_items_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      workspace_memberships: {
        Row: { created_at: string; role: Database["public"]["Enums"]["ws_role"]; updated_at: string; user_id: string; workspace_id: string }
        Insert: { created_at?: string; role?: Database["public"]["Enums"]["ws_role"]; updated_at?: string; user_id: string; workspace_id: string }
        Update: { created_at?: string; role?: Database["public"]["Enums"]["ws_role"]; updated_at?: string; user_id?: string; workspace_id?: string }
        Relationships: [
          { foreignKeyName: "workspace_memberships_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "workspace_memberships_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      workspaces: {
        Row: { created_at: string; created_by: string | null; id: string; item_counter: number; key: string; name: string; slug: string; updated_at: string }
        Insert: { created_at?: string; created_by?: string | null; id?: string; item_counter?: number; key: string; name: string; slug: string; updated_at?: string }
        Update: { created_at?: string; created_by?: string | null; id?: string; item_counter?: number; key?: string; name?: string; slug?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "workspaces_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      create_invitation: {
        Args: { p_email: string; p_role: Database["public"]["Enums"]["ws_role"]; p_workspace: string }
        Returns: string
      }
      create_workspace: { Args: { p_key: string; p_name: string; p_slug: string }; Returns: string }
      get_invitation: {
        Args: { p_token: string }
        Returns: {
          email_masked: string
          email_matches: boolean
          expires_at: string
          inviter_name: string
          role: Database["public"]["Enums"]["ws_role"]
          status: Database["public"]["Enums"]["invite_status"]
          workspace_id: string
          workspace_name: string
          workspace_slug: string
        }[]
      }
      seed_sample_project: { Args: { p_workspace: string }; Returns: string }
      transfer_ownership: { Args: { p_user: string; p_workspace: string }; Returns: undefined }
    }
    Enums: {
      invite_status: "pending" | "accepted" | "revoked" | "expired"
      item_priority: "none" | "low" | "medium" | "high" | "urgent"
      notification_kind: "assigned" | "mentioned" | "commented" | "status_changed" | "invited" | "member_joined" | "project_update"
      project_health: "on_track" | "at_risk" | "off_track"
      project_status: "backlog" | "planned" | "in_progress" | "completed" | "canceled"
      status_category: "backlog" | "unstarted" | "started" | "completed" | "canceled"
      ws_role: "owner" | "admin" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      invite_status: ["pending", "accepted", "revoked", "expired"],
      item_priority: ["none", "low", "medium", "high", "urgent"],
      notification_kind: ["assigned", "mentioned", "commented", "status_changed", "invited", "member_joined", "project_update"],
      project_health: ["on_track", "at_risk", "off_track"],
      project_status: ["backlog", "planned", "in_progress", "completed", "canceled"],
      status_category: ["backlog", "unstarted", "started", "completed", "canceled"],
      ws_role: ["owner", "admin", "member"],
    },
  },
} as const
