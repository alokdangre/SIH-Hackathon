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
