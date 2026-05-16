"use client";

import { CustomerNotesTagsSection } from "@/components/customer-notes-tags-section";
import { CustomerRelationshipPanel } from "@/components/customer-relationship/customer-relationship-panel";

type CustomerRelationshipCrmSectionProps = {
  customerUserId: number;
  customerName?: string;
  currentUserId: number;
  isAdmin: boolean;
};

export function CustomerRelationshipCrmSection({
  customerUserId,
  customerName,
  currentUserId,
  isAdmin,
}: CustomerRelationshipCrmSectionProps) {
  return (
    <div id="memory-staff-notes" className="scroll-mt-28">
      <CustomerRelationshipPanel
        customerUserId={customerUserId}
        customerName={customerName}
      />
      <CustomerNotesTagsSection
        customerUserId={customerUserId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
