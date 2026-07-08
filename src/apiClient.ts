
import axios from "axios";
import { getApiBase } from "./apiBase";

const apiClient = axios.create({
  baseURL: getApiBase(),
  headers: {
    "Content-Type": "application/json",
  },
  // No withCredentials — we use JWT Bearer tokens, not cookies
});

// Re-pin the baseURL per request so runtime tunnel-URL discovery applies
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBase();
  return config;
});

export default apiClient;
