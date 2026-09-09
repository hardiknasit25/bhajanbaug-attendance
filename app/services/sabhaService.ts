import type { SabhaType } from "~/components/forms/SabhaForm";
import { ABSENT_MEMBER, PRESENT_MEMBER } from "~/constant/constant";
import axiosInstance from "~/interceptor/interceptor";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import { localJsonStorageService } from "~/lib/localStorage";

export const sabhaService = {
  //#region get all sabhas
  getSabhas: async (sabha_status: string) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SABHA.BASE, {
        params: {
          status: sabha_status,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region fetch sabha by id
  getSabhaById: async (
    sabhaId: number,
    user?: string,
    groupId?: number | null,
  ) => {
    try {
      const params: Record<string, string> = {};
      if (user) {
        params.user = user;
      }
      if (groupId) {
        params.group_id = String(groupId);
      }
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.SABHA.BASE}/${sabhaId}`,
        { params },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region sync sabha attendance by id
  syncSabhaAttendance: async (sabhaId: number) => {
    try {
      const presentUserIds =
        localJsonStorageService.getItem<number[]>(PRESENT_MEMBER) || [];
      const absentUserIds =
        localJsonStorageService.getItem<number[]>(ABSENT_MEMBER) || [];
      const response = await axiosInstance.post(`${API_ENDPOINTS.SABHA.SYNC}`, {
        sabha_id: sabhaId,
        present_user_id: presentUserIds,
        absent_user_id: absentUserIds,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region mark a single member present (QR scan) — persists immediately
  markMemberPresent: async (sabhaId: number, userId: number) => {
    try {
      const response = await axiosInstance.post(`${API_ENDPOINTS.SABHA.SYNC}`, {
        sabha_id: sabhaId,
        present_user_id: [userId],
        absent_user_id: [],
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region start sabha by id
  startSabha: async (sabhaId: number) => {
    try {
      console.log("sabhaId", sabhaId);
      const response = await axiosInstance.put(
        `${API_ENDPOINTS.SABHA.START_SABHA}/${sabhaId}`,
        {
          sabha_date: new Date().toISOString(),
        },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region complete sabha by id
  submitSabhaReport: async (sabhaId: number) => {
    try {
      const response = await axiosInstance.put(
        `${API_ENDPOINTS.SABHA.SUBMIT_SABHA_REPORT}/${sabhaId}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region create sabha
  createSabha: async (title: string, sabhaType: SabhaType) => {
    try {
      const response = await axiosInstance.post(`${API_ENDPOINTS.SABHA.BASE}`, {
        title,
        sabha_type: sabhaType,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region delete sabha
  deleteSabha: async (sabhaId: number) => {
    try {
      const response = await axiosInstance.delete(
        `${API_ENDPOINTS.SABHA.BASE}/${sabhaId}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region update sabha
  updateSabha: async (sabhaId: number, title: string, sabhaType: SabhaType) => {
    try {
      const response = await axiosInstance.put(
        `${API_ENDPOINTS.SABHA.BASE}/${sabhaId}`,
        {
          title,
          sabha_type: sabhaType,
        },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
