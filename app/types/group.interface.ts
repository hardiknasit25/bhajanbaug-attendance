import type { PoshakGroupType } from "~/constant/constant";

// Row shape returned by GET /poshak-group (management list).
export interface GroupData {
  id: number;
  group_name: string;
  group_type: PoshakGroupType | string;
  poshak_leader_id: number;
  leader_name?: string | null;
  // Poshak leader's mobile number — used to open their WhatsApp chat.
  leader_mobile?: string | null;
  total_attendance?: number;
  status?: boolean;
}

// Payload for POST /poshak-group and PUT /poshak-group/:id.
export interface GroupPayload {
  group_name: string;
  group_type: string;
  poshak_leader_id: number;
}
