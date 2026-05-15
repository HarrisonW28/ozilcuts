/**
 * Labels for appointment-scoped operational chips (not generic chat).
 * Keys mirror `AppointmentMessageService` server maps.
 */

export const VISIT_THREAD_SHOP_OPERATIONAL_LABELS: Record<string, string> = {
  ready_relaxed: "Ready — no rush",
  chair_ready: "Chair ready",
  outside_now: "Outside now",
  parking_help: "Parking help",
  running_5: "~5 min late",
  running_10: "~10 min late",
  running_15: "~15 min late",
  almost_ready: "Almost ready",
  thanks_patience: "Thanks for patience",
};

export const VISIT_THREAD_GUEST_OPERATIONAL_LABELS: Record<string, string> = {
  arriving_now: "Arriving now",
  parking_nearby: "Parked nearby",
  at_the_door: "At the door",
  eta_about_3: "~3 min out",
  eta_about_7: "~7 min out",
  eta_about_10: "~10 min out",
  outside_now: "Outside now",
  parking_question: "Parking question",
  on_my_way: "On my way",
  slightly_late: "Running late",
  chair_heading: "To the chair",
};

export const VISIT_THREAD_SHOP_PRESET_LABELS: Record<string, string> = {
  preset_got_it: "Got it, thanks",
  preset_see_you: "See you then",
  preset_here_if_needed: "Here if needed",
};

export const VISIT_THREAD_GUEST_PRESET_LABELS: Record<string, string> = {
  preset_thanks: "Thanks — see you",
  preset_appreciate: "Appreciate heads-up",
  preset_ok: "Understood",
};
