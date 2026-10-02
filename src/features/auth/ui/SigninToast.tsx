"use client";

import { useSession } from "@/shared/lib/auth/auth-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function SignInToast() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    if (searchParams.get("signedIn") !== "true") return;
    if (!session?.user) return;

    toast.success(`Signed in as ${session.user.name ?? session.user.email}`);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("signedIn");

    const query = params.toString();

    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [isPending, session, searchParams, pathname, router]);

  return null;
}
