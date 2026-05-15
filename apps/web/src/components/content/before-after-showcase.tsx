"use client";

import { BeforeAfterBlock } from "@ozilcuts/ui";
import Image from "next/image";

type BeforeAfterShowcaseProps = {
  beforeUrl: string;
  afterUrl: string;
  beforeCaption?: string | null;
  afterCaption?: string | null;
  mergedCaption?: string | null;
  onOpenBefore: () => void;
  onOpenAfter: () => void;
};

const zoomButtonClass =
  "absolute inset-0 block h-full w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function BeforeAfterShowcase({
  beforeUrl,
  afterUrl,
  beforeCaption,
  afterCaption,
  mergedCaption,
  onOpenBefore,
  onOpenAfter,
}: BeforeAfterShowcaseProps) {
  return (
    <BeforeAfterBlock
      className="content-before-after-frame shadow-elev-1"
      caption={mergedCaption}
      before={
        <button
          type="button"
          className={zoomButtonClass}
          onClick={onOpenBefore}
          aria-label={
            beforeCaption
              ? `Open before photo: ${beforeCaption}`
              : "Open before photo full size"
          }
        >
          <Image
            src={beforeUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 45vw, 88vw"
            className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:scale-[1.02]"
            aria-hidden
          />
        </button>
      }
      after={
        <button
          type="button"
          className={zoomButtonClass}
          onClick={onOpenAfter}
          aria-label={
            afterCaption
              ? `Open after photo: ${afterCaption}`
              : "Open after photo full size"
          }
        >
          <Image
            src={afterUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 45vw, 88vw"
            className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:scale-[1.02]"
            aria-hidden
          />
        </button>
      }
    />
  );
}
