
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://player-linear-mills-newcastle.trycloudflare.com",
  headers: {
    "Content-Type": "application/json",
  },
  // No withCredentials — we use JWT Bearer tokens, not cookies
});

export default apiClient;
