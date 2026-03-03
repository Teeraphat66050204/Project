"use client";

import { useEffect, useState } from "react";

type FallbackImageProps = {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
};

export function FallbackImage({ src, fallbackSrc, alt, className = "" }: FallbackImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
    />
  );
}

