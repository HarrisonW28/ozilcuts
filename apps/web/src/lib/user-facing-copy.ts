/**
 * Guest- and staff-facing strings — warm, concrete, no API/env jargon.
 */

export const AUTH_COPY = {
  signInRequiredTitle: "Sign in to continue",
  signInRequiredDescription:
    "Create a free account or sign in to see your visits and manage bookings.",
  signInRequiredShort: "Please sign in to continue.",
  sessionIssueTitle: "Session expired",
  sessionIssueMessage: "Sign in again to pick up where you left off.",
  sessionIssueInline:
    "We couldn't verify your session. Sign in again to continue.",
  invalidAppointmentLink:
    "This link doesn't look right. Open the visit from your appointments list or confirmation email.",
} as const;

export const HEALTH_COPY = {
  checking: "Just a moment — making sure booking is available.",
  offline:
    "We're having trouble reaching the studio right now. Try again in a moment.",
  retryLabel: "Try again",
} as const;

export const LOADING_LABELS = {
  home: "Loading your home",
  appointments: "Loading your visits",
  book: "Loading booking",
  notifications: "Loading your notifications",
  barber: "Loading your workspace",
  admin: "Loading dashboard",
  services: "Loading services",
  barbers: "Loading the team",
} as const;

export const PAGE_DESCRIPTIONS = {
  notifications:
    "Reminders, booking updates, and visit messages — grouped by day.",
  services: "Time, price, and what to expect — then book in one flow.",
  barbers:
    "Bios, portfolios, and open times — choose your barber and book.",
  barberCalendar:
    "Your day on the chair — switch dates, see the timeline, add walk-ins below.",
  barberOperations:
    "Who's next, quick guest messages, and chair tools for today.",
  adminDashboard:
    "Today's bookings, your team, catalog, and reports in one place.",
  adminSettings:
    "Logo, homepage look, and Instagram — what guests see before they book.",
  checkIn:
    "Tap when you arrive, scan at the desk, or share parking or ETA in your visit thread.",
  reschedule:
    "Pick a new open time — you can keep your current slot if nothing better fits.",
  adminServices: "Services, prices, and what's visible when guests book online.",
  adminBarbers: "Chairs on the floor — profiles, hours, and who guests can book.",
  adminRetention:
    "Guests who may be due soon or haven't visited in a while — a snapshot for your team.",
  adminReportsBarbers:
    "How each chair performed this period — bookings and revenue side by side.",
  profileIdentity:
    "Your visit story — loyalty, streaks, and photos from the chair.",
  profileVisits: "Every cut you've had with us — dates, barbers, and services.",
} as const;

/** Signed-in marketing home — nudge toward the right workspace. */
export function homeSignedInGreeting(roleSlug: string): string {
  switch (roleSlug) {
    case "admin":
      return "Your shop dashboard has today's bookings, team, and reports ready.";
    case "barber":
      return "Your chair view has today's queue, walk-ins, and quick guest messages.";
    default:
      return "Your home screen has your next visit, loyalty, and shortcuts to book again.";
  }
}

export function appointmentsPageDescription(roleSlug: string): string {
  switch (roleSlug) {
    case "admin":
      return "All shop bookings — filter by date and status, open any visit for details.";
    case "barber":
      return "Guests on your chair — times, check-in, and quick actions for each visit.";
    default:
      return "Upcoming cuts and past visits — reschedule, check in, or book your next chair.";
  }
}

export function bookPageDescription(isStaffBooker: boolean): string {
  return isStaffBooker
    ? "Find the guest, then service, barber, and time — it saves to their account."
    : "Choose service and barber, then a time that fits — confirmed in a few taps.";
}

export function appointmentsPageTitle(roleSlug: string): string {
  switch (roleSlug) {
    case "admin":
      return "Shop bookings";
    case "barber":
      return "My chair bookings";
    default:
      return "My appointments";
  }
}
