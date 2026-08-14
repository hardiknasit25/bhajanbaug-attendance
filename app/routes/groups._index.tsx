import {
  redirect,
  type LoaderFunctionArgs,
  type MetaArgs,
} from "react-router";
import GroupManager from "~/components/shared-component/GroupManager";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import { useGroups } from "~/hooks/useGroups";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";

export function meta({}: MetaArgs) {
  return [
    { title: "Groups" },
    { name: "description", content: "Manage poshak groups" },
  ];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = getTokenFromRequest(request);
  if (!token) return redirect("/login");
  return null;
};

export default function GroupsPage() {
  const { searchText, setSearchText } = useGroups();

  return (
    <LayoutWrapper
      headerConfigs={{
        title: "Groups",
        className: "flex-col gap-2",
        showSearch: true,
        searchPlaceholder: "Search by leader or group name...",
        searchValue: searchText,
        onSearchChange: setSearchText,
      }}
      className="p-4"
    >
      <GroupManager />
    </LayoutWrapper>
  );
}
