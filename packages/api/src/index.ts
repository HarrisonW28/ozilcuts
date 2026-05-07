import type { ApiHealthResponse } from "@ozilcuts/types";

import { getApiBaseUrl } from "./base";

export {
  ApiError,
  ApiValidationError,
  fetchCurrentUser,
  getGoogleOAuthRedirectUrl,
  loginUser,
  logoutUser,
  registerUser,
} from "./auth";
export { getApiBaseUrl } from "./base";
export { fetchBarber, fetchBarbers } from "./barbers";
export {
  createManagedBarber,
  fetchManageBarbers,
  updateManagedBarberProfile,
} from "./manageBarbers";
export {
  createManagedService,
  deleteManagedService,
  fetchManageServices,
  updateManagedService,
} from "./manageServices";
export { fetchServices } from "./services";

export async function fetchApiHealth(): Promise<ApiHealthResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/health`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json() as Promise<ApiHealthResponse>;
}
