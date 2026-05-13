
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://inv-flask-api.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
  // No withCredentials — we use JWT Bearer tokens, not cookies
});

export default apiClient;
