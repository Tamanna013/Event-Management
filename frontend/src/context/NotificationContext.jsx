import React, { createContext, useContext, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchNotifications,
  addNotification,
} from "../store/slices/notificationSlice";
import useWebSocket from "../hooks/useWebSocket";

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const dispatch = useDispatch();
  const ws = useWebSocket();
  const [wsConnected, setWsConnected] = useState(false);

  const { notifications, unreadCount } = useSelector(
    (state) => state.notifications,
  );
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
    }
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (!ws || !isAuthenticated) return;

    const handleNotification = (data) => {
      dispatch(addNotification(data.notification));
    };

    ws.on("notification", handleNotification);

    return () => {
      ws.off("notification", handleNotification);
    };
  }, [ws, isAuthenticated, dispatch]);

  const value = {
    notifications,
    unreadCount,
    wsConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
