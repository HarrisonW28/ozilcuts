export const OZILCUTS_APP_NAME = "Ozilcuts" as const;

export type ServiceSummary = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
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
  sort_order?: number;
  is_active?: boolean;
};

export type UpdateServiceInput = {
  name?: string;
  slug?: string | null;
  description?: string | null;
  duration_minutes?: number;
  price_cents?: number;
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
