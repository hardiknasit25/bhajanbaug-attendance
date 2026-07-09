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
};
