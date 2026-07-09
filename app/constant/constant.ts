export const FALLBACK_AVATAR_PLACEHOLDER = "/images/avatar-placeholder.webp";
export const AUTH_TOKEN = "bhajanbaug_auth_token";
export const PRESENT_MEMBER = "presentMember";
export const ABSENT_MEMBER = "absentMember";

// Prefix encoded in member QR codes. Must match the backend (qrPdfUtil.ts QR_MEMBER_PREFIX).
// A scanned code like "BB-MEMBER:42" maps to member id 42.
export const MEMBER_QR_PREFIX = "BB-MEMBER:";

// Poshak group types (tbl_poshak_group.group_type enum). Drives the per-type tabs
// on the Members and Report pages — each tab loads only its own group type.
export const POSHAK_GROUP_TYPES = [
  { key: "poshak", label: "Poshak" },
  { key: "sakshi", label: "Sakshi" },
  { key: "aatmiy", label: "Aatmiy" },
] as const;

export type PoshakGroupType = (typeof POSHAK_GROUP_TYPES)[number]["key"];

// How long (in seconds) a successful QR scan result (the member's name) stays
// on screen before it auto-hides. Change this to adjust the duration.
export const SCAN_RESULT_VISIBLE_SECONDS = 3;
