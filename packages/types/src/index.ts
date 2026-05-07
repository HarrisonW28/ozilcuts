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
