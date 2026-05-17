/** Static editorial copy for the marketing-facing shell (no CMS). */

export const publicStudioLocationCopy = {
  title: "The studio",
  body: "Appointment-only seating. Address, arrival notes, and door or parking details are included in your confirmation and reminders—no public listing until you are on the calendar.",
} as const;

import type { WeeklyHoursRow } from "@/lib/weekly-hours-display";

export const publicShopHoursRows: WeeklyHoursRow[] = [
  {
    dayLabel: "Tuesday – Saturday",
    hoursLabel: "9:00 AM – 7:00 PM",
    isClosed: false,
  },
  {
    dayLabel: "Sunday – Monday",
    hoursLabel: "By appointment",
    isClosed: false,
  },
];

export const publicReviewQuotes = [
  {
    quote:
      "The booking flow actually respects your time—quiet, fast, and no phone tag.",
    cite: "Regular guest",
  },
  {
    quote:
      "Clean cuts and a space that feels intentional. Exactly what I wanted from a modern shop.",
    cite: "First-time booking",
  },
] as const;
