import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download, RotateCcw } from "lucide-react";

export default function ImageGallery({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  // Transformation states
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(
    (e) => {
      e?.stopPropagation();
      setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      resetTransform();
    },
    [images.length, resetTransform],
  );

  const handleNext = useCallback(
    (e) => {
      e?.stopPropagation();
      setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      resetTransform();
    },
    [images.length, resetTransform],
  );

  // Zoom with Wheel
  const handleWheel = (e) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.5), 10);
    setScale(newScale);
  };

  // Dragging logic
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    setOffset({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Context Menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.electronAPI) {
      window.electronAPI.send("show-image-context-menu", images[index]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onClose, handlePrev, handleNext]); // Re-bind if index/onClose changes

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = images[index];
    link.download = `screenshot-${new Date().getTime()}.png`;
    link.click();
  };

  return (
    <div
      className="no-drag"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.95)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease-out",
        overflow: "hidden",
        userSelect: "none",
        WebkitAppRegion: "no-drag",
      }}
      onClick={onClose}
      onWheel={handleWheel}
    >
      {/* Header */}
      <div
        className="no-drag"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "54px 30px 24px 30px", // Increased top padding to avoid title bar overlap
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10001,
          WebkitAppRegion: "no-drag",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 75%, transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", fontWeight: 500 }}>
          {index + 1} / {images.length} • {Math.round(scale * 100)}%
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetTransform();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title="重置缩放"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={handleDownload}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title="下载"
          >
            <Download size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
              transition: "all 0.2s",
              marginLeft: 12,
            }}
            title="关闭 (Esc)"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Navigation Arrows (Outside viewport to avoid drag interference) */}
      {images.length > 1 && (
        <>
          <div
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 100,
              zIndex: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: 0,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
          >
            <div
              style={{ background: "rgba(0,0,0,0.3)", borderRadius: "50%", padding: 12, backdropFilter: "blur(4px)" }}
            >
              <ChevronLeft size={48} color="white" />
            </div>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 100,
              zIndex: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: 0,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
          >
            <div
              style={{ background: "rgba(0,0,0,0.3)", borderRadius: "50%", padding: 12, backdropFilter: "blur(4px)" }}
            >
              <ChevronRight size={48} color="white" />
            </div>
          </div>
        </>
      )}

      {/* Main viewport */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          cursor:
            isDragging ? "grabbing"
            : scale > 1 ? "grab"
            : "default",
          zIndex: 1, // Stay below controls
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
        <img
          ref={imgRef}
          src={images[index]}
          alt=""
          onDoubleClick={resetTransform}
          style={{
            maxWidth: "92%",
            maxHeight: "88%",
            objectFit: "contain",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.1, 0.7, 0.1, 1)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.8)",
            pointerEvents: "auto",
            borderRadius: "4px",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Thumbnails Strip */}
      {images.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            gap: 10,
            padding: "10px 16px",
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            maxWidth: "85%",
            overflowX: "auto",
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <div
              key={i}
              onClick={() => {
                setIndex(i);
                resetTransform();
              }}
              style={{
                flexShrink: 0,
                width: 70,
                height: 46,
                borderRadius: "8px",
                overflow: "hidden",
                cursor: "pointer",
                border: `3px solid ${index === i ? "var(--accent)" : "transparent"}`,
                opacity: index === i ? 1 : 0.4,
                transition: "all 0.2s",
                boxShadow: index === i ? "0 0 15px var(--accent)" : "none",
              }}
            >
              <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
