import { useAppDispatch, useAppSelector } from "~/store/hooks";
import {
  createGroup,
  deleteGroup,
  fetchGroups,
  selectFilteredGroups,
  setGroupSearchText,
  updateGroup,
} from "~/store/slice/groupSlice";
import type { GroupPayload } from "~/types/group.interface";

export const useGroups = () => {
  const dispatch = useAppDispatch();
  const groups = useAppSelector((state) => state.groups);
  const filteredGroups = useAppSelector(selectFilteredGroups);

  return {
    // state
    ...groups,
    filteredGroups,

    // actions
    setSearchText: (searchText: string) =>
      dispatch(setGroupSearchText(searchText)),

    // thunks
    fetchGroups: () => dispatch(fetchGroups()),
    createGroup: (payload: GroupPayload) => dispatch(createGroup(payload)),
    updateGroup: (id: number, data: GroupPayload) =>
      dispatch(updateGroup({ id, data })),
    deleteGroup: (id: number) => dispatch(deleteGroup(id)),
  };
};
