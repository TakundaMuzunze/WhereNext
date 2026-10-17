// app/api/shortlists/route.ts
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ shortlistid: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "User is not signed in" }, { status: 401 });
  }

  const { shortlistid: shortlistId } = await params;

  const shortlist = await prisma.shortlist.findFirst({
    where: {
      id: shortlistId,
      userId: session.user.id,
    },
    include: {
      shortlistItems: true,
    },
  });

  if (!shortlist) {
    return NextResponse.json({ error: "Shortlist not found" }, { status: 404 });
  }

  return NextResponse.json({ shortlist }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
}
