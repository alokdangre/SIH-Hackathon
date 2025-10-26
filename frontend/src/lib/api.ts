import api from "./axios";
import {
  LoginForm,
  LoginResponse,
  SignupForm,
  User,
  ListingsResponse,
  ListingDetail,
  ContractsResponse,
  ContractDetail,
  NotificationsResponse,
  ContractForm,
} from "./types";

// Auth API
export const authApi = {
  login: (data: LoginForm): Promise<LoginResponse> =>
    api.post("/auth/login", data).then((res) => res.data),

  signup: (data: SignupForm): Promise<User> =>
    api.post("/auth/signup", data).then((res) => res.data),
};

// Listings API
export const listingsApi = {
  getListings: (params?: {
    commodity?: string;
    min_qty?: number;
    max_price?: number;
    location?: string;
    page?: number;
    limit?: number;
  }): Promise<ListingsResponse> =>
    api.get("/listings/", { params }).then((res) => res.data),

  getListing: (id: number): Promise<ListingDetail> =>
    api.get(`/listings/${id}`).then((res) => res.data),

  createListing: (data: FormData): Promise<any> =>
    api.post("/listings/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => res.data),
};

// Contracts API
export const contractsApi = {
  getContracts: (userId?: number): Promise<ContractsResponse> =>
    api.get("/contracts/", { params: { user_id: userId } }).then((res) => res.data),

  getContract: (id: number): Promise<ContractDetail> =>
    api.get(`/contracts/${id}`).then((res) => res.data),

  createContract: (data: ContractForm): Promise<any> =>
    api.post("/contracts/", data).then((res) => res.data),

  acceptContract: (id: number, accepterId: number): Promise<any> =>
    api.post(`/contracts/${id}/accept`, { accepter_id: accepterId }).then((res) => res.data),

  confirmDelivery: (id: number): Promise<any> =>
    api.post(`/contracts/${id}/confirm-delivery`).then((res) => res.data),

  raiseDispute: (id: number, reason: string, evidenceUrls: string[] = []): Promise<any> =>
    api.post(`/contracts/${id}/raise-dispute`, {
      reason,
      evidence_urls: evidenceUrls,
    }).then((res) => res.data),
};

// Notifications API
export const notificationsApi = {
  getNotifications: (page = 1, limit = 20): Promise<NotificationsResponse> =>
    api.get("/notifications/", { params: { page, limit } }).then((res) => res.data),

  markAsRead: (notificationIds: number[]): Promise<void> =>
    api.post("/notifications/mark-read", { notification_ids: notificationIds }),
};

// Escrow API
export const escrowApi = {
  createEscrow: (data: {
    contract_id: number;
    buyer_id: number;
    seller_id: number;
    expected_amount_wei: number;
    create_on_chain: boolean;
    metadata?: any;
  }): Promise<any> =>
    api.post("/escrow/create", data).then((res) => res.data),

  fundEscrow: (data: {
    escrow_id: number;
    tx_hash?: string;
    use_custodial: boolean;
  }): Promise<any> =>
    api.post("/escrow/fund", data).then((res) => res.data),

  getEscrowStatus: (escrowId: number): Promise<any> =>
    api.get(`/escrow/${escrowId}/status`).then((res) => res.data),

  getEscrowByContract: (contractId: number): Promise<any> =>
    api.get("/escrow/", { params: { contract_id: contractId } }).then((res) => {
      // Return the first escrow for this contract
      const escrows = res.data.escrows || [];
      if (escrows.length === 0) {
        throw { response: { status: 404 } };
      }
      return escrows[0];
    }),

  confirmDelivery: (data: {
    escrow_id: number;
    use_custodial: boolean;
  }): Promise<any> =>
    api.post(`/escrow/${data.escrow_id}/confirm-delivery`, data).then((res) => res.data),

  raiseDispute: (data: {
    escrow_id: number;
    reason: string;
    evidence_urls: string[];
  }): Promise<any> =>
    api.post(`/escrow/${data.escrow_id}/raise-dispute`, data).then((res) => res.data),

  listEscrows: (params?: {
    page?: number;
    limit?: number;
    state?: string;
    contract_id?: number;
  }): Promise<any> =>
    api.get("/escrow/", { params }).then((res) => res.data),

  resolveDispute: (data: {
    escrow_id: number;
    outcome: string;
    payout_address?: string;
    payout_amount_wei?: number;
    resolution_notes: string;
  }): Promise<any> =>
    api.post(`/escrow/${data.escrow_id}/resolve`, data).then((res) => res.data),

  listDisputes: (params?: {
    page?: number;
    limit?: number;
  }): Promise<any> =>
    api.get("/escrow/admin/disputes", { params }).then((res) => res.data),
};
