import type { ApiHealthResponse } from "@ozilcuts/types";

import { getApiBaseUrl } from "./base";

export {
  fetchAppointmentCustomerInsights,
} from "./appointmentCustomerInsights";
export {
  fetchAppointmentCustomerAiSummary,
} from "./appointmentCustomerAiSummary";
export {
  approveAppointmentAdjustmentRequest,
  createAppointmentAdjustmentRequest,
  fetchAppointmentAdjustmentRequest,
  fetchAppointmentAdjustmentSuggestions,
  rejectAppointmentAdjustmentRequest,
  withdrawAppointmentAdjustmentRequest,
} from "./appointmentAdjustments";
export { isApiUnauthorizedError } from "./api-security";
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
  deleteShopHeroVideo,
  deleteShopLogo,
  fetchPublicHomeMarketing,
  uploadShopHeroPoster,
  uploadShopHeroVideo,
  uploadShopLogo,
} from "./publicHomeMarketing";
export {
  fetchBarberAnalytics,
  fetchBarberAnalyticsCompare,
} from "./barberAnalytics";
export {
  fetchBarberAvailability,
  fetchManageBarberAvailability,
  replaceManageBarberAvailability,
} from "./barberAvailability";
export { fetchBarber, fetchBarbers, fetchMyBarberProfile } from "./barbers";
export { fetchBarberTrust, submitAppointmentReview } from "./barberTrust";
export { fetchStaffCustomerSearch } from "./staffCustomers";
export {
  cancelAppointment,
  createAppointment,
  createWalkInAppointment,
  fetchAppointment,
  fetchAppointmentQueueIntelligence,
  fetchAppointmentCalendarLink,
  fetchAppointmentPaymentIntent,
  fetchBarberSlots,
  fetchBarberSmartSlotHints,
  fetchMyAppointments,
  rescheduleAppointment,
  sendAppointmentReminder,
  sendAppointmentRunningLate,
  updateAppointmentArrival,
  postAppointmentArrivalProximity,
} from "./booking";
export {
  fetchAppointmentThread,
  markAppointmentThreadRead,
  postAppointmentThreadMessage,
} from "./appointmentMessages";
export { fetchVisitThreadAssist } from "./appointmentVisitThreadAssist";
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
export {
  fetchAdminAuditLogs,
  fetchAdminSecurityReview,
} from "./adminAudit";
export { fetchProductionSecurityReview } from "./productionSecurity";
export type { FetchAuditLogsParams } from "./adminAudit";
export { fetchOperationalInsights } from "./operationalInsights";
export { fetchShopOperationalLive } from "./shopOperationalIntelligence";
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
  deleteCustomerAccount,
  exportCustomerData,
  fetchCustomerPrivacy,
  updateCustomerPrivacy,
} from "./customerPrivacy";
export {
  fetchCustomerRelationship,
  fetchSelfCustomerRelationship,
  updateCustomerVip,
} from "./customerRelationship";
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
export { fetchCustomerRetentionSummary } from "./customerRetentionSummary";
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
