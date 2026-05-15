import type { AppointmentAdjustmentRequestRecord } from "@ozilcuts/types";
import { Button } from "@ozilcuts/ui";

import { formatAdjustmentWhen } from "./format-adjustment";

type Props = {
  pending: AppointmentAdjustmentRequestRecord;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onWithdraw: () => void;
};

export function AdjustmentPendingCard(props: Props) {
  const { pending, acting, onApprove, onReject, onWithdraw } = props;

  const requester = pending.requested_by?.name ?? "Someone";
  const proposed = formatAdjustmentWhen(pending.requested_starts_at);

  return (
    <section
      aria-label="Pending quick move request"
      className="rounded-xl border border-primary/40 bg-primary/[0.07] p-4 shadow-sm dark:bg-primary/[0.12]"
    >
      <p className="text-sm font-semibold tracking-tight text-foreground">
        Move waiting for a response
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">{requester}</span>{" "}
        suggested moving to{" "}
        <span className="font-medium text-foreground">{proposed}</span>. One
        tap approves — no full reschedule.
      </p>

      <AdjustmentPendingActions
        acting={acting}
        canRespond={pending.can_respond}
        canWithdraw={pending.can_withdraw}
        onApprove={onApprove}
        onReject={onReject}
        onWithdraw={onWithdraw}
      />
    </section>
  );
}

function AdjustmentPendingActions(props: {
  canRespond: boolean;
  canWithdraw: boolean;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onWithdraw: () => void;
}) {
  const { canRespond, canWithdraw, acting, onApprove, onReject, onWithdraw } =
    props;

  if (!canRespond && !canWithdraw) {
    return (
      <p className="mt-3 text-xs text-muted-foreground" role="status">
        Waiting for the other person to approve or decline.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {canRespond ? (
        <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row">
          <Button
            type="button"
            size="default"
            pending={acting}
            className="min-h-12 w-full touch-manipulation font-semibold sm:min-h-11 sm:flex-1"
            onClick={onApprove}
          >
            Approve new time
          </Button>
          <Button
            type="button"
            size="default"
            variant="outline"
            disabled={acting}
            className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:flex-1"
            onClick={onReject}
          >
            Decline
          </Button>
        </div>
      ) : null}
      {canWithdraw ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={acting}
          className="min-h-11 touch-manipulation sm:min-h-9 sm:shrink-0"
          onClick={onWithdraw}
        >
          Withdraw my request
        </Button>
      ) : null}
    </div>
  );
}
