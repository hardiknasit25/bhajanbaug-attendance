import type { SabhaType } from "~/components/forms/SabhaForm";
import { useAppDispatch, useAppSelector } from "~/store/hooks";
import {
  closeSabhaFormDailog,
  createSabha,
  deleteSabha,
  doMemberAbsent,
  doMemberPresent,
  fetchSabhaById,
  fetchSabhaList,
  markMemberPresent,
  openSabhaFormDialog,
  selectFilteredSabhaMembers,
  setLoading,
  setSabhaList,
  setSabhaMemberSearchText,
  startSabha,
  submitSabhaReport,
  syncSabhaAttendance,
  updateSabha,
} from "~/store/slice/sabhaSlice";
import type { SabhaData } from "~/types/sabha.interface";

export const useSabha = () => {
  const dispatch = useAppDispatch();
  const sabha = useAppSelector((state) => state.sabha);
  const filteredSabhaMembers = useAppSelector(selectFilteredSabhaMembers);

  const actions = {
    setSabhaList: (sabhaList: SabhaData[]) => dispatch(setSabhaList(sabhaList)),
    setLoading: (loading: boolean) => dispatch(setLoading(loading)),
    setSabhaMemberSearchText: (searchText: string) =>
      dispatch(setSabhaMemberSearchText(searchText)),
    openSabhaFormDialog: (selectedSabha: SabhaData | null) =>
      dispatch(openSabhaFormDialog(selectedSabha)),
    closeSabhaFormDailog: () => dispatch(closeSabhaFormDailog()),
    doMemberPresent: (userId: number) => dispatch(doMemberPresent(userId)),
    doMemberAbsenent: (userId: number) => dispatch(doMemberAbsent(userId)),
  };

  const thunks = {
    fetchSabhaList: (sabha_status: string) =>
      dispatch(fetchSabhaList(sabha_status)),
    fetchSabhaById: (sabhaId: number, user?: string, groupId?: number | null) =>
      dispatch(fetchSabhaById({ sabhaId, user, groupId })),
    syncSabhaAttendance: (sabhaId: number) =>
      dispatch(syncSabhaAttendance(sabhaId)),
    markMemberPresent: (sabhaId: number, userId: number) =>
      dispatch(markMemberPresent({ sabhaId, userId })),
    startSabha: (sabhaId: number) => dispatch(startSabha(sabhaId)),
    submitSabhaReport: (sabhaId: number) =>
      dispatch(submitSabhaReport(sabhaId)),
    createSabha: (title: string, sabhaType: SabhaType) =>
      dispatch(createSabha({ title, sabhaType })),
    updateSabha: (sabhaId: number, title: string, sabhaType: SabhaType) =>
      dispatch(updateSabha({ sabhaId, title, sabhaType })),
    deleteSabha: (sabhaId: number) => dispatch(deleteSabha(sabhaId)),
  };

  return {
    //statse
    ...sabha,
    filteredSabhaMembers,

    //actions
    ...actions,

    //thunks
    ...thunks,
  };
};
