// Generated from the live Supabase schema (project bcskupguftgwjcpkvnoo). Do not edit by hand.
// Regenerate after a migration: npx supabase gen types typescript --project-id bcskupguftgwjcpkvnoo > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      amenities: {
        Row: { id: number; name: string; slug: string };
        Insert: { id?: never; name: string; slug: string };
        Update: { id?: never; name?: string; slug?: string };
        Relationships: [];
      };
      app_users: {
        Row: { created_at: string; email: string; id: string; password_hash: string };
        Insert: { created_at?: string; email: string; id?: string; password_hash: string };
        Update: { created_at?: string; email?: string; id?: string; password_hash?: string };
        Relationships: [];
      };
      check_ins: {
        Row: { checked_in_at: string; gym_id: string; id: string; pass_id: string; user_id: string };
        Insert: { checked_in_at?: string; gym_id: string; id?: string; pass_id: string; user_id: string };
        Update: { checked_in_at?: string; gym_id?: string; id?: string; pass_id?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: 'check_ins_gym_id_fkey'; columns: ['gym_id']; isOneToOne: false; referencedRelation: 'gyms'; referencedColumns: ['id'] },
          { foreignKeyName: 'check_ins_pass_id_fkey'; columns: ['pass_id']; isOneToOne: false; referencedRelation: 'passes'; referencedColumns: ['id'] },
          { foreignKeyName: 'check_ins_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      gym_amenities: {
        Row: { amenity_id: number; gym_id: string };
        Insert: { amenity_id: number; gym_id: string };
        Update: { amenity_id?: number; gym_id?: string };
        Relationships: [
          { foreignKeyName: 'gym_amenities_amenity_id_fkey'; columns: ['amenity_id']; isOneToOne: false; referencedRelation: 'amenities'; referencedColumns: ['id'] },
          { foreignKeyName: 'gym_amenities_gym_id_fkey'; columns: ['gym_id']; isOneToOne: false; referencedRelation: 'gyms'; referencedColumns: ['id'] },
        ];
      };
      gym_photos: {
        Row: { caption: string | null; gym_id: string; id: string; sort_order: number; url: string };
        Insert: { caption?: string | null; gym_id: string; id?: string; sort_order?: number; url: string };
        Update: { caption?: string | null; gym_id?: string; id?: string; sort_order?: number; url?: string };
        Relationships: [
          { foreignKeyName: 'gym_photos_gym_id_fkey'; columns: ['gym_id']; isOneToOne: false; referencedRelation: 'gyms'; referencedColumns: ['id'] },
        ];
      };
      gym_training_styles: {
        Row: { gym_id: string; style_id: number };
        Insert: { gym_id: string; style_id: number };
        Update: { gym_id?: string; style_id?: number };
        Relationships: [
          { foreignKeyName: 'gym_training_styles_gym_id_fkey'; columns: ['gym_id']; isOneToOne: false; referencedRelation: 'gyms'; referencedColumns: ['id'] },
          { foreignKeyName: 'gym_training_styles_style_id_fkey'; columns: ['style_id']; isOneToOne: false; referencedRelation: 'training_styles'; referencedColumns: ['id'] },
        ];
      };
      gyms: {
        Row: {
          address_line1: string | null;
          city: string;
          country: string;
          created_at: string;
          data_source: string | null;
          data_verified_at: string | null;
          description: string | null;
          google_place_id: string | null;
          hours: Json | null;
          id: string;
          is_active: boolean;
          is_partner: boolean;
          lat: number | null;
          lng: number | null;
          location: unknown;
          name: string;
          notes: string | null;
          phone: string | null;
          postal_code: string | null;
          slug: string;
          source_url: string | null;
          state: string;
          stripe_account_id: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          address_line1?: string | null;
          city: string;
          country?: string;
          created_at?: string;
          data_source?: string | null;
          data_verified_at?: string | null;
          description?: string | null;
          google_place_id?: string | null;
          hours?: Json | null;
          id?: string;
          is_active?: boolean;
          is_partner?: boolean;
          lat?: number | null;
          lng?: number | null;
          location?: unknown;
          name: string;
          notes?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          slug: string;
          source_url?: string | null;
          state?: string;
          stripe_account_id?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['gyms']['Insert']>;
        Relationships: [];
      };
      pass_options: {
        Row: {
          created_at: string;
          currency: string;
          duration_days: number;
          gym_id: string;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          pass_type: Database['public']['Enums']['pass_type'];
          price_cents: number;
          price_confidence: Database['public']['Enums']['price_confidence'];
          price_source_url: string | null;
          price_verified_at: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          duration_days: number;
          gym_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          pass_type: Database['public']['Enums']['pass_type'];
          price_cents: number;
          price_confidence?: Database['public']['Enums']['price_confidence'];
          price_source_url?: string | null;
          price_verified_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pass_options']['Insert']>;
        Relationships: [
          { foreignKeyName: 'pass_options_gym_id_fkey'; columns: ['gym_id']; isOneToOne: false; referencedRelation: 'gyms'; referencedColumns: ['id'] },
        ];
      };
      passes: {
        Row: {
          activated_at: string | null;
          code: string;
          created_at: string;
          duration_days: number;
          expires_at: string | null;
          gym_id: string;
          id: string;
          pass_type: Database['public']['Enums']['pass_type'];
          purchase_id: string;
          status: Database['public']['Enums']['pass_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activated_at?: string | null;
          code?: string;
          created_at?: string;
          duration_days: number;
          expires_at?: string | null;
          gym_id: string;
          id?: string;
          pass_type: Database['public']['Enums']['pass_type'];
          purchase_id: string;
          status?: Database['public']['Enums']['pass_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['passes']['Insert']>;
        Relationships: [
          { foreignKeyName: 'passes_gym_id_fkey'; columns: ['gym_id']; isOneToOne: false; referencedRelation: 'gyms'; referencedColumns: ['id'] },
          { foreignKeyName: 'passes_purchase_id_fkey'; columns: ['purchase_id']; isOneToOne: true; referencedRelation: 'purchases'; referencedColumns: ['id'] },
          { foreignKeyName: 'passes_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      profiles: {
        Row: { avatar_url: string | null; created_at: string; display_name: string | null; home_city: string | null; id: string; updated_at: string };
        Insert: { avatar_url?: string | null; created_at?: string; display_name?: string | null; home_city?: string | null; id: string; updated_at?: string };
        Update: { avatar_url?: string | null; created_at?: string; display_name?: string | null; home_city?: string | null; id?: string; updated_at?: string };
        Relationships: [];
      };
      purchases: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          gym_id: string;
          id: string;
          pass_option_id: string;
          platform_fee_cents: number;
          status: Database['public']['Enums']['purchase_status'];
          stripe_payment_intent_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          gym_id: string;
          id?: string;
          pass_option_id: string;
          platform_fee_cents?: number;
          status?: Database['public']['Enums']['purchase_status'];
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['purchases']['Insert']>;
        Relationships: [
          { foreignKeyName: 'purchases_gym_id_fkey'; columns: ['gym_id']; isOneToOne: false; referencedRelation: 'gyms'; referencedColumns: ['id'] },
          { foreignKeyName: 'purchases_pass_option_id_fkey'; columns: ['pass_option_id']; isOneToOne: false; referencedRelation: 'pass_options'; referencedColumns: ['id'] },
          { foreignKeyName: 'purchases_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      saved_gyms: {
        Row: { created_at: string; gym_id: string; user_id: string };
        Insert: { created_at?: string; gym_id: string; user_id: string };
        Update: { created_at?: string; gym_id?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: 'saved_gyms_gym_id_fkey'; columns: ['gym_id']; isOneToOne: false; referencedRelation: 'gyms'; referencedColumns: ['id'] },
          { foreignKeyName: 'saved_gyms_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      training_styles: {
        Row: { id: number; name: string; slug: string };
        Insert: { id?: never; name: string; slug: string };
        Update: { id?: never; name?: string; slug?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      activate_pass: {
        Args: { p_pass_id: string };
        Returns: Database['public']['Tables']['passes']['Row'];
        SetofOptions: { from: '*'; to: 'passes'; isOneToOne: true; isSetofReturn: false };
      };
      expire_passes: { Args: never; Returns: number };
      fulfill_purchase: { Args: { p_purchase_id: string }; Returns: string };
      search_gyms: {
        Args: {
          p_city?: string;
          p_lat?: number;
          p_lng?: number;
          p_max_price_cents?: number;
          p_radius_m?: number;
          p_style_slugs?: string[];
        };
        Returns: {
          address_line1: string;
          amenity_slugs: string[];
          city: string;
          cover_photo_url: string;
          distance_m: number;
          gym_id: string;
          is_partner: boolean;
          lat: number;
          lng: number;
          min_price_cents: number;
          min_price_confidence: Database['public']['Enums']['price_confidence'];
          min_price_pass_type: Database['public']['Enums']['pass_type'];
          name: string;
          slug: string;
          state: string;
          style_slugs: string[];
        }[];
      };
      validate_pass: {
        Args: { p_code: string };
        Returns: {
          expires_at: string;
          gym_id: string;
          is_valid: boolean;
          pass_id: string;
          status: Database['public']['Enums']['pass_status'];
        }[];
      };
    };
    Enums: {
      pass_status: 'inactive' | 'active' | 'expired' | 'cancelled';
      pass_type: 'day' | 'week' | 'month';
      price_confidence: 'official' | 'third_party' | 'unverified';
      purchase_status: 'pending' | 'succeeded' | 'failed' | 'refunded';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
