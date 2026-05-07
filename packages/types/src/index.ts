export const OZILCUTS_APP_NAME = "Ozilcuts" as const;

export type ServiceSummary = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
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
};
