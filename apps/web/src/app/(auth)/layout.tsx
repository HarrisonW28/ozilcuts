import { AuthPageChrome } from "@/components/auth-page-chrome";
import { Suspense, type ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom,0px)+1.25rem)] pt-[max(2.5rem,env(safe-area-inset-top,0px))] sm:px-6">
      <div className="mx-auto w-full max-w-sm">
        <Suspense fallback={<div className="w-full">{children}</div>}>
          <AuthPageChrome>{children}</AuthPageChrome>
        </Suspense>
      </div>
    </div>
  );
}
