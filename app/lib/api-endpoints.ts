export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "auth/login",
    LOGOUT: "auth/logout",
    ME: "auth/me",
  },

  MEMBERS: {
    BASE: "user",
    UPDATE_STATUS: "update-status",

    POSHAK_GROUP: "poshak-group",

    IMPORT: "user/import",
    EXPORT: "user/export/data",
    TEMPLATE: "user/export/template",
    QR: "user/export/qr",

    WISHES: "user/wishes",
  },

  SABHA: {
    BASE: "sabha",
    START_SABHA: "sabha/start",
    CREATE_EVENT: "create-event",
    UPDATE_EVENT: "update-event",
    SUBMIT_SABHA_REPORT: "sabha/complete",
    SYNC: "attendance/sync",
    REASON: "attendance/reason",
  },

  REPORT: {
    BASE: "report",
    MEMBER_REPORT: "report/user",
    GROUP_REPORT: "report/group",
  },

  GROUPS: {
    BASE: "poshak-group",
    SELECT: "poshak-group/select",
  },

  ROLE: {
    BASE: "role",
    SELECT: "role/select",
  },

  MODULE: {
    BASE: "module",
  },

  PERMISSION: {
    BASE: "permission",
    MY: "permission/my",
    CHANGE_ALL: "permission/all",
    BY_ROLE: "permission/role",
  },
};
