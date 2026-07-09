import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { reportService, type filterType } from "~/services/reportService";
import type { MemberData, PoshakGroupData } from "~/types/members.interface";
import { filterMembers } from "~/utils/filterMembers";

interface ReportState {
  memberReport: MemberData[];
  groupReport: PoshakGroupData[];
  searchText: string;
  sabhaCount: number;
  loading: boolean;
}

const initialState: ReportState = {
  memberReport: [],
  groupReport: [],
  sabhaCount: 0,
  searchText: "",
  loading: false,
};

type ReportArg = {
  filter: filterType;
  sabhaIds?: number[];
  groupType?: string;
};

//#region fetchMemberReport thunk
export const fetchMembersReport = createAsyncThunk(
  "report/fetchMembersReport",
  async ({ filter, sabhaIds }: ReportArg, { rejectWithValue }) => {
    try {
      const response = await reportService.getMemberReport(filter, sabhaIds);
      return response.data as {
        sabha_count: number;
        result: MemberData[];
      };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

//#region fetchGroupReport thunk
export const fetchGroupReport = createAsyncThunk(
  "report/fetchGroupReport",
  async ({ filter, sabhaIds, groupType }: ReportArg, { rejectWithValue }) => {
    try {
      const response = await reportService.getGroupReport(
        filter,
        sabhaIds,
        groupType
      );
      return response.data as {
        sabha_count: number;
        groups: PoshakGroupData[];
      };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

//#region Report Slice

const reportSlice = createSlice({
  name: "report",
  initialState,
  reducers: {
    setMemberReport(state, action: PayloadAction<any>) {
      state.memberReport = action.payload;
    },
    setGroupReport(state, action: PayloadAction<any>) {
      state.groupReport = action.payload;
    },

    setSearchText(state, action: PayloadAction<string>) {
      state.searchText = action.payload;
    },
  },
  extraReducers: (builder) => {
    //#region fetchMembersReport
    builder
      .addCase(fetchMembersReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMembersReport.fulfilled, (state, action) => {
        state.loading = false;
        state.memberReport = action.payload.result;
        state.sabhaCount = action.payload.sabha_count;
      })
      .addCase(fetchMembersReport.rejected, (state) => {
        state.loading = false;
      });

    //#region fetchGroupReport
    builder
      .addCase(fetchGroupReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGroupReport.fulfilled, (state, action) => {
        state.loading = false;
        state.groupReport = action.payload.groups;
        state.sabhaCount = action.payload.sabha_count;
      })
      .addCase(fetchGroupReport.rejected, (state) => {
        state.loading = false;
      });
  },
});
export const { setMemberReport, setGroupReport, setSearchText } =
  reportSlice.actions;

// Memoized: recompute only when the report list or searchText changes.
export const selectFilteredReportMembers = createSelector(
  [
    (state: { report: ReportState }) => state.report.memberReport,
    (state: { report: ReportState }) => state.report.searchText,
  ],
  (memberReport, searchText) => filterMembers(memberReport, searchText),
);

export const selectFilteredReportMembersByPoshakGroups = createSelector(
  [
    (state: { report: ReportState }) => state.report.groupReport,
    (state: { report: ReportState }) => state.report.searchText,
  ],
  (groupReport, searchText) => {
    if (!searchText?.trim()) return groupReport;

    // Filter members within each group and keep groups that have matching members
    return groupReport
      .map((group) => ({
        ...group,
        users: filterMembers(group.users, searchText),
      }))
      .filter((group) => group.users.length > 0);
  },
);

export default reportSlice.reducer;
