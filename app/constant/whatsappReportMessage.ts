// =====================================================================
//  WHATSAPP REPORT MESSAGE  —  EDIT THE TEXT BELOW FREELY
// =====================================================================
//  This is the message that gets pre-filled in the poshak leader's
//  WhatsApp chat when the WhatsApp icon on the Report screen is clicked.
//
//  HOW TO EDIT
//  -----------
//  Just change the text inside the backticks (`) below. Line breaks,
//  emojis and blank lines are all kept exactly as you type them.
//
//  WhatsApp formatting:  *bold*   _italic_   ~strikethrough~
//
//  PLACEHOLDERS — these get replaced automatically. Use as many or as
//  few as you like; any you leave out are simply not shown.
//
//    {{date}}        Sabha date, e.g. 18/09/2026
//                    (for a multi-sabha report: 12/06/2026 - 18/09/2026)
//    {{leaderName}}  Poshak leader's name
//    {{groupName}}   Group name (empty when the group has none)
//    {{totalMembers}}   Number of members in the group
//    {{totalSabha}}     Number of sabhas covered by the report
//    {{presentTotal}}   Total present marks across the group
//    {{percent}}        Group attendance percentage, e.g. 60
//
//  NOTE: the attendance image is downloaded separately — WhatsApp does
//  not allow a link to carry an attachment, so the user attaches the
//  downloaded image from their gallery before sending.
// =====================================================================

export const WHATSAPP_REPORT_MESSAGE = `🙏 જય સ્વામિનારાયણ 🙏

📅 Yuva Sabha Report
Date:  *{{date}}* `;

// Default country code prefixed to 10-digit mobile numbers for wa.me links.
export const WHATSAPP_COUNTRY_CODE = "91";

export interface WhatsAppMessageValues {
  date?: string | null;
  leaderName?: string | null;
  groupName?: string | null;
  totalMembers?: number | null;
  totalSabha?: number | null;
  presentTotal?: number | null;
  percent?: number | null;
}

/**
 * Fills the placeholders in WHATSAPP_REPORT_MESSAGE. Unknown or missing
 * values become an empty string, so a template can never leak a raw
 * "{{token}}" into the message.
 */
export function buildWhatsAppReportMessage(
  values: WhatsAppMessageValues,
  template: string = WHATSAPP_REPORT_MESSAGE,
): string {
  const map: Record<string, string> = {
    date: values.date ?? "",
    leaderName: values.leaderName ?? "",
    groupName: values.groupName ?? "",
    totalMembers: values.totalMembers != null ? String(values.totalMembers) : "",
    totalSabha: values.totalSabha != null ? String(values.totalSabha) : "",
    presentTotal: values.presentTotal != null ? String(values.presentTotal) : "",
    percent: values.percent != null ? String(values.percent) : "",
  };

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_full, key: string) =>
    Object.prototype.hasOwnProperty.call(map, key) ? map[key] : "",
  );
}

/**
 * Normalizes a stored mobile number into the digits-only form wa.me needs
 * ("919876543210"). Returns null when there's nothing usable, so callers can
 * skip opening WhatsApp instead of opening a broken chat.
 */
export function toWhatsAppNumber(
  mobile: string | number | null | undefined,
  countryCode: string = WHATSAPP_COUNTRY_CODE,
): string | null {
  // Keep digits only: strips "+", spaces, dashes and brackets.
  let digits = String(mobile ?? "").replace(/\D/g, "");
  // Drop trunk-prefix zeros ("09876543210" -> "9876543210").
  digits = digits.replace(/^0+/, "");
  if (!digits) return null;
  // A bare local number gets the country code; anything longer is assumed to
  // already include one.
  if (digits.length === 10) digits = `${countryCode}${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}
