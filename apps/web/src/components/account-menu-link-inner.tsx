import type { AccountMenuIconId } from "@/lib/site-primary-nav";
import { cn } from "@ozilcuts/ui";
import {
  Bell,
  History,
  LayoutDashboard,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACCOUNT_MENU_ICONS: Record<AccountMenuIconId, LucideIcon> = {
  user: User,
  "layout-dashboard": LayoutDashboard,
  settings: Settings,
  sparkles: Sparkles,
  history: History,
  bell: Bell,
};

type AccountMenuLinkInnerProps = {
  icon: AccountMenuIconId;
  label: string;
  className?: string;
  iconClassName?: string;
};

export function AccountMenuLinkInner({
  icon,
  label,
  className,
  iconClassName,
}: AccountMenuLinkInnerProps) {
  const Icon = ACCOUNT_MENU_ICONS[icon];

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Icon
        className={cn(
          "size-4 shrink-0 text-muted-foreground opacity-90",
          iconClassName,
        )}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}
