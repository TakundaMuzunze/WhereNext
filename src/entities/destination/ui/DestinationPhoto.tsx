"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, MapPin } from "lucide-react";
import type { DestinationImage } from "../model/destinationImage";
import type { Destination } from "../model/types";

type DestinationPhotoProps = {
  name: string;
  image?: DestinationImage | Destination["image"];
  variant?: "card" | "hero";
};

export function DestinationPhoto({ name, image, variant = "card" }: DestinationPhotoProps) {
  // Reset loading and failure state when the selected image changes.
  return <Photo key={image?.src ?? "unavailable"} name={name} image={image} variant={variant} />;
}

function Photo({ name, image, variant }: DestinationPhotoProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const canShowImage = image && !hasFailed;
  const isLoading = Boolean(canShowImage && !hasLoaded);
  let imageClassName = "object-cover opacity-0 motion-safe:transition-opacity motion-safe:duration-300";

  if (hasLoaded) {
    imageClassName = "object-cover opacity-100 motion-safe:transition-opacity motion-safe:duration-300";
  }

  const credit = image && "sourceUrl" in image ? image : null;
  let photoClassName = "relative aspect-[3/2] overflow-hidden bg-secondary";
  let imageSizes = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw";

  if (variant === "hero") {
    photoClassName = "relative aspect-[3/2] overflow-hidden bg-secondary sm:aspect-[16/7]";
    imageSizes = "(max-width: 1023px) 100vw, 1024px";
  }

  let alt = `View of ${name}`;

  if (image && "alt" in image) {
    alt = image.alt;
  }

  return (
    <figure className="relative" aria-busy={isLoading}>
      <div className={photoClassName}>
        {isLoading && (
          <div
            role="status"
            aria-label={`Loading photo of ${name}`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-primary/15 via-secondary to-primary/5 text-muted motion-safe:animate-pulse"
          >
            <ImageIcon aria-hidden="true" className="size-8 text-primary/60" />
            <span className="text-sm">Loading photo…</span>
          </div>
        )}
        {canShowImage ? (
          <Image
            src={image.src}
            alt={alt}
            fill
            sizes={imageSizes}
            className={imageClassName}
            onLoad={() => setHasLoaded(true)}
            onError={() => setHasFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-primary/15 via-secondary to-primary/5 px-5 text-center">
            <div className="flex items-center gap-2 text-primary/60" aria-hidden="true">
              <MapPin className="size-8" />
              <span className="h-px w-10 bg-primary/30" />
              <ImageIcon className="size-6" />
            </div>
            <p className="max-w-full font-serif text-xl wrap-break-word text-text/80">{name}</p>
            <p className="text-xs text-muted">Photo unavailable</p>
          </div>
        )}
      </div>
      {variant === "hero" && canShowImage && hasLoaded && credit && (
        <figcaption className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto bg-background/90 px-4 py-2 text-xs leading-5 wrap-break-word text-muted">
          Photo: {credit.author} ·{" "}
          <a href={credit.sourceUrl} target="_blank" rel="noreferrer" className="cursor-pointer text-primary underline">
            Wikimedia Commons
          </a>
          {" · "}
          <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="cursor-pointer text-primary underline">
            {credit.license}
          </a>
          {" · Cropped to fit"}
          {credit.attribution && (
            <details className="mt-1">
              <summary className="cursor-pointer">Additional photo credit</summary>
              <p className="mt-1">{credit.attribution}</p>
            </details>
          )}
        </figcaption>
      )}
    </figure>
  );
}
