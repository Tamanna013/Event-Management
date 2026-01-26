import { io } from "socket.io-client";
import store from "../store";
import { addNotification } from "../store/slices/notificationSlice";
import { addMessage } from "../store/slices/messageSlice";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    const token = localStorage.getItem("token");
    if (!token) return;
    /*
    this.socket = io("http://localhost:8000", {
      auth: { token },
      transports: ["websocket"],
    });

    this.setupEventListeners();
*/
    console.log(
      "WebSocket connection skipped: Backend is currently HTTP-only.",
    );
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.emit("user_online", { userId: store.getState().auth.user?.id });
    });

    this.socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    // Real-time notifications
    this.socket.on("notification", (data) => {
      store.dispatch(addNotification(data));
    });

    // Real-time messages
    this.socket.on("message", (data) => {
      store.dispatch(addMessage(data));
    });

    // Event updates
    this.socket.on("event_update", (data) => {
      console.log("Event updated:", data);
    });

    // Resource booking updates
    this.socket.on("booking_update", (data) => {
      console.log("Booking updated:", data);
    });

    // Custom event listeners
    this.socket.onAny((event, ...args) => {
      const listeners = this.listeners.get(event) || [];
      listeners.forEach((listener) => listener(...args));
    });
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  joinRoom(room) {
    this.emit("join_room", { room });
  }

  leaveRoom(room) {
    this.emit("leave_room", { room });
  }

  sendMessage(threadId, content, attachments = []) {
    this.emit("send_message", {
      thread_id: threadId,
      content,
      attachments,
    });
  }

  markMessageAsRead(messageId) {
    this.emit("mark_read", { message_id: messageId });
  }

  typing(threadId, isTyping) {
    this.emit("typing", {
      thread_id: threadId,
      is_typing: isTyping,
    });
  }
}

const websocketService = new WebSocketService();
export default websocketService;
