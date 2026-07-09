import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { memberService } from "~/services/memberService";
import type { CommonParams } from "~/types/common.interface";
import type {
  MemberData,
  MemberPayload,
  PoshakGroupData,
} from "~/types/members.interface";
import { filterMembers } from "~/utils/filterMembers";

interface MemberState {
  members: MemberData[];
  membersByPoshakGroups: PoshakGroupData[];
  selectedMember: MemberData | null;
  groupSelect: { id: number; leader_name: string; group_name: string }[];
  totalMembers: number;
  loading: boolean;
  error: string | null;
  searchText: string;
}

const initialState: MemberState = {
  members: [],
  membersByPoshakGroups: [],
  selectedMember: null,
  groupSelect: [],
  totalMembers: 0,
  loading: false,
  error: null,
  searchText: "",
};

//#region fetch members
export const fetchMembers = createAsyncThunk(
  "members/fetchMembers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await memberService.getMembers();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

//#region fetch member by id
export const fetchMemberById = createAsyncThunk(
  "members/fetchMemberById",
  async (memberId: number, { rejectWithValue }) => {
    try {
      const response = await memberService.getMemberById(memberId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

//#region fetch members by poshak group
export const fetchMembersByPoshakGroups = createAsyncThunk(
  "members/fetchMembersByPoshakGroups",
  async (_, { rejectWithValue }) => {
    try {
      const response = await memberService.getMembersByPoshakGroup();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

//#region delete member
export const deleteMember = createAsyncThunk(
  "members/deleteMember",
  async (memberId: number, { rejectWithValue }) => {
    try {
      await memberService.deleteMember(memberId);
      return memberId;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error.message
      );
    }
  }
);

//#region create member
export const createMember = createAsyncThunk(
  "members/createMember",
  async (memberData: MemberPayload, { rejectWithValue }) => {
    try {
      const response = await memberService.createMember(memberData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

//#region update member
export const updateMember = createAsyncThunk(
  "members/updateMember",
  async (
    payload: { memberId: number; memberData: MemberPayload },
    { rejectWithValue }
  ) => {
    try {
      const { memberId, memberData } = payload;
      const response = await memberService.updateMember(memberId, memberData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

//#reion fetch poshak groups
export const fetchPoshakGroups = createAsyncThunk(
  "members/fetchPoshakGroups",
  async (params: CommonParams, { rejectWithValue }) => {
    try {
      const response = await memberService.getPoshakGroup(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

//#region enterSabhaReson
export const enterSabhaReason = createAsyncThunk(
  "members/enterSabhaReason",
  async (
    payload: { sabha_id: number; user_id: number; reason: string },
    { rejectWithValue }
  ) => {
    try {
      const { sabha_id, user_id, reason } = payload;
      const response = await memberService.enterReasonForSabha(
        sabha_id,
        user_id,
        reason
      );
      return response.data as {
        sabha_id: number;
        user_id: number;
        reason: string;
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

//#region group select thunk
export const fetchGroupSelect = createAsyncThunk(
  "members/fetchGroupSelect",
  async (_, { rejectWithValue }) => {
    try {
      const response = await memberService.groupSelect();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

//#region member slice

const memberSlice = createSlice({
  name: "members",
  initialState,
  reducers: {
    setMembers: (state, action: PayloadAction<MemberData[]>) => {
      state.members = action.payload;
    },
    setSearchText: (state, action: PayloadAction<string>) => {
      state.searchText = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    //#region fetch members
    builder
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = action.payload.rows;
        state.totalMembers = action.payload.count;
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    //#region fetchMemberById
    builder
      .addCase(fetchMemberById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemberById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMember = action.payload;
      })
      .addCase(fetchMemberById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    //#region fetch members by poshak group
    builder
      .addCase(fetchMembersByPoshakGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembersByPoshakGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.membersByPoshakGroups = action.payload;
      })
      .addCase(fetchMembersByPoshakGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    //#region create member
    builder
      .addCase(createMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMember.fulfilled, (state, action) => {
        state.loading = false;
        state.members.push(action.payload);
        state.totalMembers += 1;
      })
      .addCase(createMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    //#region update member
    builder
      .addCase(updateMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMember.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.members.findIndex(
          (member) => member.id === action.payload.id
        );
        if (index !== -1) {
          state.members[index] = action.payload;
        }
        if (
          state.selectedMember &&
          state.selectedMember.id === action.payload.id
        ) {
          state.selectedMember = action.payload;
        }
      })
      .addCase(updateMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    //#region delete member
    builder
      .addCase(deleteMember.fulfilled, (state, action) => {
        state.members = state.members.filter((m) => m.id !== action.payload);
        state.membersByPoshakGroups = state.membersByPoshakGroups.map(
          (group) => ({
            ...group,
            users: group.users.filter((u) => u.id !== action.payload),
          })
        );
        state.totalMembers = Math.max(0, state.totalMembers - 1);
        if (state.selectedMember?.id === action.payload) {
          state.selectedMember = null;
        }
      })
      .addCase(deleteMember.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    //#region enterReasonForSabha
    builder
      .addCase(enterSabhaReason.pending, (state) => {
        state.error = null;
      })
      .addCase(enterSabhaReason.fulfilled, (state, action) => {
        if (state.selectedMember) {
          state.selectedMember = {
            ...state.selectedMember,
            attendance_by_sabha: (
              state.selectedMember?.attendance_by_sabha ?? []
            ).map((sabha) => {
              if (sabha.sabha_id === action.payload.sabha_id) {
                return {
                  ...sabha,
                  reason: action.payload.reason,
                };
              }
              return sabha;
            }),
          };
        }
      })
      .addCase(enterSabhaReason.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    //#regin etch group select thunk
    builder.addCase(fetchGroupSelect.fulfilled, (state, action) => {
      state.groupSelect = action.payload.rows;
    });
  },
});

export const { setMembers, setSearchText, setLoading, setError } =
  memberSlice.actions;

// Memoized: recompute only when the underlying list or searchText changes,
// so consumers don't re-render / re-filter on every unrelated state update.
export const selectFilteredMembers = createSelector(
  [
    (state: { members: MemberState }) => state.members.members,
    (state: { members: MemberState }) => state.members.searchText,
  ],
  (members, searchText) => filterMembers(members, searchText),
);

export const selectFilteredMembersByPoshakGroups = createSelector(
  [
    (state: { members: MemberState }) => state.members.membersByPoshakGroups,
    (state: { members: MemberState }) => state.members.searchText,
  ],
  (membersByPoshakGroups, searchText) => {
    if (!searchText?.trim()) return membersByPoshakGroups;

    // Filter members within each group and keep groups that have matching members
    return membersByPoshakGroups
      .map((group) => ({
        ...group,
        users: filterMembers(group.users, searchText),
      }))
      .filter((group) => group.users.length > 0);
  },
);

export default memberSlice.reducer;
