import {
  redirect,
  type LoaderFunctionArgs,
  type MetaArgs,
} from "react-router";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import ModuleManager from "~/components/shared-component/ModuleManager";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";

export function meta({}: MetaArgs) {
  return [
    { title: "Modules" },
    { name: "description", content: "Manage modules" },
  ];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = getTokenFromRequest(request);
  if (!token) return redirect("/login");
  return null;
};

export default function ModulesPage() {
  return (
    <LayoutWrapper headerConfigs={{ title: "Modules" }} className="p-4">
      <ModuleManager />
    </LayoutWrapper>
  );
}
