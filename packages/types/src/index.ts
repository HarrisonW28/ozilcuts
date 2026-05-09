export const OZILCUTS_APP_NAME = "Ozilcuts" as const;

export const DEPOSIT_POLICIES = ["always", "first_time_customer"] as const;
export type DepositPolicy = (typeof DEPOSIT_POLICIES)[number];

export type ServiceSummary = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
  deposit_policy: DepositPolicy;
};

export type BarberPublicRef = {
  id: number;
  name: string;
};

export type BarberProfilePublic = {
  id: number;
  title: string | null;
  bio: string | null;
  years_experience: number | null;
  barber: BarberPublicRef;
};

/** 0 = Sunday … 6 = Saturday (matches PHP `date('w')`) */
export const BARBER_WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type BarberAvailabilityTimeWindow = {
  starts_at: string;
  ends_at: string;
};

export type BarberAvailabilityDay = {
  weekday: number;
  windows: BarberAvailabilityTimeWindow[];
};

export type BarberAvailabilityPayload = {
  weekdays: BarberAvailabilityDay[];
};

export type BarberAvailabilityWindowInput = {
  weekday: number;
  starts_at: string;
  ends_at: string;
};

export type BarberManageRow = {
  id: number;
  title: string | null;
  bio: string | null;
  years_experience: number | null;
  is_published: boolean;
  user: {
    id: number;
    name: string;
    email: string;
  };
  updated_at: string | null;
};

export type ServiceManageRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
  deposit_policy: DepositPolicy;
  sort_order: number;
  is_active: boolean;
  updated_at: string | null;
};

export type CreateServiceInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
  duration_minutes: number;
  price_cents: number;
  deposit_cents?: number;
  deposit_policy?: DepositPolicy;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdateServiceInput = {
  name?: string;
  slug?: string | null;
  description?: string | null;
  duration_minutes?: number;
  price_cents?: number;
  deposit_cents?: number;
  deposit_policy?: DepositPolicy;
  sort_order?: number;
  is_active?: boolean;
};

export type LaravelPaginationLinks = {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
};

export type LaravelPaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type Paginated<T> = {
  data: T[];
  links: LaravelPaginationLinks;
  meta: LaravelPaginationMeta;
};

export type CreateBarberInput = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  title?: string;
  bio?: string;
  years_experience?: number;
  is_published?: boolean;
};

export type UpdateBarberProfileInput = {
  title?: string | null;
  bio?: string | null;
  years_experience?: number | null;
  is_published?: boolean;
};

export type CustomerProfile = {
  id: number;
  phone: string | null;
  preferred_barber_user_id: number | null;
  preferences: string | null;
  marketing_opt_in: boolean;
  updated_at: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  preferred_barber?: {
    id: number;
    name: string;
  } | null;
};

export type UpdateCustomerProfileInput = {
  phone?: string | null;
  preferred_barber_user_id?: number | null;
  preferences?: string | null;
  marketing_opt_in?: boolean;
};

export const HAIR_TYPE_OPTIONS = [
  "straight",
  "wavy",
  "curly",
  "coily",
] as const;
export type HairType = (typeof HAIR_TYPE_OPTIONS)[number];

export const HAIR_THICKNESS_OPTIONS = ["fine", "medium", "thick"] as const;
export type HairThickness = (typeof HAIR_THICKNESS_OPTIONS)[number];

export const HAIR_LENGTH_OPTIONS = [
  "very_short",
  "short",
  "medium",
  "long",
] as const;
export type HairLength = (typeof HAIR_LENGTH_OPTIONS)[number];

export const SCALP_CONDITION_OPTIONS = [
  "normal",
  "dry",
  "oily",
  "sensitive",
] as const;
export type ScalpCondition = (typeof SCALP_CONDITION_OPTIONS)[number];

export type HairProfilePhoto = {
  id: number;
  caption: string | null;
  mime_type: string;
  size_bytes: number;
  created_at: string | null;
  url: string;
};

export type HairProfile = {
  id: number;
  hair_type: HairType | null;
  hair_thickness: HairThickness | null;
  hair_length: HairLength | null;
  scalp_condition: ScalpCondition | null;
  preferred_clipper_guard: string | null;
  allergies: string | null;
  styling_notes: string | null;
  updated_at: string | null;
  photos: HairProfilePhoto[];
  user?: {
    id: number;
    name: string;
    email: string;
  };
};

export type UpdateHairProfileInput = {
  hair_type?: HairType | null;
  hair_thickness?: HairThickness | null;
  hair_length?: HairLength | null;
  scalp_condition?: ScalpCondition | null;
  preferred_clipper_guard?: string | null;
  allergies?: string | null;
  styling_notes?: string | null;
};

export type AppointmentHairProfileResponse = {
  data: HairProfile | null;
};

export const HAIRCUT_PHOTO_KINDS = ["before", "after"] as const;
export type HaircutPhotoKind = (typeof HAIRCUT_PHOTO_KINDS)[number];

export type HaircutPhoto = {
  id: number;
  appointment_id: number;
  kind: HaircutPhotoKind;
  caption: string | null;
  mime_type: string;
  size_bytes: number;
  is_public: boolean;
  customer_consent: boolean;
  uploaded_by_user_id: number;
  created_at: string | null;
  url: string;
};

export type AppointmentHaircutPhotosResponse = {
  data: HaircutPhoto[];
};

export type UpdateHaircutPhotoInput = {
  caption?: string | null;
  kind?: HaircutPhotoKind;
  is_public?: boolean;
  customer_consent?: boolean;
};

export type BarberPortfolioResponse = {
  data: HaircutPhoto[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type CustomerNote = {
  id: number;
  customer_user_id: number;
  author_user_id: number;
  body: string;
  pinned: boolean;
  created_at: string | null;
  updated_at: string | null;
  author?: {
    id: number;
    name: string;
  } | null;
};

export type CreateCustomerNoteInput = {
  body: string;
  pinned?: boolean;
};

export type UpdateCustomerNoteInput = {
  body?: string;
  pinned?: boolean;
};

export type CustomerTag = {
  id: number;
  customer_user_id: number;
  label: string;
  created_by_user_id: number;
  created_at: string | null;
};

export type CustomerNotesResponse = {
  data: CustomerNote[];
};

export type CustomerTagsResponse = {
  data: CustomerTag[];
};

export type CustomerTagSuggestionsResponse = {
  data: string[];
};

export type ApiHealthResponse = {
  status: "ok";
};

export type AuthUserRole = {
  id: number;
  slug: string;
  name: string;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  role: AuthUserRole;
};

export type AuthSuccessResponse = {
  user: AuthUser;
  token: string;
};

export type LaravelValidationPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type BarberSlotsPayload = {
  date: string;
  service_id: number;
  duration_minutes: number;
  /** ISO 8601 starts (no timezone offset). */
  slots: string[];
};

export type AppointmentStatus = "confirmed" | "cancelled";

export type AppointmentPaymentStatus =
  | "not_required"
  | "requires_payment"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

export type AppointmentRecord = {
  id: number;
  status: AppointmentStatus;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  deposit_cents: number;
  payment_status: AppointmentPaymentStatus;
  amount_paid_cents: number;
  paid_at: string | null;
  refunded_at: string | null;
  service?: {
    id: number;
    name: string;
    slug: string;
    duration_minutes: number;
    price_cents: number;
    deposit_cents: number;
  };
  barber?: {
    id: number;
    name: string;
  };
  customer?: {
    id: number;
    name: string;
    email: string;
  };
};

export type AppointmentPaymentMeta = {
  enabled: boolean;
  currency: string;
  publishable_key: string | null;
  client_secret: string | null;
};

export type CreateAppointmentResponse = AppointmentRecord & {
  payment: AppointmentPaymentMeta;
};

export type PaymentConfig = {
  enabled: boolean;
  publishable_key: string | null;
  currency: string;
};

export type AppointmentCalendarLink = {
  url: string;
  expires_in_seconds: number;
};

export type AppointmentPendingPayment = {
  enabled: boolean;
  currency: string;
  publishable_key: string | null;
  client_secret: string | null;
  payment_status: AppointmentPaymentStatus | null;
  deposit_cents: number;
};

export type CreateAppointmentInput = {
  service_id: number;
  barber_user_id: number;
  /** ISO 8601 (e.g. `2026-05-11T09:00:00`). */
  starts_at: string;
  notes?: string | null;
};

export type RescheduleAppointmentInput = {
  /** ISO 8601 (e.g. `2026-05-11T09:00:00`). */
  starts_at: string;
};

export type AppointmentStatusFilter = "all" | "confirmed" | "cancelled";

export type AppointmentRangeFilter = "all" | "upcoming" | "past";

export type AppointmentListFilters = {
  status?: AppointmentStatusFilter;
  range?: AppointmentRangeFilter;
  page?: number;
  /** YYYY-MM-DD, inclusive lower bound. Pair with `to`. */
  from?: string;
  /** YYYY-MM-DD, inclusive upper bound. Pair with `from`. */
  to?: string;
  /** 1..200, server-clamped. Defaults to 20, or 200 when from+to are set. */
  perPage?: number;
};

export type CustomerRanking = {
  customer_user_id: number;
  customer_name: string;
  visits: number;
  total_spent_cents: number;
  /** ISO 8601 */
  last_visit_at: string | null;
};

export type CustomerLtvBucket = {
  label: string;
  min_cents: number;
  max_cents: number | null;
  customers: number;
};

export type CustomerAnalyticsAggregate = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
  active_customers: number;
  new_customers: number;
  returning_customers: number;
  visits_total: number;
  visits_per_customer_avg: number;
  /** Average days between consecutive visits across active customers. */
  avg_interval_days: number | null;
  ltv_distribution: CustomerLtvBucket[];
  top_spenders: CustomerRanking[];
  top_visitors: CustomerRanking[];
};

export type CustomerVisitSummary = {
  customer_user_id: number;
  customer_name: string;
  customer_email: string;
  total_visits: number;
  total_spent_cents: number;
  total_booked_cents: number;
  /** ISO 8601 */
  first_visit_at: string | null;
  /** ISO 8601 */
  last_visit_at: string | null;
  avg_interval_days: number | null;
  preferred_barber: { user_id: number; name: string } | null;
  visits_by_status: { confirmed: number; cancelled: number };
};

export type CustomerAnalyticsResponse = {
  summary: CustomerVisitSummary;
  history: AppointmentRecord[];
};

export type CustomerAnalyticsRangeFilters = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
};

export type OperationsTodayBlock = {
  /** YYYY-MM-DD */
  date: string;
  confirmed: number;
  cancelled: number;
  deposits_collected_cents: number;
  deposits_pending_cents: number;
};

export type OperationsWeekBlock = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
  confirmed: number;
  cancelled: number;
  /** 0..1 fraction. */
  cancel_rate: number;
  deposits_collected_cents: number;
  deposits_pending_cents: number;
};

export type OperationsHeatmapCell = {
  /** Sunday=0..Saturday=6 (Carbon dayOfWeek). */
  weekday: number;
  weekday_label: string;
  /** 0..23 */
  hour: number;
  count: number;
};

export type OperationsLeadTimeBucket = {
  label: string;
  count: number;
};

export type OperationalInsightsReport = {
  today: OperationsTodayBlock;
  week: OperationsWeekBlock;
  range: { from: string; to: string };
  /** 7×24 = 168 cells, dense. */
  peak_heatmap: OperationsHeatmapCell[];
  booking_lead_time: OperationsLeadTimeBucket[];
  cancellation_lead_time: OperationsLeadTimeBucket[];
};

export type OperationalInsightsRangeFilters = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
};

export const NOTIFICATION_EVENTS = [
  "appointment.confirmed",
  "appointment.cancelled",
  "appointment.rescheduled",
  "appointment.reminder",
  "appointment.rebook_suggested",
  "staff.booking.created",
  "staff.booking.cancelled",
  "staff.booking.rescheduled",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_CHANNELS = ["mail", "inapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type NotificationData = {
  appointment_id?: number;
  service_name?: string | null;
  barber_name?: string | null;
  customer_name?: string | null;
  /** ISO 8601 */
  starts_at?: string | null;
  /** ISO 8601 */
  previous_starts_at?: string | null;
  actor_name?: string | null;
  audience?: "admin" | "barber" | string | null;
  /** Smart rebook payload — present on appointment.rebook_suggested. */
  suggested_date?: string;
  interval_days?: number;
  service_id?: number;
  barber_user_id?: number;
  // Forward-compatible fallback for unknown payload keys.
  [extra: string]: unknown;
};

export type NotificationRecord = {
  id: number;
  type: NotificationEvent;
  data: NotificationData;
  /** ISO 8601 */
  read_at: string | null;
  /** ISO 8601 */
  created_at: string | null;
};

export type NotificationPreferenceRow = {
  event_key: NotificationEvent;
  channel: NotificationChannel;
  enabled: boolean;
};

export type NotificationPreferencesResponse = {
  preferences: NotificationPreferenceRow[];
  events: { key: NotificationEvent; label: string; description: string }[];
  channels: { key: NotificationChannel; label: string }[];
};

export type NotificationUnreadCountResponse = {
  unread: number;
};

export type NotificationMarkAllReadResponse = {
  updated: number;
  unread: number;
};

export type SnoozeRebookNudgeResponse = {
  state: "sent" | "snoozed";
  /** ISO 8601, present when state is 'snoozed'. */
  snooze_until: string | null;
};

export type BarberAnalyticsSummary = {
  barber_user_id: number;
  barber_name: string;
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
  appointments_total: number;
  appointments_confirmed: number;
  appointments_cancelled: number;
  /** 0..1 */
  cancellation_rate: number;
  booked_cents: number;
  collected_cents: number;
  booked_minutes: number;
  available_minutes: number;
  /** 0..1 */
  utilization_pct: number;
  customers_total: number;
  repeat_customers: number;
};

export type BarberAnalyticsTopService = {
  service_id: number;
  service_name: string;
  count: number;
  booked_cents: number;
};

export type BarberAnalyticsTopCustomer = {
  customer_user_id: number;
  customer_name: string;
  visits: number;
  booked_cents: number;
};

export type BarberAnalyticsSeriesPoint = {
  /** YYYY-MM-DD */
  bucket: string;
  appointments_count: number;
  booked_cents: number;
  collected_cents: number;
};

export type BarberAnalyticsReport = {
  summary: BarberAnalyticsSummary;
  top_services: BarberAnalyticsTopService[];
  top_customers: BarberAnalyticsTopCustomer[];
  series: BarberAnalyticsSeriesPoint[];
};

export type BarberAnalyticsRangeFilters = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
};

export type BarberAnalyticsCompareResponse = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
  rows: BarberAnalyticsSummary[];
};

export const REVENUE_REPORT_GRANULARITIES = ["day", "month"] as const;

export type RevenueReportGranularity =
  (typeof REVENUE_REPORT_GRANULARITIES)[number];

export type RevenueReportSummary = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
  booked_cents: number;
  collected_cents: number;
  refunded_cents: number;
  net_collected_cents: number;
  booked_appointments: number;
  paid_appointments: number;
};

export type RevenueByBarberRow = {
  barber_user_id: number;
  barber_name: string;
  booked_cents: number;
  collected_cents: number;
  booked_appointments: number;
};

export type RevenueByServiceRow = {
  service_id: number;
  service_name: string;
  booked_cents: number;
  collected_cents: number;
  booked_appointments: number;
};

export type RevenueSeriesPoint = {
  /** YYYY-MM-DD for day, YYYY-MM for month */
  bucket: string;
  booked_cents: number;
  collected_cents: number;
  booked_appointments: number;
};

export type RevenueReportFilters = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
  granularity?: RevenueReportGranularity;
};

export type RevenueReport = {
  summary: RevenueReportSummary;
  by_barber: RevenueByBarberRow[];
  by_service: RevenueByServiceRow[];
  series: RevenueSeriesPoint[];
  granularity: RevenueReportGranularity;
};

export type RebookSuggestion = {
  service_id: number;
  barber_user_id: number;
  /** ISO date (YYYY-MM-DD). Suggested date to pre-select on /book. */
  suggested_date: string;
  /** Average days between past appointments with this barber. */
  interval_days: number;
  /** Number of confirmed past appointments used to compute the cadence. */
  sample_size: number;
  /** ISO timestamp of the source appointment, when applicable. */
  last_appointment_at: string | null;
  service: ServiceSummary | null;
  barber: BarberPublicRef | null;
};
