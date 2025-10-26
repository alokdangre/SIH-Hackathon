import Cookies from "js-cookie";
import { User } from "./types";

const TOKEN_KEY = "access_token";

export const getStoredUser = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("user", JSON.stringify(user));
  }
};

export const setStoredToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
};

export const clearAuth = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("user");
  }
};

export const isAuthenticated = (): boolean => {
  const localToken = getStoredToken();
  const user = getStoredUser();
  return !!localToken && !!user;
};

export const requireAuth = () => {
  if (typeof window !== "undefined" && !isAuthenticated()) {
    window.location.href = "/login";
  }
};
