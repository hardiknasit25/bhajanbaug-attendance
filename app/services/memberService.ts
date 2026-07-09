import axiosInstance from "~/interceptor/interceptor";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import type { CommonParams } from "~/types/common.interface";
import type { MemberPayload } from "~/types/members.interface";

export const memberService = {
  //#region get members
  getMembers: async () => {
    try {
      const response = await axiosInstance(API_ENDPOINTS.MEMBERS.BASE);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region get member by id
  getMemberById: async (memberId: number) => {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.MEMBERS.BASE}/${memberId}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region fetch members by poshak group (optionally scoped to a group_type)
  getMembersByPoshakGroup: async (groupType?: string) => {
    try {
      const params: Record<string, string> = {};
      if (groupType) params.group_type = groupType;
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.MEMBERS.BASE}/poshak-group`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#create member
  createMember: async (memberData: MemberPayload) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.MEMBERS.BASE,
        memberData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region update member
  updateMember: async (memberId: number, memberData: MemberPayload) => {
    try {
      const response = await axiosInstance.put(
        `${API_ENDPOINTS.MEMBERS.BASE}/${memberId}`,
        memberData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region delete member
  deleteMember: async (memberId: number) => {
    try {
      const response = await axiosInstance.delete(
        `${API_ENDPOINTS.MEMBERS.BASE}/${memberId}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region fetch members by group
  getPoshakGroup: async (params: CommonParams) => {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.MEMBERS.POSHAK_GROUP}`,
        {
          params: {
            page: params.page,
            limit: params.limit,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region enter reason for sabha
  enterReasonForSabha: async (
    sabha_id: number,
    user_id: number,
    reason: string
  ) => {
    try {
      const response = await axiosInstance.put(
        `${API_ENDPOINTS.SABHA.REASON}`,
        {
          sabha_id,
          user_id,
          reason,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region fetch group select
  groupSelect: async () => {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.GROUPS.SELECT}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region get upcoming birthday wishes for the home page
  getWishes: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.MEMBERS.WISHES);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region download the import template (.xlsx)
  downloadTemplate: async () => {
    const response = await axiosInstance.get(API_ENDPOINTS.MEMBERS.TEMPLATE, {
      responseType: "blob",
    });
    return response.data as Blob;
  },

  //#region export all users (.xlsx)
  exportMembers: async () => {
    const response = await axiosInstance.get(API_ENDPOINTS.MEMBERS.EXPORT, {
      responseType: "blob",
    });
    return response.data as Blob;
  },

  //#region download a single member's QR card (.pdf)
  downloadQrCode: async (userId: number) => {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.MEMBERS.QR}/${userId}`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },

  //#region download member QR codes (.pdf)
  // groupId omitted/undefined -> all accessible members; a number -> that group;
  // null -> the "no group" bucket (sent to the API as group_id=none).
  downloadQrCodes: async (groupId?: number | null) => {
    const params: Record<string, string> = {};
    if (groupId !== undefined) {
      params.group_id = groupId === null ? "none" : String(groupId);
    }
    const response = await axiosInstance.get(API_ENDPOINTS.MEMBERS.QR, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  //#region import users from an .xlsx file
  importMembers: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosInstance.post(
      API_ENDPOINTS.MEMBERS.IMPORT,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },
};
