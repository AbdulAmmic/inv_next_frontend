
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://invflask-ammicsystems4174-ryzs6dmm.leapcell.dev",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default apiClient;
