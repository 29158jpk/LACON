'use client';

import { useState, useEffect } from 'react';
import { getCategoryPlaceholder } from '../../lib/imageHelper';

export default function ProductImage({
  src,
  alt = 'Product',
  category = '',
  className = '',
  style = {},
}) {
  const [imgSrc, setImgSrc] = useState(src || '');
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setImgSrc(src || '');
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const placeholder = getCategoryPlaceholder(category, alt);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(placeholder);
    }
  };

  return (
    <img
      src={hasError || !imgSrc ? placeholder : imgSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'img-loaded' : 'img-loading'}`}
      style={{
        ...style,
        transition: 'opacity 0.2s ease',
      }}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      loading="lazy"
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      onError={handleError}
    />
  );
}
