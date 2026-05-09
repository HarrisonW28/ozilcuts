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
export {
  fetchBarberAnalytics,
  fetchBarberAnalyticsCompare,
} from "./barberAnalytics";
export {
  fetchBarberAvailability,
  fetchManageBarberAvailability,
  replaceManageBarberAvailability,
} from "./barberAvailability";
export { fetchBarber, fetchBarbers } from "./barbers";
export {
  cancelAppointment,
  createAppointment,
  createWalkInAppointment,
  fetchAppointment,
  fetchAppointmentCalendarLink,
  fetchAppointmentPaymentIntent,
  fetchBarberSlots,
  fetchMyAppointments,
  rescheduleAppointment,
  sendAppointmentReminder,
  sendAppointmentRunningLate,
} from "./booking";
export {
  fetchCustomerAnalytics,
  fetchCustomerAnalyticsAggregate,
  fetchMyVisitsSummary,
} from "./customerAnalytics";
export {
  fetchNotificationPreferences,
  fetchNotificationUnreadCount,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "./notifications";
export { fetchOperationalInsights } from "./operationalInsights";
export { fetchRetentionReport } from "./retentionReport";
export {
  attachCustomerTag,
  createCustomerNote,
  deleteCustomerNote,
  detachCustomerTag,
  fetchCustomerNotes,
  fetchCustomerTagSuggestions,
  fetchCustomerTags,
  updateCustomerNote,
} from "./customerNotesTags";
export {
  fetchCustomerProfile,
  updateCustomerProfile,
} from "./customerProfile";
export {
  deleteHairProfilePhoto,
  fetchAppointmentHairProfile,
  fetchHairProfile,
  updateHairProfile,
  uploadHairProfilePhoto,
} from "./hairProfile";
export {
  deleteHaircutPhoto,
  fetchAppointmentHaircutPhotos,
  fetchBarberPortfolio,
  updateHaircutPhoto,
  uploadHaircutPhoto,
} from "./haircutPhotos";
export { fetchPaymentConfig } from "./payments";
export {
  fetchAppointmentRebookHint,
  fetchNextVisitSuggestion,
  snoozeRebookNudge,
} from "./rebookSuggestions";
export {
  downloadRevenueReportCsv,
  fetchRevenueReport,
} from "./revenueReport";
export {
  createManagedBarber,
  fetchManageBarbers,
  updateManagedBarberProfile,
} from "./manageBarbers";
export {
  applyServiceStarterPack,
  patchShopOnboarding,
} from "./shopOnboarding";
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
