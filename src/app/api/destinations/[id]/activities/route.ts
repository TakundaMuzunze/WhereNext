import { NextResponse } from "next/server";
import { z } from "zod";
import { getDestinationActivities } from "@/features/destination-activities/server/getDestinationActivities";

const activityNameSchema = z.string().trim().min(1).max(80);
const requestSchema = z.strictObject({
  activities: z.array(activityNameSchema).min(1).max(10),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: encodedDestinationId } = await params;
  let destinationId: string;
  let requestBody: unknown;

  try {
    destinationId = decodeURIComponent(encodedDestinationId);
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid destination or JSON" }, { status: 400 });
  }

  const validation = requestSchema.safeParse(requestBody);
  const destinationIdIsTooLong = destinationId.length > 128;

  if (!validation.success || destinationIdIsTooLong) {
    return NextResponse.json({ error: "Choose 1–10 activities and a valid destination" }, { status: 400 });
  }

  try {
    const result = await getDestinationActivities(destinationId, validation.data.activities);

    if (!result) {
      return NextResponse.json({ error: "Destination not found" }, { status: 404 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Activity evidence is unavailable. Please try again." }, { status: 503 });
  }
}
