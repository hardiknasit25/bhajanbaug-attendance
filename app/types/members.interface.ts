export interface MemberData {
  id: number;
  role_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  img: string;
  email: string;
  mobile: string;
  password: string | null;
  birth_day?: string;
  satsang_day?: string;
  mulgam?: string;
  smk_no?: string;
  address?: string;
  is_married?: boolean;
  is_job?: boolean;
  occupation?: "job" | "study" | "business";
  occupation_field?: string;
  is_family_leader?: boolean;
  family_leader_id?: number;
  is_seva?: boolean;
  seva?: string;
  parichit_bhakat_name?: string;
  group_id?: number[];
  groups?: { id: number; group_name: string; leader_name: string | null }[];
  user_type?: "yuva" | "group";
  attendance_id?: number;
  is_present?: boolean;
  is_smruti?: boolean;
  total_sabha: number;
  total_present: number;
  total_absent: number;
  attendance_by_sabha: {
    sabha_id: number;
    title: string;
    present: boolean;
    reason: string | null;
    sabha_date: string;
  }[];
}

export interface PoshakGroupData {
  id: number;
  poshak_leader_id: number;
  group_type: string;
  group_name: string;
  status: boolean;
}

export interface MemberPayload {
  first_name: string;
  middle_name: string;
  last_name: string;
  user_type: "yuva" | "group";
  email?: string | null;
  mobile: string;
  // role_id: number;
  birth_day?: string | Date | null;
  satsang_day?: string | null;
  mulgam?: string | null;
  smk_no?: string | null;
  address?: string | null;
  is_married?: boolean;
  is_job?: boolean;
  occupation?: "job" | "study" | "business";
  occupation_field?: string | null;
  is_family_leader?: boolean;
  family_leader_id?: number | null;
  is_seva?: boolean;
  seva?: string | null;
  parichit_bhakat_name?: string | null;
  group_id?: number[] | null;
  is_smruti?: boolean;
  groups?: { id: number }[] | null;
}

export type MemberStatus = "present" | "absent";

//#region Poshak Group Response Interface
export interface PoshakGroupData {
  group_id: number;
  group_name: string;
  group_type: string;
  poshak_leader_id: number;
  leader_details: {
    user_id: number;
    first_name: string;
    middle_name: string;
    last_name: string;
    smk_no: string;
  };
  users: MemberData[];
}
