import { destinations } from "@/shared/data/destinations";
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "User is not signed in" }, { status: 401 });
  }

  const savedUserDestinations = await prisma.savedDestination.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ savedUserDestinations }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
}

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

  if (!body || typeof body !== "object" || !("destinationId" in body) || typeof body.destinationId !== "string") {
    return NextResponse.json({ error: "Invalid data shape" }, { status: 400 });
  }

  const destinationId = body.destinationId;

  const destinationExists = destinations.some((destination) => destination.id === destinationId);

  if (!destinationExists) {
    return NextResponse.json({ error: "Destination doesn't exist" }, { status: 404 });
  }

  await prisma.savedDestination.upsert({
    where: {
      userId_destinationId: {
        userId: session.user.id,
        destinationId,
      },
    },
    create: {
      userId: session.user.id,
      destinationId,
    },
    update: {},
  });

  return NextResponse.json({ destinationId }, { status: 201 });
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

  if (!body || typeof body !== "object" || !("destinationId" in body) || typeof body.destinationId !== "string") {
    return NextResponse.json({ error: "Invalid data shape" }, { status: 400 });
  }

  const destinationId = body.destinationId;

  await prisma.savedDestination.deleteMany({
    where: { userId: session.user.id, destinationId },
  });

  return NextResponse.json({ destinationId }, { status: 200 });
}
