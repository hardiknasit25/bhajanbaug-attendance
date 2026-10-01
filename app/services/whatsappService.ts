import axiosInstance from "~/interceptor/interceptor";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import type {
  SendGroupReportPayload,
  WhatsAppReportSelection,
} from "~/types/whatsapp.interface";

// Logging out / starting a client and rendering + sending a report take longer
// than the default 10s axios timeout.
const LONG_TIMEOUT_MS = 90_000;

/** Pulls the backend's `{ message }` out of an axios error, if there is one. */
export const getApiErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.message || error?.message || fallback;

export const whatsappService = {
  //#region account
  getStatus: async () => {
    const response = await axiosInstance.get(API_ENDPOINTS.WHATSAPP.STATUS);
    return response.data;
  },

  connect: async () => {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WHATSAPP.CONNECT,
      {},
      { timeout: LONG_TIMEOUT_MS },
    );
    return response.data;
  },

  logout: async () => {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WHATSAPP.LOGOUT,
      {},
      { timeout: LONG_TIMEOUT_MS },
    );
    return response.data;
  },

  changeNumber: async () => {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WHATSAPP.CHANGE_NUMBER,
      {},
      { timeout: LONG_TIMEOUT_MS },
    );
    return response.data;
  },

  //#region report sending
  sendGroupReport: async (payload: SendGroupReportPayload) => {
    const response = await axiosInstance.post(
      API_ENDPOINTS.REPORT.WHATSAPP_SEND,
      payload,
      { timeout: LONG_TIMEOUT_MS },
    );
    return response.data;
  },

  sendAllReports: async (payload: WhatsAppReportSelection) => {
    const response = await axiosInstance.post(
      API_ENDPOINTS.REPORT.WHATSAPP_SEND_ALL,
      payload,
      { timeout: LONG_TIMEOUT_MS },
    );
    return response.data;
  },

  getJob: async (jobId: string) => {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.REPORT.WHATSAPP_JOBS}/${jobId}`,
    );
    return response.data;
  },

  getLatestJob: async () => {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REPORT.WHATSAPP_LATEST_JOB,
    );
    return response.data;
  },

  cancelJob: async (jobId: string) => {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.REPORT.WHATSAPP_JOBS}/${jobId}/cancel`,
    );
    return response.data;
  },
};
