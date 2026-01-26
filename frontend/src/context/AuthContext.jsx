import React, { createContext, useContext, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchProfile, setUser, setToken } from "../store/slices/AuthSlice";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated, loading, error } = useSelector(
    (state) => state.auth,
  );
  const [initialized, setInitialized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status once on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Prevent multiple checks
      if (authChecked) return;

      const storedToken = localStorage.getItem("token");
      console.log("Auth check - Token exists:", !!storedToken);

      if (storedToken) {
        try {
          console.log("Fetching profile with token...");
          await dispatch(fetchProfile()).unwrap();
          console.log("Profile fetched successfully");
        } catch (error) {
          console.error("Profile fetch failed:", error);
          // Token is invalid, clear it
          localStorage.removeItem("token");
          dispatch(setUser(null));
          dispatch(setToken(null));
        }
      } else {
        console.log("No token found, user is not authenticated");
      }

      setAuthChecked(true);
      setInitialized(true);
    };

    checkAuthStatus();
  }, [dispatch, authChecked]); // Only run when authChecked changes

  const loginUser = async (email, password) => {
    try {
      // Updated from "/auth/auth/login/" to "/auth/login/"
      const response = await api.post("/auth/login/", { email, password });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      dispatch(setToken(token));
      dispatch(setUser(user));

      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: error.response?.data };
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    dispatch(setUser(null));
    dispatch(setToken(null));
  };

  const value = {
    user,
    isAuthenticated: !!user && !!token, // More reliable check
    loading: loading || !initialized,
    error,
    login: loginUser,
    logout: logoutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
