import {
  redirect,
  type LoaderFunctionArgs,
  type MetaArgs,
} from "react-router";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import WhatsAppAccount from "~/components/shared-component/WhatsAppAccount";
import { usePermission } from "~/hooks/usePermissions";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";

export function meta({}: MetaArgs) {
  return [
    { title: "WhatsApp" },
    { name: "description", content: "Manage the linked WhatsApp account" },
  ];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = getTokenFromRequest(request);
  if (!token) return redirect("/login");
  return null;
};

export default function WhatsAppPage() {
  const { canRead, loaded } = usePermission("whatsapp");

  return (
    <LayoutWrapper headerConfigs={{ title: "WhatsApp" }} className="p-4">
      {loaded && !canRead ? (
        <div className="mt-10 text-center text-textLightColor">
          You don&apos;t have access to WhatsApp settings.
        </div>
      ) : (
        <WhatsAppAccount />
      )}
    </LayoutWrapper>
  );
}
