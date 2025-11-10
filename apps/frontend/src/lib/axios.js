import axios from "axios";
import { ENVS } from "../utils/envs";

export const axiosInst = axios.create({
  baseURL: ENVS.API_URL,
  withCredentials: true,
});
