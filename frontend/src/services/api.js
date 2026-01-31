// services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add token to EVERY request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    const isAuthRequest =
      config.url.includes("/auth/login") ||
      config.url.includes("/auth/register");

    if (token && !isAuthRequest) {
      config.headers.Authorization = `Token ${token}`;
    }

    console.log("API Request:", {
      url: config.url,
      hasToken: !!token,
      headers: config.headers,
    });

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log("API Response Success:", {
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  (error) => {
    console.error("API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem("token");
      // You could dispatch a logout action here
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
