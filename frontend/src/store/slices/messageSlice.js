import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchThreads = createAsyncThunk(
  "messages/fetchThreads",
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get("/messaging/threads/", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (threadId, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/messaging/threads/${threadId}/messages/`,
      );
      return { threadId, messages: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const sendMessage = createAsyncThunk(
  "messages/sendMessage",
  async ({ threadId, content, attachments = [] }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/messaging/threads/${threadId}/messages/`,
        {
          content,
          attachments,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const createThread = createAsyncThunk(
  "messages/createThread",
  async (threadData, { rejectWithValue }) => {
    try {
      const response = await api.post("/messaging/threads/", threadData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

const messageSlice = createSlice({
  name: "messages",
  initialState: {
    threads: [],
    activeThread: null,
    messages: {},
    loading: false,
    error: null,
    typingUsers: {},
  },
  reducers: {
    addMessage: (state, action) => {
      const { threadId, message } = action.payload;

      if (!state.messages[threadId]) {
        state.messages[threadId] = [];
      }

      // Check if message already exists
      const existingIndex = state.messages[threadId].findIndex(
        (m) => m.id === message.id,
      );
      if (existingIndex === -1) {
        state.messages[threadId].push(message);
      }

      // Update thread's last message and order
      const threadIndex = state.threads.findIndex((t) => t.id === threadId);
      if (threadIndex !== -1) {
        state.threads[threadIndex].last_message = message;
        state.threads[threadIndex].updated_at = message.created_at;

        // Move thread to top
        const thread = state.threads.splice(threadIndex, 1)[0];
        state.threads.unshift(thread);
      }
    },
    setTypingUser: (state, action) => {
      const { threadId, userId, isTyping } = action.payload;

      if (!state.typingUsers[threadId]) {
        state.typingUsers[threadId] = {};
      }

      if (isTyping) {
        state.typingUsers[threadId][userId] = Date.now();
      } else {
        delete state.typingUsers[threadId][userId];
      }
    },
    setActiveThread: (state, action) => {
      state.activeThread = action.payload;
    },
    markMessageAsRead: (state, action) => {
      const { threadId, messageId, userId } = action.payload;

      if (state.messages[threadId]) {
        const message = state.messages[threadId].find(
          (m) => m.id === messageId,
        );
        if (message && message.sender.id !== userId) {
          message.is_read = true;
          message.read_receipts = message.read_receipts || [];
          if (!message.read_receipts.find((r) => r.user.id === userId)) {
            message.read_receipts.push({
              user: { id: userId },
              read_at: new Date().toISOString(),
            });
          }
        }
      }
    },
    clearMessages: (state) => {
      state.messages = {};
      state.threads = [];
      state.activeThread = null;
      state.typingUsers = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch threads
      .addCase(fetchThreads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchThreads.fulfilled, (state, action) => {
        state.loading = false;
        state.threads = action.payload;
      })
      .addCase(fetchThreads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { threadId, messages } = action.payload;
        state.messages[threadId] = messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Send message
      .addCase(sendMessage.fulfilled, (state, action) => {
        const message = action.payload;
        const threadId = message.thread.id;

        if (!state.messages[threadId]) {
          state.messages[threadId] = [];
        }

        state.messages[threadId].push(message);

        // Update thread
        const threadIndex = state.threads.findIndex((t) => t.id === threadId);
        if (threadIndex !== -1) {
          state.threads[threadIndex].last_message = message;
          state.threads[threadIndex].updated_at = message.created_at;

          // Move thread to top
          const thread = state.threads.splice(threadIndex, 1)[0];
          state.threads.unshift(thread);
        }
      })
      // Create thread
      .addCase(createThread.fulfilled, (state, action) => {
        state.threads.unshift(action.payload);
        state.activeThread = action.payload.id;
      });
  },
});

export const {
  addMessage,
  setTypingUser,
  setActiveThread,
  markMessageAsRead,
  clearMessages,
} = messageSlice.actions;

export default messageSlice.reducer;
