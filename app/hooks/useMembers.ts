import { useAppDispatch, useAppSelector } from "~/store/hooks";
import {
  createMember,
  deleteMember,
  enterSabhaReason,
  fetchGroupSelect,
  fetchMemberById,
  fetchMembers,
  fetchMembersByPoshakGroups,
  selectFilteredMembers,
  selectFilteredMembersByPoshakGroups,
  setMembers,
  setSearchText,
  updateMember,
} from "~/store/slice/memberSlice";
import { type MemberData, type MemberPayload } from "~/types/members.interface";

export const useMembers = () => {
  const dispatch = useAppDispatch();
  const members = useAppSelector((state) => state.members);
  const filteredMembers = useAppSelector(selectFilteredMembers);
  const filteredMembersByPoshakGroups = useAppSelector(
    selectFilteredMembersByPoshakGroups
  );

  const actions = {
    setAllMembers: (memberList: MemberData[]) =>
      dispatch(setMembers(memberList)),
    setSearchText: (searchText: string) => dispatch(setSearchText(searchText)),
  };

  const methods = {};

  const thunks = {
    fetchMembers: () => dispatch(fetchMembers()),
    fetchMemberById: (memberId: number) => dispatch(fetchMemberById(memberId)),
    fetchMembersByPoshakGroups: (groupType?: string) =>
      dispatch(fetchMembersByPoshakGroups(groupType)),
    createMember: (memberData: MemberPayload) =>
      dispatch(createMember(memberData)),
    updateMember: (memberId: number, memberData: MemberPayload) =>
      dispatch(updateMember({ memberId, memberData })),
    deleteMember: (memberId: number) => dispatch(deleteMember(memberId)),
    enterSabhaReason: (sabha_id: number, user_id: number, reason: string) =>
      dispatch(enterSabhaReason({ sabha_id, user_id, reason })),
    fetchGroupSelect: () => dispatch(fetchGroupSelect()),
  };

  return {
    // stats
    ...members,
    filteredMembers,
    filteredMembersByPoshakGroups,

    // actions
    ...actions,

    // thunks
    ...thunks,
  };
};
