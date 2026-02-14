import React, { useState } from "react";
import { Edit2, Trash2, Sparkles, Loader2, Image as ImageIcon, Tag } from "lucide-react";
import InlineConfirm from "./InlineConfirm";

/**
 * RecordCard Component
 * Balanced layout: Spacious but efficient. Uses right side for actions/media.
 */
const RecordCard = React.memo(
  ({ record, onDelete, onEdit, onAiSummary, loadingAi, onViewImages, settings }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
      <div
        className="win11-card record-card"
        style={{
          flex: 1,
          padding: "12px 18px", // Increased padding for breathing room
          background: "var(--card-bg)",
          animation: "fadeIn 0.3s ease-out",
          position: "relative",
          marginBottom: 0,
          border: "1px solid var(--border-color)",
          transition: "all 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)",
          display: "flex",
          gap: 16, // Consistent gap between left and right
          userSelect: "text", // Enable text selection
          cursor: "auto",
        }}
      >
        <style>{`
        .record-card:hover {
          background: color-mix(in srgb, var(--card-bg), var(--accent) 2%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-color: color-mix(in srgb, var(--border-color), var(--accent) 20%);
        }
        .action-btn {
          opacity: 0.6;
          transition: all 0.2s;
          padding: 4px;
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .record-card:hover .action-btn {
          opacity: 1;
        }
        .action-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .action-btn.delete:hover {
          background: rgba(209, 52, 56, 0.1);
          color: #d13438;
        }
        .action-btn.ai {
          color: var(--accent);
          opacity: 0.8;
        }
        .action-btn.ai:hover {
          background: color-mix(in srgb, var(--accent), transparent 90%);
        }
      `}</style>

        {/* LEFT CONTENT: Information */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Title */}
          <div
            style={{
              fontWeight: 600,
              fontSize: "1rem",
              color: "var(--text-primary)",
              lineHeight: 1.3,
            }}
          >
            {record.task}
          </div>

          {/* Description */}
          {record.desc && (
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5, // Better readability
              }}
            >
              {record.desc}
            </div>
          )}

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto", paddingTop: 8 }}>
              {record.tags.map((tagName, idx) => {
                // Try to find the tag's color from settings
                const tagConfig = (settings.tags || []).find((t) => t.name === tagName);
                const baseColor = tagConfig?.color || "var(--accent)";

                return (
                  <span
                    key={idx}
                    style={{
                      fontSize: "0.76rem",
                      padding: "2px 10px",
                      borderRadius: "6px",
                      background: `color-mix(in srgb, ${baseColor}, transparent 92%)`,
                      color: baseColor,
                      border: `1px solid color-mix(in srgb, ${baseColor}, transparent 85%)`,
                      fontWeight: 600,
                      transition: "all 0.2s",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      userSelect: "none",
                    }}
                  >
                    <Tag size={10} style={{ opacity: 0.7 }} />
                    {tagName}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT CONTENT: Interaction & Media */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "space-between", // Spread top/bottom
            gap: 8,
            minWidth: "80px", // Reserve some width
          }}
        >
          {/* Actions Row */}
          <div style={{ display: "flex", gap: 2, position: "relative" }}>
            {showDeleteConfirm && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  zIndex: 10,
                  marginTop: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                  minWidth: "160px",
                }}
              >
                <InlineConfirm
                  onConfirm={() => {
                    onDelete(record);
                    setShowDeleteConfirm(false);
                  }}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
              </div>
            )}

            {record.screenshots && record.screenshots.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAiSummary(record);
                }}
                disabled={loadingAi}
                title="AI 总结"
                className="action-btn ai"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
              >
                {loadingAi ?
                  <Loader2 size={15} className="spin" />
                  : <Sparkles size={15} />}
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(record);
              }}
              className="action-btn"
              title="编辑"
              style={{ border: "none", background: "transparent", cursor: "pointer" }}
            >
              <Edit2 size={15} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="action-btn delete"
              title="删除"
              style={{ border: "none", background: "transparent", cursor: "pointer" }}
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Screenshots (One Large Image) */}
          {record.screenshots && record.screenshots.length > 0 && (
            <div
              className="group"
              style={{
                borderRadius: "8px",
                overflow: "hidden",
                width: "120px",
                height: "75px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                position: "relative",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onViewImages) onViewImages(record.screenshots, 0);
                else if (window.electronAPI) window.electronAPI.send("open-preview", record.screenshots[0]);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
            >
              <img
                src={record.screenshots[0]}
                alt="截图"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {record.screenshots.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    background: "rgba(0,0,0,0.75)",
                    color: "white",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <ImageIcon size={10} />+{record.screenshots.length - 1}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    // Deep comparison of record or specific props if necessary,
    // but standard memo usually sufficient if props are stable.
    // One thing: settings object changes on every save.
    // We can optimize by only comparing the tags stringified or specific relevant settings.
    return (
      prev.record.id === next.record.id &&
      prev.record.timestamp === next.record.timestamp &&
      prev.record.task === next.record.task &&
      prev.record.desc === next.record.desc &&
      prev.loadingAi === next.loadingAi &&
      JSON.stringify(prev.record.tags) === JSON.stringify(next.record.tags) &&
      JSON.stringify(prev.record.screenshots) === JSON.stringify(next.record.screenshots) &&
      JSON.stringify(prev.settings.tags) === JSON.stringify(next.settings.tags)
    );
  },
);

export default RecordCard;
