"use client";

import Link from "next/link";

type PrivacyConsentFieldsProps = {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingOptIn: boolean;
  onAcceptTermsChange: (value: boolean) => void;
  onAcceptPrivacyChange: (value: boolean) => void;
  onMarketingOptInChange: (value: boolean) => void;
  fieldErrors?: Record<string, string>;
};

export function PrivacyConsentFields({
  acceptTerms,
  acceptPrivacy,
  marketingOptIn,
  onAcceptTermsChange,
  onAcceptPrivacyChange,
  onMarketingOptInChange,
  fieldErrors = {},
}: PrivacyConsentFieldsProps) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-border/55 bg-muted/15 p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">
        Privacy &amp; consent
      </legend>

      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-input"
          checked={acceptTerms}
          onChange={(e) => onAcceptTermsChange(e.target.checked)}
          aria-invalid={fieldErrors.accept_terms ? true : undefined}
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          <span className="text-destructive"> *</span>
        </span>
      </label>
      {fieldErrors.accept_terms ? (
        <p className="text-sm text-destructive">{fieldErrors.accept_terms}</p>
      ) : null}

      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-input"
          checked={acceptPrivacy}
          onChange={(e) => onAcceptPrivacyChange(e.target.checked)}
          aria-invalid={fieldErrors.accept_privacy ? true : undefined}
        />
        <span>
          I have read the{" "}
          <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <span className="text-destructive"> *</span>
        </span>
      </label>
      {fieldErrors.accept_privacy ? (
        <p className="text-sm text-destructive">{fieldErrors.accept_privacy}</p>
      ) : null}

      <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-input"
          checked={marketingOptIn}
          onChange={(e) => onMarketingOptInChange(e.target.checked)}
        />
        <span>
          Send me occasional studio updates and offers (optional — you can change
          this anytime in Privacy settings).
        </span>
      </label>
    </fieldset>
  );
}
