import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Provider } from "react-redux";
import { HelmetProvider } from "react-helmet-async";

import theme from "./theme";
import store from "./store/index"; // Updated import
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";

// Layouts
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

// Pages
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile/Profile";
import Clubs from "./pages/Clubs/Clubs";
import ClubDetails from "./pages/Clubs/ClubDetails";
import Events from "./pages/Events/Events";
import EventDetails from "./pages/Events/EventDetails";
import CreateEvent from "./pages/Events/CreateEvent";
import Resources from "./pages/Resources/Resources";
import ResourceDetails from "./pages/Resources/ResourceDetails";
import BookResource from "./pages/Resources/BookResource";
import Analytics from "./pages/Analytics/Analytics";
import Messages from "./pages/Messages/Messages";
import Notifications from "./pages/Notifications/Notifications";
import Admin from "./pages/Admin/Admin";

// Components
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";

function App() {
  return (
    <HelmetProvider>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <NotificationProvider>
              <Router>
                <Routes>
                  {/* Auth Routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPassword />}
                    />
                  </Route>

                  {/* Protected Routes */}
                  <Route
                    element={
                      <PrivateRoute>
                        <MainLayout />
                      </PrivateRoute>
                    }
                  >
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/clubs" element={<Clubs />} />
                    <Route path="/clubs/:id" element={<ClubDetails />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/create" element={<CreateEvent />} />
                    <Route path="/events/:id" element={<EventDetails />} />
                    <Route path="/resources" element={<Resources />} />
                    <Route
                      path="/resources/:id"
                      element={<ResourceDetails />}
                    />
                    <Route
                      path="/resources/book/:id"
                      element={<BookResource />}
                    />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/notifications" element={<Notifications />} />
                    {/* Admin Routes */}
                    <Route
                      path="/admin"
                      element={
                        <AdminRoute>
                          <Admin />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <AdminRoute>
                          <Analytics />
                        </AdminRoute>
                      }
                    />
                  </Route>

                  {/* 404 Route */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Router>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </Provider>
    </HelmetProvider>
  );
}

export default App;
