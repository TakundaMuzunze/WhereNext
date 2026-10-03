"use client";

import type { ReactNode } from "react";
import { clearPendingSave } from "@/shared/lib/auth/signInJourney";
import { getSafeReturnTo } from "@/shared/lib/auth/returnTo";

export function CancelSignInLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // Native navigation preserves anchors when returning to a cached route (Next 16.3).
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      href="/"
      className={className}
      onClick={(event) => {
        clearPendingSave();
        const href = getSafeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
        event.currentTarget.href = href;
      }}
    >
      {children}
    </a>
  );
}
