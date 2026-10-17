"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function ShortlistDialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="shortlist-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-primary/20 bg-background p-6 text-text shadow-xl backdrop:bg-black/55"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 id="shortlist-dialog-title" className="text-2xl font-semibold">
          {title}
        </h2>
        <button type="button" aria-label="Close" disabled={busy} onClick={onClose} className="min-h-11 min-w-11 rounded-xl border border-primary/30">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

export const shortlistButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-text hover:bg-secondary/20 disabled:cursor-default disabled:opacity-60";
export const shortlistInput = "mt-2 min-h-11 w-full rounded-xl border border-primary/40 bg-background px-3 py-2 text-text";

export function validateName(name: string): string | null {
  return name.trim().length < 1 || name.trim().length > 80 ? "Enter a shortlist name between 1 and 80 characters." : null;
}
