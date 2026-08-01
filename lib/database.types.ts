export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          date_label: string | null;
          location: string | null;
          visibility: "public" | "private";
          game_points_enabled: boolean;
          football_enabled: boolean;
          status: "draft" | "live" | "finished";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          date_label?: string | null;
          location?: string | null;
          visibility?: "public" | "private";
          game_points_enabled?: boolean;
          football_enabled?: boolean;
          status?: "draft" | "live" | "finished";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          date_label?: string | null;
          location?: string | null;
          visibility?: "public" | "private";
          game_points_enabled?: boolean;
          football_enabled?: boolean;
          status?: "draft" | "live" | "finished";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      event_viewer_access_codes: {
        Row: {
          event_id: string;
          access_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          access_code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          event_id?: string;
          access_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_viewer_access_codes_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_admins: {
        Row: {
          event_id: string;
          user_id: string;
          role: "owner" | "admin";
          created_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          role?: "owner" | "admin";
          created_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          role?: "owner" | "admin";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_admins_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          colour: string;
          badge_text: string | null;
          badge_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          colour?: string;
          badge_text?: string | null;
          badge_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          colour?: string;
          badge_text?: string | null;
          badge_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      game_points_scores: {
        Row: {
          event_id: string;
          team_id: string;
          points: number;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          team_id: string;
          points?: number;
          updated_at?: string;
        };
        Update: {
          event_id?: string;
          team_id?: string;
          points?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_points_scores_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_points_scores_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      score_events: {
        Row: {
          id: string;
          event_id: string;
          team_id: string;
          actor_id: string | null;
          points_delta: number | null;
          points_after: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          team_id: string;
          actor_id?: string | null;
          points_delta?: number | null;
          points_after: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          team_id?: string;
          actor_id?: string | null;
          points_delta?: number | null;
          points_after?: number;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "score_events_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_events_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      event_requires_viewer_access: {
        Args: {
          event_slug: string;
        };
        Returns: boolean;
      };
      get_public_event_for_viewer: {
        Args: {
          event_slug: string;
          submitted_code?: string;
        };
        Returns: Json;
      };
      get_event_admin_members: {
        Args: {
          target_event_id: string;
        };
        Returns: Array<{
          user_id: string;
          display_name: string;
          email: string;
          role: "owner" | "admin";
        }>;
      };
      is_event_owner: {
        Args: {
          target_event_id: string;
        };
        Returns: boolean;
      };
      search_event_admin_candidates: {
        Args: {
          target_event_id: string;
          search_query: string;
        };
        Returns: Array<{
          user_id: string;
          display_name: string;
          email: string;
          has_access: boolean;
        }>;
      };
      verify_event_viewer_access: {
        Args: {
          event_slug: string;
          submitted_code: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
