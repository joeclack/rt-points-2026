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
          football_enabled: boolean;
          team_size: number;
          football_match_minutes: number;
          sport: "football" | "basketball";
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
          football_enabled?: boolean;
          team_size?: number;
          football_match_minutes?: number;
          sport?: "football" | "basketball";
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
          football_enabled?: boolean;
          team_size?: number;
          football_match_minutes?: number;
          sport?: "football" | "basketball";
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
      team_join_requests: {
        Row: {
          id: string;
          event_id: string;
          team_name: string;
          team_colour: string;
          status: "pending" | "accepted" | "rejected";
          created_team_id: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          submission_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          team_name: string;
          team_colour: string;
          status?: "pending" | "accepted" | "rejected";
          created_team_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          submission_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          team_name?: string;
          team_colour?: string;
          status?: "pending" | "accepted" | "rejected";
          created_team_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          submission_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_join_requests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_join_requests_created_team_id_fkey";
            columns: ["created_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_join_request_players: {
        Row: {
          request_id: string;
          slot: number;
          name: string;
        };
        Insert: {
          request_id: string;
          slot: number;
          name: string;
        };
        Update: {
          request_id?: string;
          slot?: number;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_join_request_players_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "team_join_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      football_tournaments: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          format: "league" | "knockout";
          start_stage: "quarter_final" | "semi_final" | "final" | null;
          status: "scheduled" | "live" | "completed";
          win_points: number;
          draw_points: number;
          loss_points: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          format: "league" | "knockout";
          start_stage?: "quarter_final" | "semi_final" | "final" | null;
          status?: "scheduled" | "live" | "completed";
          win_points?: number;
          draw_points?: number;
          loss_points?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          format?: "league" | "knockout";
          start_stage?: "quarter_final" | "semi_final" | "final" | null;
          status?: "scheduled" | "live" | "completed";
          win_points?: number;
          draw_points?: number;
          loss_points?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "football_tournaments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      football_tournament_teams: {
        Row: {
          tournament_id: string;
          team_id: string;
          seed: number;
          created_at: string;
        };
        Insert: {
          tournament_id: string;
          team_id: string;
          seed: number;
          created_at?: string;
        };
        Update: {
          tournament_id?: string;
          team_id?: string;
          seed?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "football_tournament_teams_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "football_tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "football_tournament_teams_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      football_matches: {
        Row: {
          id: string;
          tournament_id: string;
          event_id: string;
          home_team_id: string | null;
          away_team_id: string | null;
          stage:
            | "league"
            | "round_of_16"
            | "quarter_final"
            | "semi_final"
            | "third_place"
            | "final"
            | "friendly";
          round_number: number;
          position: number;
          kickoff_at: string | null;
          venue: string | null;
          status:
            | "scheduled"
            | "live"
            | "halftime"
            | "full_time"
            | "postponed"
            | "cancelled";
          home_score: number;
          away_score: number;
          winner_team_id: string | null;
          next_match_id: string | null;
          next_match_slot: "home" | "away" | null;
          started_at: string | null;
          second_half_started_at: string | null;
          stoppage_started_at: string | null;
          first_half_stoppage_seconds: number;
          second_half_stoppage_seconds: number;
          control_version: number;
          controller_device_id: string | null;
          controller_claimed_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          event_id: string;
          home_team_id?: string | null;
          away_team_id?: string | null;
          stage:
            | "league"
            | "round_of_16"
            | "quarter_final"
            | "semi_final"
            | "third_place"
            | "final"
            | "friendly";
          round_number?: number;
          position?: number;
          kickoff_at?: string | null;
          venue?: string | null;
          status?:
            | "scheduled"
            | "live"
            | "halftime"
            | "full_time"
            | "postponed"
            | "cancelled";
          home_score?: number;
          away_score?: number;
          winner_team_id?: string | null;
          next_match_id?: string | null;
          next_match_slot?: "home" | "away" | null;
          started_at?: string | null;
          second_half_started_at?: string | null;
          stoppage_started_at?: string | null;
          first_half_stoppage_seconds?: number;
          second_half_stoppage_seconds?: number;
          control_version?: number;
          controller_device_id?: string | null;
          controller_claimed_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          event_id?: string;
          home_team_id?: string | null;
          away_team_id?: string | null;
          stage?:
            | "league"
            | "round_of_16"
            | "quarter_final"
            | "semi_final"
            | "third_place"
            | "final"
            | "friendly";
          round_number?: number;
          position?: number;
          kickoff_at?: string | null;
          venue?: string | null;
          status?:
            | "scheduled"
            | "live"
            | "halftime"
            | "full_time"
            | "postponed"
            | "cancelled";
          home_score?: number;
          away_score?: number;
          winner_team_id?: string | null;
          next_match_id?: string | null;
          next_match_slot?: "home" | "away" | null;
          started_at?: string | null;
          second_half_started_at?: string | null;
          stoppage_started_at?: string | null;
          first_half_stoppage_seconds?: number;
          second_half_stoppage_seconds?: number;
          control_version?: number;
          controller_device_id?: string | null;
          controller_claimed_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "football_matches_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "football_tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "football_matches_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      football_match_commands: {
        Row: {
          id: string;
          event_id: string;
          tournament_id: string;
          match_id: string;
          actor_id: string;
          command: string;
          payload: Json;
          result: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          event_id: string;
          tournament_id: string;
          match_id: string;
          actor_id: string;
          command: string;
          payload?: Json;
          result: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          tournament_id?: string;
          match_id?: string;
          actor_id?: string;
          command?: string;
          payload?: Json;
          result?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "football_match_commands_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "football_matches";
            referencedColumns: ["id"];
          },
        ];
      };
      football_match_events: {
        Row: {
          id: string;
          event_id: string;
          tournament_id: string;
          match_id: string;
          actor_id: string | null;
          event_type:
            | "score"
            | "kickoff"
            | "halftime"
            | "resume"
            | "pause_clock"
            | "resume_clock"
            | "start_stoppage"
            | "end_stoppage"
            | "claim_control"
            | "take_control"
            | "release_control"
            | "full_time"
            | "reopen"
            | "schedule";
          home_score: number;
          away_score: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          tournament_id: string;
          match_id: string;
          actor_id?: string | null;
          event_type:
            | "score"
            | "kickoff"
            | "halftime"
            | "resume"
            | "pause_clock"
            | "resume_clock"
            | "start_stoppage"
            | "end_stoppage"
            | "claim_control"
            | "take_control"
            | "release_control"
            | "full_time"
            | "reopen"
            | "schedule";
          home_score: number;
          away_score: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          tournament_id?: string;
          match_id?: string;
          actor_id?: string | null;
          event_type?:
            | "score"
            | "kickoff"
            | "halftime"
            | "resume"
            | "pause_clock"
            | "resume_clock"
            | "start_stoppage"
            | "end_stoppage"
            | "claim_control"
            | "take_control"
            | "release_control"
            | "full_time"
            | "reopen"
            | "schedule";
          home_score?: number;
          away_score?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "football_match_events_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "football_matches";
            referencedColumns: ["id"];
          },
        ];
      };
      basketball_tournaments: {
        Row: { id: string; event_id: string; name: string; format: "league" | "knockout"; start_stage: "quarter_final" | "semi_final" | "final" | null; status: "scheduled" | "live" | "completed"; game_minutes: number; created_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; event_id: string; name: string; format: "league" | "knockout"; start_stage?: "quarter_final" | "semi_final" | "final" | null; status?: "scheduled" | "live" | "completed"; game_minutes?: number; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; event_id?: string; name?: string; format?: "league" | "knockout"; start_stage?: "quarter_final" | "semi_final" | "final" | null; status?: "scheduled" | "live" | "completed"; game_minutes?: number; created_by?: string | null; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "basketball_tournaments_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "events"; referencedColumns: ["id"] }];
      };
      basketball_tournament_teams: {
        Row: { tournament_id: string; team_id: string; seed: number; created_at: string };
        Insert: { tournament_id: string; team_id: string; seed: number; created_at?: string };
        Update: { tournament_id?: string; team_id?: string; seed?: number; created_at?: string };
        Relationships: [
          { foreignKeyName: "basketball_tournament_teams_tournament_id_fkey"; columns: ["tournament_id"]; isOneToOne: false; referencedRelation: "basketball_tournaments"; referencedColumns: ["id"] },
          { foreignKeyName: "basketball_tournament_teams_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] },
        ];
      };
      basketball_matches: {
        Row: { id: string; tournament_id: string; event_id: string; home_team_id: string | null; away_team_id: string | null; stage: "league" | "quarter_final" | "semi_final" | "third_place" | "final" | "friendly"; round_number: number; position: number; tipoff_at: string | null; court: string | null; status: "scheduled" | "live" | "full_time" | "postponed" | "cancelled"; home_score: number; away_score: number; winner_team_id: string | null; next_match_id: string | null; next_match_slot: "home" | "away" | null; started_at: string | null; ended_at: string | null; control_version: number; created_at: string; updated_at: string };
        Insert: { id?: string; tournament_id: string; event_id: string; home_team_id?: string | null; away_team_id?: string | null; stage: "league" | "quarter_final" | "semi_final" | "third_place" | "final" | "friendly"; round_number?: number; position?: number; tipoff_at?: string | null; court?: string | null; status?: "scheduled" | "live" | "full_time" | "postponed" | "cancelled"; home_score?: number; away_score?: number; winner_team_id?: string | null; next_match_id?: string | null; next_match_slot?: "home" | "away" | null; started_at?: string | null; ended_at?: string | null; control_version?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; tournament_id?: string; event_id?: string; home_team_id?: string | null; away_team_id?: string | null; stage?: "league" | "quarter_final" | "semi_final" | "third_place" | "final" | "friendly"; round_number?: number; position?: number; tipoff_at?: string | null; court?: string | null; status?: "scheduled" | "live" | "full_time" | "postponed" | "cancelled"; home_score?: number; away_score?: number; winner_team_id?: string | null; next_match_id?: string | null; next_match_slot?: "home" | "away" | null; started_at?: string | null; ended_at?: string | null; control_version?: number; created_at?: string; updated_at?: string };
        Relationships: [
          { foreignKeyName: "basketball_matches_tournament_id_fkey"; columns: ["tournament_id"]; isOneToOne: false; referencedRelation: "basketball_tournaments"; referencedColumns: ["id"] },
          { foreignKeyName: "basketball_matches_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "events"; referencedColumns: ["id"] },
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
      get_public_football_for_viewer: {
        Args: {
          event_slug: string;
          submitted_code?: string;
        };
        Returns: Json;
      };
      get_public_basketball_for_viewer: {
        Args: {
          event_slug: string;
          submitted_code?: string;
        };
        Returns: Json;
      };
      apply_football_match_command: {
        Args: {
          p_match_id: string;
          p_command: string;
          p_command_id: string;
          p_expected_version?: number | null;
          p_payload?: Json;
        };
        Returns: Json;
      };
      apply_basketball_match_command: {
        Args: {
          p_match_id: string;
          p_command: string;
          p_command_id: string;
          p_expected_version?: number | null;
          p_payload?: Json;
        };
        Returns: Json;
      };
      create_basketball_tournament_atomic: {
        Args: {
          p_tournament_id: string;
          p_event_id: string;
          p_name: string;
          p_format: "league" | "knockout";
          p_start_stage: "quarter_final" | "semi_final" | "final" | null;
          p_game_minutes: number;
          p_team_ids: string[];
          p_fixtures: Json;
        };
        Returns: string;
      };
      create_football_tournament_atomic: {
        Args: {
          p_tournament_id: string;
          p_event_id: string;
          p_name: string;
          p_format: "league" | "knockout";
          p_start_stage: "quarter_final" | "semi_final" | "final" | null;
          p_team_ids: string[];
          p_fixtures: Json;
        };
        Returns: string;
      };
      set_event_archived: {
        Args: {
          p_event_id: string;
          p_archived: boolean;
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
      submit_team_join_request: {
        Args: {
          event_slug: string;
          submitted_code: string;
          submitted_team_name: string;
          submitted_team_colour: string;
          submitted_player_names: string[];
          submitted_submission_id: string;
        };
        Returns: string;
      };
      review_team_join_request: {
        Args: {
          target_request_id: string;
          expected_event_id: string;
          decision: "accepted" | "rejected";
        };
        Returns: string | null;
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
