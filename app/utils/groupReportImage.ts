// Renders a poshak-group attendance summary as a PNG image so it can be shared
// straight into WhatsApp (as a picture, not an .xlsx attachment).
//
// The layout mirrors the report screen's theme: a dark header band with the
// poshak leader / group name, then one row per member where the name, the
// present state and the absent state all sit on the SAME line.
//
// Attendance is rendered two different ways:
//   * single sabha   -> one "Present" / "Absent" chip, plus that sabha's date
//                       in the header (counts like 1/1 and a 0%/100% column
//                       carry no information there)
//   * multiple sabha -> a "P x/n" chip, an "A y/n" chip and a percentage
//                       column, plus the total sabha count and the date range
//                       in the header

// Theme colors (from tailwind.config.js).
const COLOR_PRIMARY = "#1D1D27";
const COLOR_TEXT = "#000002";
const COLOR_LIGHT = "#738091";
const COLOR_BORDER = "#C5CBD3";
const COLOR_GREEN = "#15803d";
const COLOR_GREEN_DOT = "#22c55e";
const COLOR_RED = "#b91c1c";
const COLOR_RED_DOT = "#ef4444";
const COLOR_BLUE = "#1d4ed8";
const COLOR_HEAD_STRIP = "#F1F3F7";
const COLOR_ROW_ALT = "#FAFBFC";
const COLOR_MUTED_LIGHT = "#AFBDEE";

export const DEFAULT_REPORT_HEADER = "સ્વામિનારાયણ સંતસંગ હોલ ભજનબાગ";

/**
 * Master switch for member photos in the shared image.
 * false (default) -> rows show a numbered bubble only.
 * true            -> each row shows the member's profile photo (falls back to
 *                    initials when the photo is missing or fails to load).
 * Kept OFF by default: remote photos make the image much slower to build and
 * can taint the canvas when the image host doesn't send CORS headers.
 */
export const SHOW_MEMBER_IMAGE = false;

/**
 * Profile image shown in the header. Served from /public, so it is same-origin
 * and never taints the canvas. The file is a 360x360 WebP (~50 KB) cropped from
 * the original photo - small enough to load instantly, and still twice the
 * resolution it is drawn at.
 */
export const HEADER_LOGO_SRC = "/images/manmohak.webp";

export interface GroupReportMember {
  id: number;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  smk_no?: string | null;
  img?: string | null;
  total_present?: number | null;
  total_absent?: number | null;
}

export interface GroupReportImageInput {
  leaderName: string;
  groupName?: string | null;
  members: GroupReportMember[];
  totalSabha?: number | null;
  // Dates of the sabhas covered by this report, in any order. Used for the
  // header's date / date-range line. Safe to omit (the line is then skipped).
  sabhaDates?: (string | Date | null | undefined)[];
  // Optional extra text shown in the footer (e.g. the applied filter).
  subtitle?: string | null;
  // Optional eyebrow line above the leader name (e.g. the hall name). Omitted
  // by default — the header is kept compact so more rows fit on screen.
  header?: string | null;
  // Per-call override of SHOW_MEMBER_IMAGE.
  showMemberImage?: boolean;
  // Override the header profile image, or pass null to draw none.
  logoSrc?: string | null;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof (ctx as any).roundRect === "function") {
    ctx.beginPath();
    (ctx as any).roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Truncates with an ellipsis so a long name can never push the stat columns out.
function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + "…").width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + "…";
}

function fullName(m: GroupReportMember) {
  const joined = [m.first_name, m.middle_name, m.last_name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return joined || `Member #${m.id}`;
}

function initialsOf(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Some records carry junk in smk_no (e.g. a stray timestamp). Only show values
// that actually look like an SMK number.
function displaySmk(smk: string | null | undefined) {
  const v = (smk ?? "").trim();
  if (!v || v === "NA" || !/^[A-Za-z0-9/-]{1,12}$/.test(v)) return "No SMK";
  return v;
}

// "18 Sep 2026" — returns null for anything unparseable.
function formatDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Earliest + latest of the given sabha dates (nulls and junk dropped).
function dateBounds(values: (string | Date | null | undefined)[] | undefined) {
  const times = (values ?? [])
    .map((v) => (v instanceof Date ? v : v ? new Date(v) : null))
    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
    .map((d) => d.getTime());
  if (times.length === 0) return { from: null, to: null };
  return {
    from: new Date(Math.min(...times)),
    to: new Date(Math.max(...times)),
  };
}

// Draws an image cover-fitted into a circle, with a thin ring around it.
function drawCircularImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  size: number,
  ring: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max(size / img.width, size / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Loads an image; resolves null instead of rejecting so one broken URL
// never fails the whole image.
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Draws the group list and returns it as a PNG Blob. Browser-only (uses canvas).
 */
export async function buildGroupReportImage(
  input: GroupReportImageInput,
): Promise<Blob> {
  const header = input.header?.trim() || null;
  const leaderName = (input.leaderName || "Others").trim();
  const groupName =
    input.groupName && input.groupName !== "Not in any group"
      ? titleCase(input.groupName.replace(/[_-]+/g, " ").trim())
      : null;
  const members = input.members ?? [];
  const totalSabha = Number(input.totalSabha) || 0;
  const showMemberImage = input.showMemberImage ?? SHOW_MEMBER_IMAGE;
  const logoSrc = input.logoSrc === undefined ? HEADER_LOGO_SRC : input.logoSrc;
  // With a single sabha, "1/1" and "100%" say nothing a Present/Absent chip
  // doesn't already say.
  const singleSabha = totalSabha <= 1;

  // Header date line: one date for a single sabha, a range for several.
  const { from, to } = dateBounds(input.sabhaDates);
  const fromText = formatDate(from);
  const toText = formatDate(to);
  const dateLine = !fromText
    ? null
    : singleSabha || !toText || fromText === toText
      ? `Sabha Date: ${fromText}`
      : `${fromText}  –  ${toText}`;

  // ---- Layout constants (device pixels) --------------------------------
  const W = 1000;
  const PAD = 36;
  const HEADER_PAD_V = 26;
  const EYEBROW_SIZE = 26;
  const LEADER_SIZE = 40;
  const GROUP_TEXT_SIZE = 25;
  const CHIP_H = 40;
  const CHIP_GAP = 12;
  const DATE_SIZE = 24;
  const STRIP_H = 46;
  const ROW_H = 92;
  const AVATAR = 56;
  const ROW_NAME_SIZE = 32;
  const ROW_SUB_SIZE = 23;
  const FOOTER_H = 66;
  const STAT_PILL_H = 40;
  const COL_GAP = 14;

  const eyebrowFont = `600 ${EYEBROW_SIZE}px "Baloo Bhai 2", "Noto Sans Gujarati", sans-serif`;
  const leaderFont = `700 ${LEADER_SIZE}px Poppins, Inter, sans-serif`;
  const groupFont = `500 ${GROUP_TEXT_SIZE}px Poppins, Inter, sans-serif`;
  const chipFont = `600 23px Poppins, Inter, sans-serif`;
  const dateFont = `500 ${DATE_SIZE}px Poppins, Inter, sans-serif`;
  const stripFont = `600 18px Poppins, Inter, sans-serif`;
  const nameFont = `600 ${ROW_NAME_SIZE}px Poppins, Inter, sans-serif`;
  const subFont = `500 ${ROW_SUB_SIZE}px Poppins, Inter, sans-serif`;
  const statFont = `600 23px Poppins, Inter, sans-serif`;
  const badgeFont = `700 20px Poppins, Inter, sans-serif`;
  const footerFont = `500 21px Poppins, Inter, sans-serif`;

  if (typeof document !== "undefined" && (document as any).fonts?.load) {
    try {
      await Promise.all([
        (document as any).fonts.load(eyebrowFont, header ?? "સ"),
        (document as any).fonts.load(leaderFont, leaderName),
        (document as any).fonts.load(nameFont, "Abc"),
        (document as any).fonts.load(subFont, "0123456789"),
      ]);
    } catch {
      /* fall back to whatever is available */
    }
  }

  // Header logo + (optionally) the member photos, fetched in parallel.
  const [logo, photos] = await Promise.all([
    logoSrc ? loadImage(logoSrc) : Promise.resolve(null),
    showMemberImage
      ? Promise.all(
          members.map((m) => (m.img ? loadImage(m.img) : Promise.resolve(null))),
        )
      : Promise.resolve(members.map(() => null) as (HTMLImageElement | null)[]),
  ]);

  const presentTotal = members.reduce(
    (acc, m) => acc + (Number(m.total_present) || 0),
    0,
  );
  const groupPercent =
    members.length && totalSabha
      ? Math.round((presentTotal / (members.length * totalSabha)) * 100)
      : 0;

  // Per-member derived values, computed once so they can drive column widths.
  const rows = members.map((m) => {
    const present = Number(m.total_present) || 0;
    const absent =
      m.total_absent != null
        ? Number(m.total_absent) || 0
        : Math.max(totalSabha - present, 0);
    return {
      member: m,
      name: fullName(m),
      present,
      absent,
      pct: totalSabha ? Math.round((present / totalSabha) * 100) : 0,
      isPresent: present > 0,
    };
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // ---- Measure everything before sizing the canvas ----------------------
  // Chip = dot (Ø28 at x+24) + gap + label + right padding. Sizing the chips
  // from the widest label means 3-digit counts can never overflow them.
  const CHIP_TEXT_X = 42;
  const CHIP_PAD_R = 8;
  const chipWidthFor = (labels: string[]) => {
    ctx.font = statFont;
    const widest = labels.reduce(
      (max, l) => Math.max(max, ctx.measureText(l).width),
      0,
    );
    return Math.max(Math.ceil(CHIP_TEXT_X + widest + CHIP_PAD_R), 112);
  };

  const statChipW = singleSabha
    ? chipWidthFor(["Present", "Absent"])
    : chipWidthFor(
        rows.flatMap((r) => [
          `${r.present}/${totalSabha}`,
          `${r.absent}/${totalSabha}`,
        ]),
      );

  ctx.font = statFont;
  const pctW = singleSabha
    ? 0
    : Math.ceil(
        rows.reduce((max, r) => Math.max(max, ctx.measureText(`${r.pct}%`).width), 0),
      ) + 12;

  // Header summary chips: members, total sabha (only when there are several),
  // attendance percentage. Each gets its own tint so the three numbers are
  // distinguishable at a glance instead of reading as one grey run.
  // The attendance chip is additionally color-coded by how good the number is.
  const attendanceTone =
    groupPercent >= 75
      ? { bg: "rgba(34,197,94,0.20)", fg: "#86EFAC" } // healthy
      : groupPercent >= 50
        ? { bg: "rgba(234,179,8,0.20)", fg: "#FDE047" } // needs attention
        : { bg: "rgba(239,68,68,0.20)", fg: "#FCA5A5" }; // poor

  const headerChips = [
    {
      label: `${members.length} ${members.length === 1 ? "Member" : "Members"}`,
      bg: "rgba(89,123,231,0.22)", // themeBlueColor
      fg: "#C3CEF7",
    },
    ...(singleSabha
      ? []
      : [
          {
            label: `${totalSabha} Sabha`,
            bg: "rgba(20,210,184,0.18)", // selectionColor
            fg: "#8DE8DB",
          },
        ]),
    ...(totalSabha
      ? [{ label: `${groupPercent}% Attendance`, ...attendanceTone }]
      : []),
  ];

  ctx.font = chipFont;
  const headerChipW = headerChips.map(
    (c) => Math.round(ctx.measureText(c.label).width) + 40,
  );

  // The header is a horizontal band: profile image on the left, then the
  // leader name / group / summary stacked to its right. Laying it out
  // side by side (rather than stacked and centered) keeps the band short.
  const LOGO = 168;
  const LOGO_GAP = 26;
  const headTextX = logo ? PAD + LOGO + LOGO_GAP : PAD;
  const headTextW = W - PAD - headTextX;

  const headStackH =
    (header ? EYEBROW_SIZE + 10 : 0) +
    LEADER_SIZE +
    12 +
    (groupName ? GROUP_TEXT_SIZE + 10 : 0) +
    CHIP_H +
    (dateLine ? 10 + DATE_SIZE : 0);

  const headerH = Math.max(headStackH, logo ? LOGO : 0) + HEADER_PAD_V * 2;

  const listTop = headerH + STRIP_H;
  const H = listTop + Math.max(rows.length, 1) * ROW_H + FOOTER_H;

  canvas.width = W;
  canvas.height = H;
  ctx.textBaseline = "top";

  // Page background.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // ---- Header band ------------------------------------------------------
  ctx.fillStyle = COLOR_PRIMARY;
  ctx.fillRect(0, 0, W, headerH);

  // Profile image, vertically centered in the band.
  if (logo) {
    drawCircularImage(
      ctx,
      logo,
      PAD + LOGO / 2,
      headerH / 2,
      LOGO,
      "rgba(255,255,255,0.28)",
    );
  }

  // Text stack, vertically centered against the image.
  let hy = Math.max(HEADER_PAD_V, (headerH - headStackH) / 2);
  ctx.textAlign = "left";

  // Optional eyebrow (hall name) — only drawn when explicitly passed in.
  if (header) {
    ctx.font = eyebrowFont;
    ctx.fillStyle = COLOR_MUTED_LIGHT;
    ctx.fillText(header, headTextX, hy, headTextW);
    hy += EYEBROW_SIZE + 10;
  }

  // Poshak leader name (the headline).
  ctx.font = leaderFont;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(ellipsize(ctx, leaderName, headTextW), headTextX, hy);
  hy += LEADER_SIZE + 12;

  // Group name, as plain text under the leader name (no pill / chip).
  if (groupName) {
    ctx.font = groupFont;
    ctx.fillStyle = COLOR_MUTED_LIGHT;
    ctx.fillText(ellipsize(ctx, groupName, headTextW), headTextX, hy);
    hy += GROUP_TEXT_SIZE + 10;
  }

  // Summary chips.
  let cx0 = headTextX;
  ctx.font = chipFont;
  headerChips.forEach((c, i) => {
    const cw = headerChipW[i];
    ctx.fillStyle = c.bg;
    roundRectPath(ctx, cx0, hy, cw, CHIP_H, 10);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = c.fg;
    ctx.fillText(c.label, cx0 + cw / 2, hy + 8);
    cx0 += cw + CHIP_GAP;
  });
  hy += CHIP_H;

  // Date / date range.
  if (dateLine) {
    hy += 10;
    ctx.textAlign = "left";
    ctx.font = dateFont;
    ctx.fillStyle = COLOR_MUTED_LIGHT;
    ctx.fillText(dateLine, headTextX, hy, headTextW);
  }

  // ---- Column positions (derived from the measured chip widths) ---------
  const TEXT_X = PAD + AVATAR + 16;
  const PCT_RIGHT = W - PAD;
  const ABS_X = singleSabha
    ? W - PAD - statChipW
    : W - PAD - pctW - COL_GAP - statChipW;
  const PRE_X = singleSabha ? ABS_X : ABS_X - COL_GAP - statChipW;
  const NAME_MAX = PRE_X - 24 - TEXT_X;

  // ---- Column header strip ----------------------------------------------
  ctx.fillStyle = COLOR_HEAD_STRIP;
  ctx.fillRect(0, headerH, W, STRIP_H);
  ctx.strokeStyle = COLOR_BORDER;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH + STRIP_H - 0.5);
  ctx.lineTo(W, headerH + STRIP_H - 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = stripFont;
  ctx.fillStyle = COLOR_LIGHT;
  ctx.textAlign = "left";
  ctx.fillText("MEMBER", TEXT_X, headerH + 14);
  if (singleSabha) {
    ctx.textAlign = "center";
    ctx.fillText("ATTENDANCE", PRE_X + statChipW / 2, headerH + 14);
  } else {
    ctx.textAlign = "center";
    ctx.fillText("PRESENT", PRE_X + statChipW / 2, headerH + 14);
    ctx.fillText("ABSENT", ABS_X + statChipW / 2, headerH + 14);
    ctx.textAlign = "right";
    ctx.fillText("%", PCT_RIGHT, headerH + 14);
  }

  // Draws one attendance chip: a colored letter bubble plus its label. No
  // background fill — the bubble alone carries the present/absent color.
  const drawStatChip = (
    x: number,
    y: number,
    letter: string,
    label: string,
    fg: string,
    dot: string,
  ) => {
    ctx.fillStyle = dot;
    ctx.beginPath();
    ctx.arc(x + 24, y + STAT_PILL_H / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.font = badgeFont;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(letter, x + 24, y + STAT_PILL_H / 2 - 11);

    ctx.textAlign = "left";
    ctx.font = statFont;
    ctx.fillStyle = fg;
    ctx.fillText(label, x + CHIP_TEXT_X, y + STAT_PILL_H / 2 - 13);
  };

  // ---- Member rows ------------------------------------------------------
  if (rows.length === 0) {
    ctx.textAlign = "center";
    ctx.font = subFont;
    ctx.fillStyle = COLOR_LIGHT;
    ctx.fillText("No members found", W / 2, listTop + ROW_H / 2 - 10);
  }

  rows.forEach((r, i) => {
    const top = listTop + i * ROW_H;
    const cy = top + ROW_H / 2;

    if (i % 2 === 1) {
      ctx.fillStyle = COLOR_ROW_ALT;
      ctx.fillRect(0, top, W, ROW_H);
    }

    // Row separator.
    ctx.strokeStyle = COLOR_BORDER;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, top + ROW_H - 0.5);
    ctx.lineTo(W - PAD, top + ROW_H - 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ---- Avatar / index bubble -----------------------------------------
    const acx = PAD + AVATAR / 2;
    const photo = photos[i];

    if (showMemberImage && photo) {
      drawCircularImage(ctx, photo, acx, cy, AVATAR, COLOR_BORDER);
    } else if (showMemberImage) {
      // Photo flag on but no usable photo -> initials bubble.
      ctx.fillStyle = "#EAEEFA";
      ctx.beginPath();
      ctx.arc(acx, cy, AVATAR / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.font = badgeFont;
      ctx.fillStyle = "#587BF3";
      ctx.fillText(initialsOf(r.name), acx, cy - 11);
    } else {
      // Photos off -> plain row number.
      ctx.textAlign = "center";
      ctx.font = subFont;
      ctx.fillStyle = COLOR_LIGHT;
      ctx.fillText(String(i + 1), acx, cy - 11);
    }

    // ---- Name + SMK id --------------------------------------------------
    ctx.textAlign = "left";
    ctx.font = nameFont;
    ctx.fillStyle = COLOR_TEXT;
    ctx.fillText(ellipsize(ctx, r.name, NAME_MAX), TEXT_X, cy - 31);

    ctx.font = subFont;
    ctx.fillStyle = COLOR_LIGHT;
    ctx.fillText(`SMK ID: ${displaySmk(r.member.smk_no)}`, TEXT_X, cy + 7);

    // ---- Attendance -----------------------------------------------------
    const chipY = cy - STAT_PILL_H / 2;

    if (singleSabha) {
      // One sabha: a single Present / Absent chip, no counts, no percentage.
      drawStatChip(
        PRE_X,
        chipY,
        r.isPresent ? "P" : "A",
        r.isPresent ? "Present" : "Absent",
        r.isPresent ? COLOR_GREEN : COLOR_RED,
        r.isPresent ? COLOR_GREEN_DOT : COLOR_RED_DOT,
      );
    } else {
      drawStatChip(
        PRE_X,
        chipY,
        "P",
        `${r.present}/${totalSabha}`,
        COLOR_GREEN,
        COLOR_GREEN_DOT,
      );
      drawStatChip(
        ABS_X,
        chipY,
        "A",
        `${r.absent}/${totalSabha}`,
        COLOR_RED,
        COLOR_RED_DOT,
      );

      ctx.textAlign = "right";
      ctx.font = statFont;
      ctx.fillStyle =
        r.pct >= 75 ? COLOR_GREEN : r.pct < 50 ? COLOR_RED : COLOR_BLUE;
      ctx.fillText(`${r.pct}%`, PCT_RIGHT, cy - 13);
    }
  });

  // ---- Footer -----------------------------------------------------------
  const footerTop = H - FOOTER_H;
  ctx.fillStyle = COLOR_HEAD_STRIP;
  ctx.fillRect(0, footerTop, W, FOOTER_H);
  ctx.strokeStyle = COLOR_BORDER;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, footerTop + 0.5);
  ctx.lineTo(W, footerTop + 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.font = footerFont;
  ctx.fillStyle = COLOR_LIGHT;
  const stamp = formatDate(new Date()) ?? "";
  ctx.fillText(
    input.subtitle ? `${input.subtitle}  •  ${stamp}` : `Generated ${stamp}`,
    W / 2,
    footerTop + FOOTER_H / 2 - 12,
  );

  // Outer frame.
  roundRectPath(ctx, 0.5, 0.5, W - 1, H - 1, 0);
  ctx.strokeStyle = COLOR_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Failed to render image")),
      "image/png",
    );
  });
}
