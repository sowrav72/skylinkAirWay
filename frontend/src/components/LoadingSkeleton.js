import React from "react";

function LoadingSkeleton({ className, style, variant = "default" }) {
  const getSkeletonStyle = () => {
    switch (variant) {
      case "card":
        return {
          height: "200px",
          borderRadius: "12px",
          ...style,
        };
      case "text":
        return {
          height: "1rem",
          borderRadius: "4px",
          ...style,
        };
      case "title":
        return {
          height: "1.5rem",
          borderRadius: "6px",
          ...style,
        };
      case "circle":
        return {
          height: "40px",
          width: "40px",
          borderRadius: "50%",
          ...style,
        };
      default:
        return style;
    }
  };

  return (
    <div
      className={`loading-skeleton ${className || ""}`}
      style={{
        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "loading-shimmer 1.5s infinite",
        ...getSkeletonStyle(),
      }}
    >
      <style jsx>{`
        @keyframes loading-shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}

export default LoadingSkeleton;