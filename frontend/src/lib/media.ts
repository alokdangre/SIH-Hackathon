import { API_BASE_URL } from "./axios";

export const resolveMediaUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!path.startsWith("/")) {
    return `${API_BASE_URL.replace(/\/$/, "")}/${path}`;
  }
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
};
