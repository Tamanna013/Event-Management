import { useEffect } from "react";
import { useSelector } from "react-redux";
import websocketService from "../services/websocket";

const useWebSocket = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect();
    }

    return () => {
      if (isAuthenticated) {
        websocketService.disconnect();
      }
    };
  }, [isAuthenticated]);

  return websocketService;
};

export default useWebSocket;
