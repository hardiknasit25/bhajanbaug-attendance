import axiosInstance from "~/interceptor/interceptor";
import { API_ENDPOINTS } from "~/lib/api-endpoints";

export type filterType =
  | "lastSabha"
  | "lastMonthAllSabha"
  | "lastThreeMonthsAllSabha"
  | "lastSixMonthsAllSabha"
  | "lastYearAllSabha"
  | "lastFourSabha"
  | "allSabhaWithDuration";

// Builds the query params for a report request. When specific sabhas are selected,
// they are sent as `sabha_ids=1,2,3` and take precedence over the duration filter.
const buildReportParams = (filter: filterType, sabhaIds?: number[]) => {
  const params: Record<string, string> = { filter };
  if (sabhaIds && sabhaIds.length > 0) {
    params.sabha_ids = sabhaIds.join(",");
  }
  return params;
};

// Returned by GET /report/whatsapp/share-image.
export interface GroupShareImage {
  groupId: number;
  poshakLeaderId: number | null;
  poshakLeaderName: string;
  mobile: string; // digits only, with country code
  imageUrl: string;
  message: string; // ready-made WhatsApp text (contains imageUrl)
}

export const reportService = {
  //#region fetch member report
  getMemberReport: async (filter: filterType, sabhaIds?: number[]) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.REPORT.MEMBER_REPORT,
        { params: buildReportParams(filter, sabhaIds) }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region fetch group report (optionally scoped to a group_type)
  getGroupReport: async (
    filter: filterType,
    sabhaIds?: number[],
    groupType?: string
  ) => {
    try {
      const params = buildReportParams(filter, sabhaIds);
      if (groupType) params.group_type = groupType;
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.REPORT.GROUP_REPORT}`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //#region "Share member list image": backend renders + saves the image and
  // returns the Poshak Leader's number and the WhatsApp message with its link.
  getGroupShareImage: async (
    groupId: number,
    filter: filterType,
    sabhaIds?: number[],
    groupType?: string
  ) => {
    const params: Record<string, string> = {
      ...buildReportParams(filter, sabhaIds),
      group_id: String(groupId),
    };
    if (groupType) params.group_type = groupType;
    const response = await axiosInstance.get(
      API_ENDPOINTS.REPORT.WHATSAPP_SHARE_IMAGE,
      // Rendering the image can take longer than the default 10s on a slow server.
      { params, timeout: 60_000 }
    );
    return response.data as { data: GroupShareImage };
  },
};
