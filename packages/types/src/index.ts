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

export type BarberTrustConsistencyLevel = "strong" | "good" | "building";

export type BarberTrustConsistencyIndicator = {
  key: string;
  label: string;
  value_label: string;
  level: BarberTrustConsistencyLevel;
  description: string;
};

export type BarberTrustRepeatMetrics = {
  unique_customers: number;
  repeat_customers: number;
  /** 0..1 fraction of guests with 2+ visits. */
  repeat_rate: number;
  verified_visits: number;
};

export type BarberTrustPortfolioSignals = {
  public_photo_count: number;
  before_after_pair_count: number;
  has_recent_work: boolean;
  guest_consent_photos: boolean;
};

export type BarberTrustReview = {
  id: number;
  rating: number;
  body: string;
  customer_display_name: string;
  service_name: string | null;
  visited_at: string | null;
  verified: true;
};

export type BarberTrustSummary = {
  barber_user_id: number;
  average_rating: number | null;
  review_count: number;
  repeat_metrics: BarberTrustRepeatMetrics;
  consistency: BarberTrustConsistencyIndicator[];
  specialties: string[];
  specialties_source: "profile" | "inferred";
  portfolio: BarberTrustPortfolioSignals;
  reviews: BarberTrustReview[];
  highlights: string[];
};

export type AppointmentReview = {
  id: number;
  appointment_id: number;
  rating: number;
  body: string;
  verified: boolean;
  customer_display_name: string;
  service_name: string | null;
  visited_at: string | null;
  created_at: string | null;
};

export type BarberManageRow = {
  id: number;
  title: string | null;
  bio: string | null;
  years_experience: number | null;
  specialties?: string[];
  is_published: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    shop_latitude: number | null;
    shop_longitude: number | null;
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
  /** Admin-only: shop coordinates for geofenced arrival (WGS84). */
  shop_latitude?: number | null;
  shop_longitude?: number | null;
};

export type CustomerProfile = {
  id: number;
  phone: string | null;
  /** ISO date (YYYY-MM-DD) for birthday personalization. */
  date_of_birth: string | null;
  preferred_barber_user_id: number | null;
  preferences: string | null;
  marketing_opt_in: boolean;
  /** When true, automated retention nudges are suppressed (rebook + inactivity). */
  retention_paused: boolean;
  /**
   * When true, the app may send coarse location pings during the check-in window
   * so you and your barber get a gentle nearby alert (no continuous tracking).
   */
  arrival_location_opt_in: boolean;
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
  date_of_birth?: string | null;
  preferred_barber_user_id?: number | null;
  preferences?: string | null;
  marketing_opt_in?: boolean;
  retention_paused?: boolean;
  arrival_location_opt_in?: boolean;
};

export type CustomerPrivacyConsents = {
  terms_accepted_at: string | null;
  privacy_policy_accepted_at: string | null;
  marketing_opt_in: boolean;
  arrival_location_opt_in: boolean;
  retention_paused: boolean;
};

export type CustomerPrivacySnapshot = {
  consents: CustomerPrivacyConsents;
  notifications: {
    enabled_count: number;
    total_count: number;
  };
  data_rights: {
    can_export: boolean;
    can_delete_account: boolean;
  };
};

export type UpdateCustomerPrivacyInput = {
  marketing_opt_in?: boolean;
  arrival_location_opt_in?: boolean;
  retention_paused?: boolean;
};

export type DeleteCustomerAccountInput = {
  confirmation: "DELETE";
};

export type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  accept_terms: boolean;
  accept_privacy: boolean;
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

export type CustomerRelationshipBirthday = {
  has_date: boolean;
  display: string | null;
  month: number | null;
  day: number | null;
  days_until: number | null;
  is_today: boolean;
  is_soon: boolean;
};

export type CustomerRelationshipMilestone = {
  visit_count: number;
  label: string;
  visits_remaining?: number;
};

export type CustomerRelationshipMilestones = {
  achieved: CustomerRelationshipMilestone[];
  next: CustomerRelationshipMilestone | null;
};

export type CustomerRelationshipLoyaltyEvent = {
  kind: "visit" | "milestone";
  label: string;
  occurred_at: string | null;
  visit_number?: number;
  visit_count?: number;
};

export type CustomerRelationshipNotePreview = {
  id: number;
  body: string;
  pinned: boolean;
  author_name?: string | null;
  created_at: string | null;
};

export type CustomerRelationshipSnapshot = {
  customer_user_id: number;
  customer_name: string;
  is_vip: boolean;
  birthday: CustomerRelationshipBirthday;
  milestones: CustomerRelationshipMilestones;
  loyalty_history: CustomerRelationshipLoyaltyEvent[];
  relationship_notes: CustomerRelationshipNotePreview[];
  visit_summary: {
    total_visits: number;
    last_visit_at: string | null;
    first_visit_at: string | null;
  };
  tags: Array<{
    id: number;
    label: string;
    is_vip: boolean;
  }>;
};

export type UpdateCustomerVipInput = {
  is_vip: boolean;
};

export type ApiHealthResponse = {
  status: "ok";
};

export type AuthUserRole = {
  id: number;
  slug: string;
  name: string;
};

/** Present on the API only when `role.slug === "admin"`. */
export type ShopAdminState = {
  shop_display_name: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  shop_pays_cash_only: boolean;
  shop_deposits_enabled: boolean;
  shop_tap_to_pay_later: boolean;
  /** Shop-wide template; new barbers start with these hours until edited per chair. */
  shop_default_hours: BarberAvailabilityPayload | null;
  shop_hero_video_path: string | null;
  shop_hero_video_mobile_path: string | null;
  shop_hero_poster_path: string | null;
  shop_hero_poster_mobile_path: string | null;
  shop_logo_path: string | null;
  shop_instagram_handle: string | null;
  shop_public_address: string | null;
  shop_visit_note: string | null;
  shop_latitude: number | null;
  shop_longitude: number | null;
};

export type HeroMediaVariant = "desktop" | "mobile";

export type PublicHomeMarketing = {
  logo_url: string | null;
  hero_desktop_mp4: string | null;
  hero_desktop_webm: string | null;
  hero_desktop_poster: string | null;
  hero_mobile_mp4: string | null;
  hero_mobile_webm: string | null;
  hero_mobile_poster: string | null;
  instagram_handle: string | null;
  instagram_url: string | null;
  shop_display_name: string | null;
  shop_public_address: string | null;
  shop_visit_note: string | null;
  shop_latitude: number | null;
  shop_longitude: number | null;
  shop_hours: BarberAvailabilityPayload | null;
};

export type PatchShopOnboardingInput = {
  shop_display_name?: string | null;
  onboarding_step?: number;
  shop_pays_cash_only?: boolean;
  shop_deposits_enabled?: boolean;
  shop_tap_to_pay_later?: boolean;
  complete?: boolean;
  /** Flat rows; same shape as replace barber availability `windows`. */
  shop_default_hours?: BarberAvailabilityWindowInput[] | null;
  shop_public_address?: string | null;
  shop_visit_note?: string | null;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
};

export type ServiceStarterPackResponse = {
  created: Array<{ name: string; slug: string }>;
  skipped_slugs: string[];
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  role: AuthUserRole;
  shop_admin?: ShopAdminState;
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

export type BarberSmartSlotPreferredWindow = {
  hour_start: number;
  hour_end: number;
  weight: number;
  label: string;
};

export type BarberSmartSlotAffinity = {
  score: number;
  label: string;
  visits_pair: number;
  visits_with_barber: number;
};

export type BarberSmartSlotRepeatBooking = {
  predicted_next_date: string;
  sample_size: number;
};

export type BarberSmartSlotCancellationMatch = {
  recent_cancellations_on_day: number;
  hint: string | null;
};

/** Smart booking hints for `/book` (optional Bearer for personalization). */
export type BarberSmartSlotHintsPayload = {
  date: string;
  service_id: number;
  barber_user_id: number;
  personalized: boolean;
  preferred_time_windows: BarberSmartSlotPreferredWindow[];
  affinity: BarberSmartSlotAffinity | null;
  repeat_booking: BarberSmartSlotRepeatBooking | null;
  cancellation_match: BarberSmartSlotCancellationMatch;
};

export type AppointmentStatus = "confirmed" | "cancelled";

export const APPOINTMENT_ARRIVAL_STATES = [
  "expected",
  "arrived",
  "waiting",
  "in_chair",
] as const;
export type AppointmentArrivalState = (typeof APPOINTMENT_ARRIVAL_STATES)[number];

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
  arrival_state: AppointmentArrivalState;
  /** Set when a geofenced proximity ping notified staff (ISO 8601). */
  arrival_nearby_barber_notified_at?: string | null;
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
    shop_latitude?: number | null;
    shop_longitude?: number | null;
  };
  customer?: {
    id: number;
    name: string;
    email: string;
  };
};

export type AppointmentThreadSenderRole =
  | "customer"
  | "barber"
  | "admin"
  | "staff";

export type AppointmentThreadMessageSender = {
  id: number;
  name: string;
  role: AppointmentThreadSenderRole;
};

export type AppointmentThreadMessageKind = "note" | "operational" | "preset";

export type AppointmentThreadMessage = {
  id: number;
  appointment_id: number;
  kind: AppointmentThreadMessageKind;
  operational_key: string | null;
  /** Present when `kind` is `"preset"` (server echoes the chosen quick reply key). */
  preset_key?: string | null;
  body: string;
  sender: AppointmentThreadMessageSender | null;
  created_at: string | null;
};

export type AppointmentThreadClosedReason = "cancelled" | "ended";

export type AppointmentThreadMeta = {
  viewer_last_read_message_id: number | null;
  unread_from_others: number;
  can_send: boolean;
  thread_closed_reason: AppointmentThreadClosedReason | null;
  operational_keys: string[];
  preset_keys: string[];
  /** True when the booking is in the on-site arrival window (calm arrival chips are boosted). */
  in_arrival_messaging_window: boolean;
};

export type AppointmentThreadPayload = {
  messages: AppointmentThreadMessage[];
  meta: AppointmentThreadMeta;
};

/** Optional AI/rules phrasing help for the visit thread (suggestions only; never auto-sent). */
export type VisitThreadAssistPayload = {
  source: "model" | "rules";
  generated_at: string;
  privacy: {
    staff_only: string;
    third_party: string | null;
  };
  delay_prompt: string | null;
  suggested_notes: string[];
  optional_status_line: string | null;
};

export type AppointmentAdjustmentSuggestion = {
  starts_at: string;
  label: string;
  offset_minutes: number;
};

export type AppointmentAdjustmentSuggestionsPayload = {
  current_starts_at: string | null;
  suggestions: AppointmentAdjustmentSuggestion[];
};

export type AppointmentAdjustmentRequesterRole =
  | "customer"
  | "barber"
  | "admin"
  | "staff";

export type AppointmentAdjustmentRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn";

export type AppointmentAdjustmentRequestRecord = {
  id: number;
  appointment_id: number;
  status: AppointmentAdjustmentRequestStatus;
  requested_starts_at: string | null;
  current_starts_at: string | null;
  requested_by: {
    id: number;
    name: string;
    role: AppointmentAdjustmentRequesterRole;
  } | null;
  created_at: string | null;
  can_respond: boolean;
  can_withdraw: boolean;
};

export type AppointmentAdjustmentRequestPayload = {
  request: AppointmentAdjustmentRequestRecord | null;
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

/**
 * In-person tap / POS roadmap (see `STRIPE_TAP_TO_PAY_STATUS` on the API).
 * Public payment config only; does not enable Terminal by itself.
 */
export type TapToPayStatus = "off" | "foundation" | "live";

export type PaymentConfig = {
  enabled: boolean;
  publishable_key: string | null;
  currency: string;
  tap_to_pay_status: TapToPayStatus;
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

export type StaffCustomerLookupRow = {
  id: number;
  name: string;
  email: string;
};

export type CreateAppointmentInput = {
  service_id: number;
  barber_user_id: number;
  /** ISO 8601 (e.g. `2026-05-11T09:00:00`). */
  starts_at: string;
  notes?: string | null;
  /** Required when an admin or barber books on behalf of someone else. */
  customer_user_id?: number;
};

export type CreateWalkInAppointmentInput = {
  barber_user_id: number;
  service_id: number;
  starts_at: string;
  walk_in_name?: string | null;
  notes?: string | null;
};

export type RescheduleAppointmentInput = {
  /** ISO 8601 (e.g. `2026-05-11T09:00:00`). */
  starts_at: string;
};

export type UpdateAppointmentArrivalInput = {
  arrival_state: AppointmentArrivalState;
};

/** Response from `POST /appointments/:id/arrival-proximity` (coarse ping, no position stored). */
export type AppointmentArrivalProximityResponse = {
  within_geofence: boolean;
  distance_m: number | null;
  approximate_eta_minutes: number | null;
  customer_notified: boolean;
  barber_notified: boolean;
};

/** `GET /appointments/:id/queue-intelligence` — calm same-day queue snapshot. */
export type QueuePaceTone = "calm" | "behind";

export type AppointmentQueueIntelligenceResponse = {
  queue_date: string;
  estimated_chair_minutes_ahead: number | null;
  guests_ahead_in_arrival: number;
  lounge_guests_other: number;
  chair_in_use: boolean;
  visits_behind_schedule: number;
  headline: string;
  /** True when this visit is first in the arrival queue for the chair. */
  is_next_in_line: boolean;
  pace_tone: QueuePaceTone;
  /** ISO 8601 — when this snapshot was generated. */
  updated_at: string;
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

export type CustomerFavoriteServiceRow = {
  service_id: number;
  service_name: string;
  count: number;
};

export type CustomerRecognitionTier =
  | "first_visit"
  | "returning"
  | "regular"
  | "vip";

/** Hair profile fields for staff recognition (no photos). */
export type CustomerHairPreferencesSnapshot = {
  hair_type: HairType | null;
  hair_thickness: HairThickness | null;
  hair_length: HairLength | null;
  scalp_condition: ScalpCondition | null;
  preferred_clipper_guard: string | null;
  allergies: string | null;
  styling_notes: string | null;
};

/** Staff-only snapshot for barbers/admins on a booking. */
export type AppointmentCustomerInsightsResponse =
  | { linked_customer: false }
  | {
      linked_customer: true;
      recognition_tier: CustomerRecognitionTier;
      prefers_you: boolean;
      summary: CustomerVisitSummary;
      visits_with_this_barber: number;
      favorite_services: CustomerFavoriteServiceRow[];
      history_preview: AppointmentRecord[];
      booking_preferences_note: string | null;
      hair_preferences: CustomerHairPreferencesSnapshot | null;
    };

/** Staff-only AI/rules narrative for chair prep (same auth as customer insights). */
export type AppointmentCustomerAiSummaryPrivacy = {
  staff_only: string;
  third_party: string | null;
};

export type AppointmentCustomerAiSummarySections = {
  hair_preferences: string | null;
  visit_summary: string | null;
  notes_digest: string | null;
  operational_signals: string | null;
};

export type AppointmentCustomerAiSummaryResponse = {
  linked_customer: boolean;
  source: "model" | "rules";
  privacy: AppointmentCustomerAiSummaryPrivacy;
  sections: AppointmentCustomerAiSummarySections;
  /** ISO 8601 */
  generated_at: string | null;
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

export type OperationalAiInsightConfidence = "low" | "medium" | "high";

export type OperationalAiInsightCard = {
  title: string;
  summary: string;
  actions: string[];
  confidence: OperationalAiInsightConfidence;
  /** Optional numeric breadcrumbs for the UI (counts, rates, indices). */
  metrics?: Record<string, number | string>;
};

export type OperationalAiInsightsPayload = {
  source: "model" | "rules";
  generated_at: string;
  privacy: {
    staff_only: string;
    third_party: string | null;
  };
  staffing: OperationalAiInsightCard;
  busy_periods: OperationalAiInsightCard;
  no_shows: OperationalAiInsightCard;
  retention: OperationalAiInsightCard;
};

export type OperationalInsightsReport = {
  today: OperationsTodayBlock;
  week: OperationsWeekBlock;
  range: { from: string; to: string };
  /** 7×24 = 168 cells, dense. */
  peak_heatmap: OperationsHeatmapCell[];
  booking_lead_time: OperationsLeadTimeBucket[];
  cancellation_lead_time: OperationsLeadTimeBucket[];
  ai_insights: OperationalAiInsightsPayload;
};

export type OperationalInsightsRangeFilters = {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
};

export type ShopChairState =
  | "open"
  | "in_use"
  | "guests_waiting"
  | "catching_up";

export type ShopChairServing = {
  appointment_id: number;
  customer_name: string | null;
  service_name: string | null;
};

export type ShopOperationalChair = {
  barber_user_id: number;
  barber_name: string;
  barber_title: string | null;
  chair: {
    state: ShopChairState;
    in_use: boolean;
    serving: ShopChairServing | null;
  };
  utilization: {
    booked_minutes: number;
    available_minutes: number;
    utilization_pct: number;
  };
  workload: {
    confirmed_today: number;
    remaining_today: number;
    completed_today: number;
    waiting_count: number;
    behind_count: number;
    lounge_guests: number;
  };
  queue: {
    pace_tone: QueuePaceTone;
    visits_behind_schedule: number;
  };
};

export type ShopQueueBalanceHint = {
  tone: "balance" | "pace" | "capacity";
  message: string;
  barber_user_id: number | null;
};

export type ShopOperationalLiveSnapshot = {
  snapshot_date: string;
  updated_at: string;
  shop_summary: {
    chairs_total: number;
    chairs_in_use: number;
    chairs_open: number;
    guests_waiting_total: number;
    behind_visits_total: number;
    confirmed_today: number;
    remaining_today: number;
    avg_utilization_pct: number;
  };
  chairs: ShopOperationalChair[];
  queue_balance: {
    headline: string;
    hints: ShopQueueBalanceHint[];
  };
  analytics: {
    booked_minutes_total: number;
    available_minutes_total: number;
    shop_utilization_pct: number;
  };
};

/** Admin preview of customers matching retention rules (no sends). */
export type RetentionReportRow = {
  appointment_id: number;
  customer_user_id: number;
  customer_name: string;
  customer_email: string;
  last_visit_at: string | null;
  interval_days: number;
  suggested_date: string;
  days_since_last_visit: number;
  inactivity_threshold_days: number;
  retention_paused: boolean;
};

export type RetentionReportSnapshot = {
  due_soon: RetentionReportRow[];
  inactive_eligible: RetentionReportRow[];
};

export const NOTIFICATION_EVENTS = [
  "appointment.confirmed",
  "appointment.cancelled",
  "appointment.rescheduled",
  "appointment.reminder",
  "appointment.running_late",
  "appointment.rebook_suggested",
  "appointment.inactivity_nudge",
  "appointment.arrival_nearby",
  "appointment.visit_message",
  "staff.booking.created",
  "staff.booking.cancelled",
  "staff.booking.rescheduled",
  "staff.arrival_nearby",
  "staff.arrival_checked_in",
  "staff.visit_message",
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
  /** @see appointment.running_late */
  late_by_minutes?: number;
  /** Geofenced arrival (bucketed distance, not exact). */
  approximate_eta_minutes?: number;
  distance_bucket_m?: number;
  headline?: string;
  /** Scheduled reminder shape — day_before | hour_before | manual */
  reminder_kind?: "day_before" | "hour_before" | "manual" | string;
  /** Retention nudge payload — present on rebook + inactivity events. */
  suggested_date?: string;
  interval_days?: number;
  service_id?: number;
  barber_user_id?: number;
  /** Visit-thread push / inbox payload */
  message_id?: number;
  message_kind?: string;
  message_preview?: string;
  sender_name?: string | null;
  /** standard | operational — operational presets one-taps stay visible slightly longer in toasts */
  urgency?: "standard" | "operational" | string;
  /** In-app route (relative), e.g. confirmation with thread focus */
  deep_link?: string | null;
  thread_group_key?: string | null;
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

export type CustomerRetentionPredictedCut = {
  source: "booked" | "predicted";
  /** YYYY-MM-DD */
  date: string | null;
  /** Full ISO when source is booked */
  starts_at?: string | null;
  appointment_id?: number | null;
  typical_interval_days?: number | null;
};

export type CustomerRetentionSignals = {
  days_since_last_visit: number | null;
  typical_interval_days: number | null;
  suggested_date: string | null;
  due_soon: boolean;
  dormant: boolean;
  inactivity_threshold_days: number | null;
};

export type CustomerRetentionNudgeTone =
  | "muted"
  | "standard"
  | "warm"
  | "urgent";

export type CustomerRetentionNudge = {
  variant:
    | "paused"
    | "booked"
    | "dormant"
    | "due_soon"
    | "welcome"
    | "steady"
    | "reengage";
  tone: CustomerRetentionNudgeTone;
  headline: string;
  body: string | null;
  cta_label: string;
  cta_href: string | null;
};

/** Smart retention snapshot for the signed-in customer (repeat-booking focus). */
export type CustomerRetentionSummary = {
  retention_paused: boolean;
  has_upcoming_booking: boolean;
  total_visits: number;
  rebook: RebookSuggestion | null;
  predicted: CustomerRetentionPredictedCut | null;
  signals: CustomerRetentionSignals;
  nudge: CustomerRetentionNudge;
};

export type AuditLogCategory = "security" | "privileged" | "operational";

export type AuditLogSeverity = "info" | "warning" | "critical";

export type AuditLogActorRef = {
  id: number;
  name: string;
  email: string;
};

export type AuditLogEntry = {
  id: number;
  action: string;
  category: AuditLogCategory;
  severity: AuditLogSeverity;
  subject_type: string | null;
  subject_id: number | null;
  ip_address: string | null;
  created_at: string | null;
  metadata: Record<string, unknown>;
  actor: AuditLogActorRef | null;
  target_user: AuditLogActorRef | null;
};

export type AuditLogIndexMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AuditLogIndexResponse = {
  data: AuditLogEntry[];
  meta: AuditLogIndexMeta;
};

export type AdminSecurityReviewHighlight = {
  id: number;
  action: string;
  category: AuditLogCategory;
  severity: AuditLogSeverity;
  created_at: string | null;
  actor: AuditLogActorRef | null;
  target_user: AuditLogActorRef | null;
  metadata: Record<string, unknown>;
};

export type ProductionReadinessStatus = "pass" | "warn" | "fail";

export type ProductionReadinessItem = {
  id: string;
  label: string;
  status: ProductionReadinessStatus;
  detail: string;
};

export type ProductionReadinessSection = {
  id: string;
  title: string;
  status: ProductionReadinessStatus;
  items: ProductionReadinessItem[];
};

export type ProductionSecurityReview = {
  generated_at: string;
  environment: string;
  overall_status: ProductionReadinessStatus;
  sections: ProductionReadinessSection[];
  manual_review: {
    penetration_checklist: string;
    deployment_guide: string;
  };
};

export type AdminSecurityReview = {
  generated_at: string;
  role_counts: { admin: number; barber: number; customer: number };
  window_hours: number;
  privileged_actions_24h: number;
  security_events_24h: number;
  failed_logins_24h: number;
  staff_logins_24h: number;
  role_escalations_7d: AdminSecurityReviewHighlight[];
  categories_7d: Array<{ category: string; count: number }>;
  recent_highlights: AdminSecurityReviewHighlight[];
};
