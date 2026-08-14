import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { groupService } from "~/services/groupService";
import type { GroupData, GroupPayload } from "~/types/group.interface";

interface GroupState {
  groups: GroupData[];
  loading: boolean;
  error: string | null;
  searchText: string;
}

const initialState: GroupState = {
  groups: [],
  loading: false,
  error: null,
  searchText: "",
};

//#region fetch groups
export const fetchGroups = createAsyncThunk(
  "groups/fetchGroups",
  async (_, { rejectWithValue }) => {
    try {
      const response = await groupService.getGroups();
      return response.data as { count: number; rows: GroupData[] };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

//#region create group
export const createGroup = createAsyncThunk(
  "groups/createGroup",
  async (payload: GroupPayload, { rejectWithValue }) => {
    try {
      const response = await groupService.createGroup(payload);
      return response.data as GroupData;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

//#region update group
export const updateGroup = createAsyncThunk(
  "groups/updateGroup",
  async (
    payload: { id: number; data: GroupPayload },
    { rejectWithValue }
  ) => {
    try {
      const response = await groupService.updateGroup(payload.id, payload.data);
      return response.data as GroupData;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

//#region delete group
export const deleteGroup = createAsyncThunk(
  "groups/deleteGroup",
  async (id: number, { rejectWithValue }) => {
    try {
      await groupService.deleteGroup(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

const groupSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {
    setGroupSearchText: (state, action: PayloadAction<string>) => {
      state.searchText = action.payload;
    },
    setGroupError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    //#region fetch groups
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload?.rows ?? [];
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        // An empty list comes back as a 400 from the API; treat it as "no groups".
        state.groups = [];
        state.error = action.payload as string;
      });

    //#region create group
    builder
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        // Newest first (list is ordered by id DESC). The create response has no
        // leader_name, so GroupManager refetches after save to fill it in.
        if (action.payload) state.groups.unshift(action.payload);
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    //#region update group
    builder
      .addCase(updateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex((g) => g.id === action.payload?.id);
        if (index !== -1)
          state.groups[index] = { ...state.groups[index], ...action.payload };
      })
      .addCase(updateGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    //#region delete group
    builder
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter((g) => g.id !== action.payload);
      })
      .addCase(deleteGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setGroupSearchText, setGroupError } = groupSlice.actions;

export const selectFilteredGroups = createSelector(
  [
    (state: { groups: GroupState }) => state.groups.groups,
    (state: { groups: GroupState }) => state.groups.searchText,
  ],
  (groups, searchText) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.group_name?.toLowerCase().includes(q) ||
        g.group_type?.toLowerCase().includes(q) ||
        g.leader_name?.toLowerCase().includes(q)
    );
  }
);

export default groupSlice.reducer;
