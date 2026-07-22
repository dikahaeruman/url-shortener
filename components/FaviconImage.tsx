'use client';

import { useState } from 'react';

interface FaviconImageProps {
  src: string;
  className?: string;
  alt?: string;
}

export default function FaviconImage({ src, className = 'w-4 h-4 rounded shrink-0 bg-neutral-800', alt = '' }: FaviconImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
