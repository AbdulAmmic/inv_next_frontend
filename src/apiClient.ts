
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://invflask-connectorstech7925-12l4k6at.leapcell.dev",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default apiClient;
