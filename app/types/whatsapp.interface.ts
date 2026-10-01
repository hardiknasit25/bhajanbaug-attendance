// Mirrors the backend WhatsApp + WhatsApp-report response shapes.

export type WhatsAppConnectionStatus =
  | "disconnected"
  | "initializing"
  | "qr_required"
  | "authenticating"
  | "connected"
  | "auth_failed";

// GET /whatsapp/status (and the connect / logout / change-number responses).
export interface WhatsAppStatusData {
  status: WhatsAppConnectionStatus;
  connected: boolean;
  phoneNumber: string | null;
  displayNumber: string | null;
  name: string | null;
  qr: string | null; // PNG data URL while status === "qr_required"
  lastError: string | null;
  hasSession: boolean;
}

// The report screen's current selection, sent with every report request.
export interface WhatsAppReportSelection {
  sabhaIds?: number[];
  filter?: string;
  groupType?: string;
}

export interface SendGroupReportPayload extends WhatsAppReportSelection {
  groupId: number;
  poshakLeaderId?: number;
}

export interface SendGroupReportResult {
  groupId: number;
  groupName: string | null;
  poshakLeaderId: number | null;
  poshakLeaderName: string;
  mobile: string;
  reportImage: string;
}

export type BulkRecipientStatus =
  | "pending"
  | "generating_report"
  | "sending"
  | "success"
  | "failed"
  | "cancelled";

export interface BulkRecipient {
  groupId: number;
  groupName: string | null;
  poshakLeaderId: number | null;
  poshakLeaderName: string;
  displayNumber: string | null;
  memberCount: number;
  status: BulkRecipientStatus;
  error: string | null;
}

export type BulkJobStatus = "running" | "completed" | "cancelled" | "failed";

export interface BulkSendJob {
  jobId: string;
  status: BulkJobStatus;
  startedAt: string;
  finishedAt: string | null;
  groupType: string | null;
  sabhas: { id: number; title: string | null; sabha_date: string | null }[];
  total: number;
  completed: number;
  successCount: number;
  failedCount: number;
  current: {
    groupId: number;
    poshakLeaderName: string;
    status: BulkRecipientStatus;
  } | null;
  recipients: BulkRecipient[];
  error: string | null;
}
