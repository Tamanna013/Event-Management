import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// Login async thunk
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Try these common login endpoints:
      // Option 1: /api/auth/login/  (single "auth")
      const response = await api.post("/auth/login/", {
        email,
        password,
      });

      // Option 2: /api/token/  (for JWT)
      // const response = await api.post("/token/", {
      //   email,
      //   password,
      // });

      // Option 3: /api/auth/token/  (for JWT)
      // const response = await api.post("/auth/token/", {
      //   email,
      //   password,
      // });

      localStorage.setItem("token", response.data.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// Register async thunk
// In your AuthSlice.js, the register action should look like this:
export const register = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/auth/register/", {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirm_password: userData.confirm_password, // ← MUST INCLUDE THIS
        first_name: userData.first_name,
        last_name: userData.last_name,
        department: userData.department,
        year: userData.year,
        role: userData.role,
        phone_number: userData.phone_number || "",
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// Logout async thunk
export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/auth/logout/");
      localStorage.removeItem("token");
      return null;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// Fetch profile async thunk
// Change this in AuthSlice.js - Line 30
export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      // Try different endpoints until one works:
      // Option 1: /api/auth/user/
      const response = await api.get("/auth/user/");

      // Option 2: /api/auth/me/
      // const response = await api.get("/auth/me/");

      // Option 3: /api/user/profile/
      // const response = await api.get("/user/profile/");

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchUserProfile = createAsyncThunk(
  "auth/fetchUserProfile",
  async () => {
    const response = await api.get("/users/profile/"); // or /users/me/
    return response.data;
  },
);

// Update profile async thunk (THIS WAS MISSING)
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.put("/users/profile/", userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// Change password async thunk (Add this too)
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (passwordData, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/change-password/", passwordData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: localStorage.getItem("token"),
    isAuthenticated: !!localStorage.getItem("token"),
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem("token", action.payload);
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Fetch Profile
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        if (action.payload?.status === 401) {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
          localStorage.removeItem("token");
        }
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const { clearError, setToken, setUser } = authSlice.actions;

// Export reducer
export default authSlice.reducer;

// Export all async thunks for convenience
export const authActions = {
  login,
  register,
  logout,
  fetchProfile,
  updateProfile,
  changePassword,
};
