// API Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: "farmer" | "buyer" | "admin";
  kyc_status: string;
  kyc_document_url?: string;
  wallet_address?: string;
  profile_data?: Record<string, any>;
  created_at: string;
}

export interface Listing {
  id: number;
  commodity: string;
  variety?: string;
  qty_kg: number;
  price_per_kg: number;
  moisture_pct?: number;
  quality_notes?: string;
  photos: string[];
  location?: string;
  status: "active" | "closed" | "draft";
  seller_id: number;
  seller_alias: string;
  created_at: string;
  updated_at: string;
}

export interface ListingDetail extends Listing {
  offers_summary: {
    total_offers: number;
    active_offers: number;
    last_offer_status?: ContractStatus;
  };
}

export type ContractStatus = 
  | "draft" 
  | "offered" 
  | "accepted" 
  | "awaiting_settlement" 
  | "completed" 
  | "disputed";

export interface Contract {
  id: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  qty_kg: number;
  offer_price_per_kg: number;
  status: ContractStatus;
  expiry_date?: string;
  escrow_tx?: string;
  created_at: string;
  updated_at: string;
  listing_ref?: string;
  counterparty_name?: string;
}

export interface ContractDetail extends Contract {
  timeline: ContractEvent[];
}

export interface ContractEvent {
  status: ContractStatus;
  actor_id?: number;
  action: string;
  timestamp: string;
  payload: Record<string, any>;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  payload: Record<string, any>;
  read: boolean;
  created_at: string;
}

// API Response Types
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ListingsResponse {
  listings: Listing[];
  meta: PaginationMeta;
}

export interface ContractsResponse {
  contracts: Contract[];
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  name: string;
  email: string;
  password: string;
  role: "farmer" | "buyer";
}

export interface ListingForm {
  commodity: string;
  variety?: string;
  qty_kg: number;
  price_per_kg: number;
  moisture_pct?: number;
  quality_notes?: string;
  location?: string;
  photos?: FileList;
}

export interface ContractForm {
  listing_id: number;
  qty: number;
  offer_price_per_kg: number;
  expiry_date?: string;
}
