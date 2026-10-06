"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, ListTodo, Settings, type LucideIcon } from "lucide-react";

type Tab = { href: string; label: string; icon: LucideIcon };

const tabs: Tab[] = [
  { href: "/", label: "Overview", icon: Inbox },
  { href: "/todo", label: "To Do", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: Settings },
];

// True if this tab should show as selected for the current page. Overview
// ("/") only matches exactly; the others also match their sub-pages, so
// Settings stays selected on a bank's screen (/settings/banks/3).
function isSelected(tabHref: string, pathname: string): boolean {
  if (tabHref === "/") return pathname === "/";
  return pathname === tabHref || pathname.startsWith(`${tabHref}/`);
}

// The iPhone-style tab bar fixed to the bottom of every signed-in screen:
// an icon over a small label per tab, the current one tinted. Its
// background is see-through and blurs whatever scrolls behind it, like
// Apple's own tab bars, and it pads itself above the home indicator.
// A Client Component because only those can read the current URL
// (usePathname) to know which tab is selected.
export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t-[0.5px] border-separator bg-bar pb-home-indicator backdrop-blur-xl">
      <nav aria-label="Tabs" className="mx-auto flex h-(--tab-bar-height) w-full max-w-app">
        {tabs.map(({ href, label, icon: Icon }) => {
          const selected = isSelected(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 pt-1.5 no-underline active:opacity-60 ${
                selected ? "text-accent" : "text-text-secondary"
              }`}
            >
              <Icon size={24} strokeWidth={1.75} aria-hidden />
              <span className="text-[10px] leading-3 font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
