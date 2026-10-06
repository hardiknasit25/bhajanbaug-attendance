export interface SabhaData {
  id: number;
  title: string;
  sabha_date: string;
  sabha_type?: "yuva_sabha" | "group_sabha" | "karyakar_sabha";
  status: SabhaStatus;
  total_present?: number;
  total_users?: number;
}

export type SabhaStatus = "upcoming" | "completed" | "running";
