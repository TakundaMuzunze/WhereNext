"use client";

import { useSession } from "@/shared/lib/auth/auth-client";
import { ChevronDown, Heart, UserRound } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { SignOutButton } from "./SignOutButton";
import { UserAvatar } from "./UserAvatar";

export function SigninBtn() {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  if (isPending) {
    return <div className="h-10 w-10 rounded-full bg-primary/20" />;
  }

  if (!session?.user) {
    return (
      <Link href="/sign-in" className="px-4 py-2 text-sm font-normal text-text transition hover:text-accent">
        Sign in
      </Link>
    );
  }

  const { user } = session;
  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        ref={triggerRef}
        aria-label={`Open account menu for ${user.name ?? user.email}`}
        className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-1.5 text-text transition hover:bg-secondary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <UserAvatar image={user.image} name={user.name} email={user.email} size="small" />

        <ChevronDown aria-hidden="true" className={`h-4 w-4 text-text/60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute top-full right-0 z-50 mt-3 w-64 rounded-2xl border border-primary/20 bg-background p-2 shadow-2xl shadow-primary/10"
        >
          <div className="flex items-center gap-3 px-2 py-2.5">
            <UserAvatar image={user.image} name={user.name} email={user.email} size="large" />

            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{user.name ?? "WhereNext user"}</p>
              <p className="truncate text-sm text-text/60">{user.email}</p>
            </div>
          </div>

          <div className="mt-1 grid gap-1 text-sm">
            <Link
              href="/saved"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 text-text transition hover:bg-secondary/20 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Heart className="h-4 w-4 text-text/70" aria-hidden="true" />
              Saved destinations
            </Link>

            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 text-text transition hover:bg-secondary/20 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <UserRound className="h-4 w-4 text-text/70" aria-hidden="true" />
              Account settings
            </Link>
          </div>

          <div className="my-1 border-t border-primary/15" />

          <SignOutButton />
        </div>
      )}
    </div>
  );
}
