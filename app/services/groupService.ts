import axiosInstance from "~/interceptor/interceptor";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import type { GroupPayload } from "~/types/group.interface";

export const groupService = {
  //#region get all groups (management list — high limit so every group loads)
  getGroups: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.GROUPS.BASE, {
        params: { page: 1, limit: 500 },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region create group
  createGroup: async (payload: GroupPayload) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.GROUPS.BASE,
        payload
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region update group
  updateGroup: async (groupId: number, payload: GroupPayload) => {
    try {
      const response = await axiosInstance.put(
        `${API_ENDPOINTS.GROUPS.BASE}/${groupId}`,
        payload
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region delete group
  deleteGroup: async (groupId: number) => {
    try {
      const response = await axiosInstance.delete(
        `${API_ENDPOINTS.GROUPS.BASE}/${groupId}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
