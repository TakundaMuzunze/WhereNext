import "server-only";

import { prisma } from "@/shared/lib/db/prisma";
import { destinationImageSchema, type DestinationImage } from "@/entities/destination/model/destinationImage";

export async function readDestinationImages(destinationIds: string[]): Promise<Map<string, DestinationImage>> {
  const images = new Map<string, DestinationImage>();

  if (destinationIds.length === 0) {
    return images;
  }

  try {
    const storedImages = await prisma.destinationImage.findMany({
      where: { destinationId: { in: [...new Set(destinationIds)] } },
    });

    for (const storedImage of storedImages) {
      const validation = destinationImageSchema.safeParse(storedImage.image);

      if (validation.success) {
        images.set(storedImage.destinationId, validation.data);
      }
    }
  } catch {
    // Images are optional. A missing migration/storage failure must not hide destinations or saved data.
  }

  return images;
}
