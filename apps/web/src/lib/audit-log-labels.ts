/** Human-readable labels for audit action slugs. */
const ACTION_LABELS: Record<string, string> = {
  "auth.login.success": "Staff sign-in",
  "auth.login.failed": "Failed sign-in",
  "auth.logout": "Staff sign-out",
  "barber.created": "Barber account created",
  "barber.profile.updated": "Barber profile updated",
  "barber.availability.replaced": "Barber hours replaced",
  "service.created": "Service created",
  "service.updated": "Service updated",
  "service.deleted": "Service deleted",
  "shop.onboarding.updated": "Shop onboarding updated",
  "customer.vip.updated": "VIP status changed",
  "customer.tag.created": "Customer tag added",
  "customer.tag.deleted": "Customer tag removed",
  "customer.note.created": "CRM note created",
  "customer.note.updated": "CRM note updated",
  "customer.note.deleted": "CRM note deleted",
  "customer.account.deleted": "Customer account deleted",
  "appointment.cancelled_by_staff": "Appointment cancelled (staff)",
  "appointment.booked_by_staff": "Appointment booked (staff)",
};

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll(".", " · ");
}

export function formatAuditCategory(category: string): string {
  switch (category) {
    case "security":
      return "Security";
    case "privileged":
      return "Privileged";
    case "operational":
      return "Operational";
    default:
      return category;
  }
}
