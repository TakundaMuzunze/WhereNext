import { destinations } from "@/shared/data/destinations";
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

  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    typeof body.name !== "string" ||
    !("destinationId" in body) ||
    typeof body.destinationId !== "string"
  ) {
    return NextResponse.json({ error: "Name and destinationId must be strings" }, { status: 400 });
  }

  const name = body.name.trim();

  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: "Shortlist name must be between 1 to 80 characters in length" }, { status: 400 });
  }

  const destinationId = body.destinationId;

  const destinationExists = destinations.some((destination) => destination.id === destinationId);

  if (!destinationExists) {
    return NextResponse.json({ error: "Destination doesn't exist" }, { status: 404 });
  }

  try {
    const shortlist = await prisma.shortlist.create({
      data: {
        userId: session.user.id,
        shortlistName: name,
        shortlistItems: {
          create: {
            destinationId,
          },
        },
      },
    });

    return NextResponse.json({ shortlist }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A conflicting shortlist record already exists" }, { status: 409 });
    }

    throw error;
  }
}
