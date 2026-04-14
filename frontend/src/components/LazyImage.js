import React, { useState, useRef, useEffect } from "react";

function LazyImage({
  src,
  alt,
  className,
  style,
  placeholder,
  sizes = "100vw",
  quality = 80,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Generate optimized image URLs
  const getOptimizedSrc = (originalSrc) => {
    // If it's an Unsplash image, add optimization parameters
    if (originalSrc.includes('unsplash.com')) {
      return `${originalSrc}&auto=format&fit=crop&q=${quality}`;
    }
    return originalSrc;
  };

  const optimizedSrc = getOptimizedSrc(src);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div
      ref={imgRef}
      className={`lazy-image-wrapper ${className || ""}`}
      style={{
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      {...props}
    >
      {(isInView || hasError) && (
        <picture>
          {/* WebP version for supported browsers */}
          {optimizedSrc.includes('unsplash.com') && (
            <source
              srcSet={`${optimizedSrc}&fm=webp`}
              type="image/webp"
              sizes={sizes}
            />
          )}
          <img
            src={hasError ? placeholder || optimizedSrc : optimizedSrc}
            alt={alt}
            loading="lazy"
            sizes={sizes}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: isLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
          />
        </picture>
      )}

      {!isLoaded && (
        <div
          className="lazy-image-placeholder"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: placeholder ? `url(${placeholder})` : "#f0f0f0",
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!placeholder && (
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid #e0e0e0",
                borderTop: "3px solid #1877f2",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LazyImage;