export const FALLBACK_AVATAR_PLACEHOLDER = "/images/avatar-placeholder.webp";
export const AUTH_TOKEN = "bhajanbaug_auth_token";
export const PRESENT_MEMBER = "presentMember";
export const ABSENT_MEMBER = "absentMember";

// Poshak group types (tbl_poshak_group.group_type enum). Drives the per-type tabs
// on the Members and Report pages — each tab loads only its own group type.
export const POSHAK_GROUP_TYPES = [
  { key: "poshak", label: "Poshak" },
  { key: "sakshi", label: "Sakshi" },
  { key: "aatmiy", label: "Aatmiy" },
  { key: "karyakar", label: "Karyakar" },
] as const;

export type PoshakGroupType = (typeof POSHAK_GROUP_TYPES)[number]["key"];

