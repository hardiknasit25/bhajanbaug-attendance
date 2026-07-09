import type { filterType } from "~/services/reportService";
import { useAppDispatch, useAppSelector } from "~/store/hooks";
import {
  fetchGroupReport,
  fetchMembersReport,
  selectFilteredReportMembers,
  selectFilteredReportMembersByPoshakGroups,
  setSearchText,
} from "~/store/slice/reportSlice";

export const useReport = () => {
  const dispatch = useAppDispatch();
  const reportState = useAppSelector((state) => state.report);
  const filteredMembers = useAppSelector(selectFilteredReportMembers);
  const filteredMembersByPoshakGroups = useAppSelector(
    selectFilteredReportMembersByPoshakGroups
  );

  const actions = {
    setSearchText: (searchText: string) => dispatch(setSearchText(searchText)),
  };

  const thunks = {
    fetchMembersReport: (filter: filterType, sabhaIds?: number[]) =>
      dispatch(fetchMembersReport({ filter, sabhaIds })),
    fetchGroupReport: (
      filter: filterType,
      sabhaIds?: number[],
      groupType?: string,
    ) => dispatch(fetchGroupReport({ filter, sabhaIds, groupType })),
  };

  return {
    // State
    ...reportState,
    filteredMembers,
    filteredMembersByPoshakGroups,

    // Actions
    ...actions,

    // Thunks
    ...thunks,
  };
};
