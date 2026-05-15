import { AppShellRouteTransition } from "@/components/app-shell-route-transition";
import type { ReactNode } from "react";

export default function BookShellTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShellRouteTransition>{children}</AppShellRouteTransition>;
}
