import React from "react";
import { X } from "lucide-react";

/**
 * Win11Dialog Component
 * A custom modal that mimics Windows 11 system dialog style.
 */
const Win11Dialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  onClose,
  isDark = true,
  confirmLabel = "确定",
  cancelLabel = "取消",
  showCancel = false,
  settings = {},
  type = "primary",
}) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        pointerEvents: "auto",
      }}
      onClick={onClose}
    >
      {/* Dimmer Background Mask */}
      <div
        className="modal-overlay-mask"
        style={{
          background: settings.win12Experimental ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.4)",
          animation: "maskFadeIn 0.3s ease-out",
        }}
      />
      <style>{`
        @keyframes dialogIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .win11-dialog {
          animation: dialogIn 0.3s cubic-bezier(0.1, 0.9, 0.2, 1);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          border: 1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
        }
      `}</style>
      <div
        className={`win11-dialog ${settings.win12Experimental ? "liquid-dialog" : ""}`}
        style={{
          width: "400px",
          maxWidth: "90%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          ...(settings.win12Experimental ? {} : {
            background: isDark ? "#2d2d2d" : "#ffffff",
            borderRadius: "12px",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          }),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div
          style={{
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
            {title || "chronopet"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDark ? "white" : "black",
              opacity: 0.6,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e81123";
              e.currentTarget.style.opacity = 1;
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.opacity = 0.6;
              e.currentTarget.style.color = isDark ? "white" : "black";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "16px" }}>
          <div
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: isDark ? "#e0e0e0" : "#333",
            }}
          >
            {message}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "9px",
            background: isDark ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          {showCancel && (
            <button
              className="btn"
              onClick={() => {
                if (onCancel) onCancel();
                onClose();
              }}
              style={{
                padding: "3px 16px",
                fontSize: "0.8rem",
                fontWeight: 500,
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            className={`btn ${type === "danger" ? "danger" : "primary"}`}
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            style={{
              padding: "3px 16px",
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Win11Dialog;
