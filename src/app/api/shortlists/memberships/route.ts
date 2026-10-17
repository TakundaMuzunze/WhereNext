import { Prisma } from "@/generated/prisma/client";
import { destinations } from "@/shared/data/destinations";
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { NextResponse } from "next/server";

function isIdArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id: unknown) => typeof id === "string" && id.trim().length > 0);
}

class UnavailableShortlistError extends Error {}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised user" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON syntax" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("destinationId" in body) ||
    typeof body.destinationId !== "string" ||
    !("addTo" in body) ||
    !isIdArray(body.addTo) ||
    !("removeFrom" in body) ||
    !isIdArray(body.removeFrom)
  ) {
    return NextResponse.json(
      { error: "destinationId must be a string; addTo and removeFrom must be arrays of non-empty shortlist IDs" },
      { status: 400 },
    );
  }

  let createName: string | undefined;

  if ("createName" in body) {
    if (typeof body.createName !== "string" || body.createName.trim().length < 1 || body.createName.trim().length > 80) {
      return NextResponse.json({ error: "Shortlist name must contain 1–80 characters" }, { status: 400 });
    }
    createName = body.createName.trim();
  }

  const destinationId = body.destinationId;

  if (!destinations.some((destination) => destination.id === destinationId)) {
    return NextResponse.json({ error: "Destination doesn't exist" }, { status: 404 });
  }

  const addTo = [...new Set(body.addTo)].sort();

  const removeFrom = [...new Set(body.removeFrom)].sort();

  if (addTo.some((id) => removeFrom.includes(id))) {
    return NextResponse.json({ error: "A shortlist cannot be in both addTo and removeFrom" }, { status: 400 });
  }
  const referencedIds = [...addTo, ...removeFrom];

  // Retry the entire transaction, including ownership checks, after a serialization conflict.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const ownedCount = await tx.shortlist.count({ where: { id: { in: referencedIds }, userId: session.user.id } });
          if (ownedCount !== referencedIds.length) throw new UnavailableShortlistError();

          let createdShortlist: { id: string; shortlistName: string } | undefined;
          if (createName !== undefined) {
            createdShortlist = await tx.shortlist.create({
              data: { userId: session.user.id, shortlistName: createName, shortlistItems: { create: { destinationId } } },
              select: { id: true, shortlistName: true },
            });
          }

          if (addTo.length > 0) {
            await tx.shortlistItem.createMany({
              data: addTo.map((shortlistId) => ({ shortlistId, destinationId })),
              skipDuplicates: true,
            });
          }
          if (removeFrom.length > 0) {
            await tx.shortlistItem.deleteMany({ where: { destinationId, shortlistId: { in: removeFrom } } });
          }

          const memberships = await tx.shortlistItem.findMany({
            where: { destinationId, shortlist: { userId: session.user.id } },
            select: { shortlistId: true },
            orderBy: { shortlistId: "asc" },
          });

          return { shortlistIds: memberships.map((membership) => membership.shortlistId), ...(createdShortlist ? { createdShortlist } : {}) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return NextResponse.json({ destinationId, ...result, isSaved: result.shortlistIds.length > 0 });
    } catch (error: unknown) {
      if (error instanceof UnavailableShortlistError || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")) {
        return NextResponse.json({ error: "One or more shortlists are unavailable. Refresh your shortlists and try again." }, { status: 404 });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "A shortlist with that name already exists" }, { status: 409 });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 2) continue;
        return NextResponse.json({ error: "Shortlists changed during this request. Please try again." }, { status: 409 });
      }

      throw error;
    }
  }
  throw new Error("Membership transaction exhausted without a result");
}
