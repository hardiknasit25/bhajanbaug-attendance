import { redirect } from "react-router";

// The old tabbed management page (Roles / Modules / Groups) was split into
// standalone pages: /role, /module, /groups. Redirect old links to /role.
export const loader = async () => redirect("/role");

export default function ManagementPage() {
  return null;
}
