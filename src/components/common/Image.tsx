import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export default function Image({ src, alt, className, fallbackSrc, ...props }: ImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleError = () => {
    setError(true);
    setLoaded(true);
  };

  const handleLoad = () => {
    setLoaded(true);
  };

  if (error) {
    return fallbackSrc ? (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        {...props}
      />
    ) : (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <ImageOff className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className={`bg-gray-100 animate-pulse ${className}`} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${!loaded ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        {...props}
      />
    </>
  );
}