import { OZILCUTS_APP_NAME } from "@ozilcuts/types";

export type HaircutShareInput = {
  barberName: string;
  serviceName?: string | null;
  visitDateIso?: string | null;
  barberUserId?: number | null;
  appointmentId: number;
  photoUrl?: string | null;
};

export type HaircutSharePayload = {
  title: string;
  text: string;
  url: string;
  photoUrl?: string;
};

function formatVisitLabel(iso: string | null | undefined): string {
  if (!iso) return "Booked at Ozilcuts";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Booked at Ozilcuts";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildHaircutSharePayload(
  input: HaircutShareInput,
  origin: string,
): HaircutSharePayload {
  const visitLabel = formatVisitLabel(input.visitDateIso);
  const service = input.serviceName?.trim();
  const barber = input.barberName.trim() || "my barber";

  const pageUrl = input.barberUserId
    ? `${origin}/barbers/${input.barberUserId}/portfolio`
    : `${origin}/appointments/${input.appointmentId}/confirmation`;

  const text = service
    ? `Fresh cut at ${OZILCUTS_APP_NAME} with ${barber} — ${service}. ${visitLabel}.`
    : `Fresh cut at ${OZILCUTS_APP_NAME} with ${barber}. ${visitLabel}.`;

  return {
    title: `${OZILCUTS_APP_NAME} · ${barber}`,
    text,
    url: pageUrl,
    photoUrl: input.photoUrl ?? undefined,
  };
}

export async function shareHaircut(payload: HaircutSharePayload): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return "shared";
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return "failed";
      }
    }
  }

  const block = `${payload.text}\n${payload.url}`;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(block);
      return "copied";
    } catch {
      return "failed";
    }
  }

  return "failed";
}
