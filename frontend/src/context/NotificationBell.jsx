import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Divider,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} from "../store/slices/notificationSlice";

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector(
    (state) => state.notifications,
  );

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    dispatch(fetchNotifications());
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId) => {
    dispatch(markAsRead(notificationId));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "event_approval":
      case "event_registration":
      case "event_update":
      case "event_reminder":
        return <EventIcon />;
      case "club_invitation":
      case "club_approval":
        return <GroupIcon />;
      case "resource_booking":
      case "booking_approval":
      case "booking_reminder":
        return <BusinessIcon />;
      case "system":
        return <InfoIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "event_approval":
      case "booking_approval":
        return "success.main";
      case "event_reminder":
      case "booking_reminder":
        return "warning.main";
      case "system":
        return "info.main";
      default:
        return "primary.main";
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? "notification-popover" : undefined;

  return (
    <>
      <IconButton color="inherit" onClick={handleClick} aria-describedby={id}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            borderRadius: 2,
            backgroundColor: "background.paper",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" fontWeight="600">
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                sx={{ textTransform: "none" }}
              >
                Mark all as read
              </Button>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <NotificationsIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {notifications.slice(0, 10).map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: notification.is_read
                      ? "transparent"
                      : "action.hover",
                    "&:hover": {
                      backgroundColor: "action.selected",
                    },
                    cursor: "pointer",
                  }}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Box
                      sx={{
                        color: getNotificationColor(
                          notification.notification_type,
                        ),
                      }}
                    >
                      {getNotificationIcon(notification.notification_type)}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight={notification.is_read ? "normal" : "600"}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true },
                          )}
                        </Typography>
                      </>
                    }
                  />
                  {!notification.is_read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "primary.main",
                        ml: 1,
                      }}
                    />
                  )}
                </ListItem>
              ))}
            </List>
          )}

          {notifications.length > 10 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ textAlign: "center" }}>
                <Button
                  component={Link}
                  to="/notifications"
                  variant="text"
                  size="small"
                  onClick={handleClose}
                  sx={{ textTransform: "none" }}
                >
                  View all notifications
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
