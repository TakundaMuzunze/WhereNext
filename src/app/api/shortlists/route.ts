import { getImportedDestinationSummaries } from "@/features/destination-catalogue/server/getImportedDestinationSummaries";
import { resolveDestination } from "@/features/destination-catalogue/server/resolveDestination";
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  if (!body || typeof body !== "object" || !("name" in body) || typeof body.name !== "string") {
    return NextResponse.json({ error: "Name must be a string" }, { status: 400 });
  }

  const name = body.name.trim();

  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: "Shortlist name must be between 1 to 80 characters in length" }, { status: 400 });
  }

  let destinationId: string | undefined;

  if ("destinationId" in body) {
    if (typeof body.destinationId !== "string") {
      return NextResponse.json({ error: "destinationId must be a string" }, { status: 400 });
    }

    const destination = await resolveDestination(body.destinationId);

    if (!destination) {
      return NextResponse.json({ error: "Destination doesn't exist" }, { status: 404 });
    }

    destinationId = destination.destination.id;
  }

  try {
    const shortlist = await prisma.shortlist.create({
      data: {
        userId: session.user.id,
        shortlistName: name,
        ...(destinationId !== undefined ? { shortlistItems: { create: { destinationId } } } : {}),
      },
    });

    return NextResponse.json({ shortlist }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A shortlist with that name already exists" }, { status: 409 });
    }

    throw error;
  }
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised user" }, { status: 401 });
  }

  const userShortlists = await prisma.shortlist.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { shortlistItems: true } }, shortlistItems: { select: { destinationId: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const summaries = await getImportedDestinationSummaries(userShortlists.flatMap((list) => list.shortlistItems.map((item) => item.destinationId)));
  const listsWithDestinations = userShortlists.map((list) => ({
    ...list,
    shortlistItems: list.shortlistItems.map((item) => ({
      ...item,
      ...(summaries.has(item.destinationId) ? { destination: summaries.get(item.destinationId) } : {}),
    })),
  }));

  return NextResponse.json({ userShortlists: listsWithDestinations }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
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

  if (!body || typeof body !== "object" || !("shortlistId" in body) || typeof body.shortlistId !== "string" || body.shortlistId.trim().length === 0) {
    return NextResponse.json({ error: "shortlistId must be a non-empty string" }, { status: 400 });
  }

  const shortlistId = body.shortlistId;

  const result = await prisma.shortlist.deleteMany({
    where: { userId: session.user.id, id: shortlistId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Shortlist not found" }, { status: 404 });
  }

  return NextResponse.json({ shortlistId }, { status: 200 });
}

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
    !("name" in body) ||
    typeof body.name !== "string" ||
    !("shortlistId" in body) ||
    typeof body.shortlistId !== "string"
  ) {
    return NextResponse.json({ error: "Name and shortlistId must be strings" }, { status: 400 });
  }

  const name = body.name.trim();

  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: "Shortlist name must be between 1 to 80 characters in length" }, { status: 400 });
  }

  const shortlistId = body.shortlistId;

  if (shortlistId.trim().length === 0) {
    return NextResponse.json({ error: "shortlistId must be a non-empty string" }, { status: 400 });
  }

  try {
    const updatedShortlist = await prisma.shortlist.update({
      where: {
        userId: session.user.id,
        id: shortlistId,
      },
      data: {
        shortlistName: name,
      },
    });

    return NextResponse.json({ updatedShortlist }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A shortlist with that name already exists" }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Shortlist not found" }, { status: 404 });
    }

    throw error;
  }
}
