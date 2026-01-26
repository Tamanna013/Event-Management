import React, { useState } from "react";
import { Outlet, Link as RouterLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from "@mui/icons-material";

import { logout } from "../store/slices/AuthSlice";
import { toggleDarkMode } from "../store/slices/uiSlice";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../context/NotificationBell";

const drawerWidth = 280;

const MainLayout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const { darkMode } = useSelector((state) => state.ui);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Clubs", icon: <GroupIcon />, path: "/clubs" },
    { text: "Events", icon: <EventIcon />, path: "/events" },
    { text: "Resources", icon: <BusinessIcon />, path: "/resources" },
    { text: "Messages", icon: <MessageIcon />, path: "/messages" },
  ];

  const adminItems = [
    { text: "Analytics", icon: <AnalyticsIcon />, path: "/analytics" },
    { text: "Admin Panel", icon: <AdminIcon />, path: "/admin" },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    handleMenuClose();
  };

  const handleThemeToggle = () => {
    dispatch(toggleDarkMode());
  };

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo */}
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            background: "linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          CampusHub
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user?.department || "Campus Management"}
        </Typography>
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* User Profile */}
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          src={user?.profile_picture}
          sx={{
            width: 56,
            height: 56,
            border: "2px solid",
            borderColor: "primary.main",
          }}
        >
          {user?.first_name?.[0] || user?.email?.[0]}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="600">
            {user?.first_name || user?.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role?.toUpperCase()}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              sx={{
                borderRadius: 2,
                mx: 1,
                "&.active": {
                  backgroundColor: "primary.main",
                  color: "white",
                  "& .MuiListItemIcon-root": {
                    color: "white",
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}

        {/* Admin Items */}
        {user?.role === "admin" && (
          <>
            <Divider sx={{ my: 2, mx: 2 }} />
            <Typography
              variant="caption"
              sx={{ px: 3, py: 1, color: "text.secondary" }}
            >
              ADMINISTRATION
            </Typography>
            {adminItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    "&.active": {
                      backgroundColor: "primary.main",
                      color: "white",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}
      </List>

      {/* Bottom Actions */}
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={handleThemeToggle}
          sx={{ borderRadius: 2, mb: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </ListItemIcon>
          <ListItemText primary={darkMode ? "Light Mode" : "Dark Mode"} />
        </ListItemButton>
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Campus Management System
          </Typography>

          {/* Quick Actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {user?.role === "organizer" && (
              <Tooltip title="Create Event">
                <IconButton
                  color="inherit"
                  component={RouterLink}
                  to="/events/create"
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            )}

            <NotificationBell />

            <Tooltip title="Profile">
              <IconButton onClick={handleMenuOpen} color="inherit">
                <Avatar
                  src={user?.profile_picture}
                  sx={{ width: 32, height: 32 }}
                >
                  {user?.first_name?.[0] || user?.email?.[0]}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: 2,
                background: "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)",
              },
            }}
          >
            <MenuItem
              component={RouterLink}
              to="/profile"
              onClick={handleMenuClose}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              My Profile
            </MenuItem>
            <MenuItem
              component={RouterLink}
              to="/notifications"
              onClick={handleMenuClose}
            >
              <ListItemIcon>
                <NotificationsIcon fontSize="small" />
              </ListItemIcon>
              Notifications
              <Badge badgeContent={4} color="primary" sx={{ ml: 2 }} />
            </MenuItem>
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: "block", md: "none" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: "none", md: "block" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: "64px",
          minHeight: "calc(100vh - 64px)",
          backgroundColor: "background.default",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
