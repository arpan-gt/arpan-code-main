import { axiosInst } from "../lib/axios";

export const AUTH = {
  SIGN_IN: (payload) => axiosInst.post(`/api/auth/signin`, payload),
  SIGN_UP: (payload) => axiosInst.post(`/api/auth/signup`, payload),
};
