import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getApiErrorMessage,
  whatsappService,
} from "~/services/whatsappService";
import type { WhatsAppStatusData } from "~/types/whatsapp.interface";

// The WhatsApp connection lives on the backend; this slice only mirrors the
// last status the backend reported.
interface WhatsAppState {
  status: WhatsAppStatusData | null;
  loading: boolean; // first status load
  action: "connect" | "logout" | "change-number" | null; // action in flight
  error: string | null;
}

const initialState: WhatsAppState = {
  status: null,
  loading: false,
  action: null,
  error: null,
};

//#region fetch status
export const fetchWhatsAppStatus = createAsyncThunk(
  "whatsapp/fetchStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await whatsappService.getStatus();
      return response.data as WhatsAppStatusData;
    } catch (error: any) {
      return rejectWithValue(
        getApiErrorMessage(error, "Couldn't load WhatsApp status"),
      );
    }
  },
);

//#region connect
export const connectWhatsApp = createAsyncThunk(
  "whatsapp/connect",
  async (_, { rejectWithValue }) => {
    try {
      const response = await whatsappService.connect();
      return response.data as WhatsAppStatusData;
    } catch (error: any) {
      return rejectWithValue(
        getApiErrorMessage(error, "Couldn't start WhatsApp"),
      );
    }
  },
);

//#region logout
export const logoutWhatsApp = createAsyncThunk(
  "whatsapp/logout",
  async (_, { rejectWithValue }) => {
    try {
      const response = await whatsappService.logout();
      return response.data as WhatsAppStatusData;
    } catch (error: any) {
      return rejectWithValue(
        getApiErrorMessage(error, "Couldn't log out of WhatsApp"),
      );
    }
  },
);

//#region change number
export const changeWhatsAppNumber = createAsyncThunk(
  "whatsapp/changeNumber",
  async (_, { rejectWithValue }) => {
    try {
      const response = await whatsappService.changeNumber();
      return response.data as WhatsAppStatusData;
    } catch (error: any) {
      return rejectWithValue(
        getApiErrorMessage(error, "Couldn't change the WhatsApp number"),
      );
    }
  },
);

const whatsappSlice = createSlice({
  name: "whatsapp",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWhatsAppStatus.pending, (state) => {
        if (!state.status) state.loading = true;
      })
      .addCase(fetchWhatsAppStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
        state.error = null;
      })
      .addCase(fetchWhatsAppStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    const actions = [
      [connectWhatsApp, "connect"],
      [logoutWhatsApp, "logout"],
      [changeWhatsAppNumber, "change-number"],
    ] as const;
    for (const [thunk, name] of actions) {
      builder
        .addCase(thunk.pending, (state) => {
          state.action = name;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.action = null;
          state.status = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.action = null;
          state.error = action.payload as string;
        });
    }
  },
});

export default whatsappSlice.reducer;
