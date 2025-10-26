import axios from "axios";
import { getStoredToken, clearAuth } from "./auth";

const api = axios.create({
    baseURL: "http://localhost:8000",
    withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearAuth();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;