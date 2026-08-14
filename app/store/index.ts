import { configureStore } from "@reduxjs/toolkit";
import memberReducer from "./slice/memberSlice";
import sabhaReducer from "./slice/sabhaSlice";
import reportReducer from "./slice/reportSlice";
import roleReducer from "./slice/roleSlice";
import permissionReducer from "./slice/permissionSlice";
import groupReducer from "./slice/groupSlice";

export const store = configureStore({
  reducer: {
    members: memberReducer,
    sabha: sabhaReducer,
    report: reportReducer,
    roles: roleReducer,
    permissions: permissionReducer,
    groups: groupReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
