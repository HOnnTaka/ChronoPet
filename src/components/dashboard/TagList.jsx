import React, { useState } from "react";
import { Target, Brain, Coffee, Clock, Sparkles, Edit2, Trash2, Plus } from "lucide-react";
import InlineConfirm from "./InlineConfirm";

const TagList = React.memo(({ tags, onEdit, onDelete, settings }) => {
  const [confirmingDeleteIndex, setConfirmingDeleteIndex] = useState(null);

  // Helper to get correct icon component
  const getIcon = (tag) => {
    if (tag.iconType === "image") {
      return (
        <img
          src={tag.iconValue}
          style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }}
          alt={tag.name}
        />
      );
    }
    const size = 20;
    const iconName = tag.iconValue || tag.icon; // Support both old and new format
    switch (iconName) {
      case "Brain":
        return <Brain size={size} />;
      case "Coffee":
        return <Coffee size={size} />;
      case "Clock":
        return <Clock size={size} />;
      case "Sparkles":
        return <Sparkles size={size} />;
      default:
        return <Target size={size} />;
    }
  };

  // Helper to get Pet Icon (Appearance)
  const getPetIcon = (tag) => {
    const preset = settings.petPreset || "apple";
    const appearance = settings.appearance || {};
    const overrides = appearance[preset] || {};

    if (overrides[tag.name]) return overrides[tag.name];

    // Check for legacy global overrides
    if (tag.name === "工作" && settings.petIconWork) return settings.petIconWork;
    if (tag.name === "学习" && settings.petIconStudy) return settings.petIconStudy;
    if (tag.name === "休息" && settings.petIconRest) return settings.petIconRest;
    if (tag.name === "摸鱼" && settings.petIconMoyu) return settings.petIconMoyu;

    if (tag.petIcon) return tag.petIcon;

    // Defaults
    const suffix = preset === "manbo" ? "_mb" : "";
    if (tag.name === "工作") return `icon_work${suffix}.png`;
    if (tag.name === "学习") return `icon_study${suffix}.png`;
    if (tag.name === "休息") return `icon_rest${suffix}.png`;
    if (tag.name === "摸鱼") return `icon_moyu${suffix}.png`;

    return `icon_moyu${suffix}.png`;
  };

  // Idle state path helper
  const getIdleIcon = () => {
    const preset = settings.petPreset || "apple";
    const appearance = settings.appearance || {};
    const overrides = appearance[preset] || {};

    if (overrides["Idle"]) return overrides["Idle"];

    const suffix = preset === "manbo" ? "_mb" : "";
    const baseIcon = `icon_base${suffix}.png`;
    const currentIdle = settings.petIconPath;

    if (currentIdle && currentIdle !== "icon_base.png" && currentIdle !== "icon_base_mb.png") {
      return currentIdle;
    }
    return baseIcon;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "0 16px",
          color: "var(--text-secondary)",
          fontSize: "0.8rem",
          fontWeight: 600,
          whiteSpace: "nowrap", // Prevent header wrapping
        }}
      >
        <div style={{ flex: 1, minWidth: "100px" }}>标签信息</div>
        <div style={{ flex: 1, minWidth: "100px" }}>对应桌宠外观</div>
        <div style={{ width: 100, textAlign: "right" }}>操作</div>
      </div>

      {/* Idle State Entry */}
      <div
        className="win11-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "color-mix(in srgb, var(--card-bg), var(--accent) 5%)",
          border: "1px solid color-mix(in srgb, var(--border-color), var(--accent) 30%)",
        }}
      >
        <div style={{ flex: 1, minWidth: "100px", display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(128, 128, 128, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>空闲状态 (默认)</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>当前没有执行任务时显示</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: "100px", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "2px solid var(--border-color)",
              background: "#f0f0f0",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={getIdleIcon()}
              alt="Idle Pet"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>系统外观</div>
        </div>
        <div style={{ width: 100, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => onEdit({ name: "空闲状态", petIcon: getIdleIcon(), isIdle: true }, -1)}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              color: "white",
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            更换形象
          </button>
        </div>
      </div>

      {tags.map((tag, idx) => {
        const petIconPath = getPetIcon(tag);
        const isDefault = ["工作", "学习", "摸鱼", "休息"].includes(tag.name);

        return (
          <div
            key={idx}
            className="win11-card"
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 0,
            }}
          >
            {/* Tag Info */}
            <div
              style={{
                flex: 1,
                minWidth: "100px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: tag.color + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tag.color,
                }}
              >
                {getIcon(tag)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{tag.name}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: tag.color }}></div>
                  {tag.color}
                </div>
              </div>
            </div>

            {/* Pet Appearance Preview */}
            <div
              style={{
                flex: 1,
                minWidth: "100px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: "2px solid var(--border-color)",
                  background: "#f0f0f0",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {petIconPath ?
                  <img
                    src={petIconPath}
                    alt="Pet"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                : <span style={{ fontSize: "0.6rem", color: "#999" }}>默认</span>}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {isDefault ?
                  "系统预设"
                : tag.petIcon ?
                  "自定义"
                : "默认"}
              </div>
            </div>

            {/* Actions */}
            <div style={{ width: 100, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => onEdit(tag, idx)}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 6,
                  padding: 6,
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
                title="编辑"
              >
                <Edit2 size={14} />
              </button>
              {!isDefault && (
                <div style={{ position: "relative" }}>
                  {confirmingDeleteIndex === idx && (
                    <InlineConfirm
                      onConfirm={() => {
                        onDelete(tag, idx);
                        setConfirmingDeleteIndex(null);
                      }}
                      onCancel={() => setConfirmingDeleteIndex(null)}
                      style={{ right: 0, top: -45 }}
                    />
                  )}
                  <button
                    onClick={() => setConfirmingDeleteIndex(idx)}
                    style={{
                      background: "rgba(209, 52, 56, 0.1)",
                      border: "1px solid rgba(209, 52, 56, 0.2)",
                      borderRadius: 6,
                      padding: 6,
                      cursor: "pointer",
                      color: "#d13438",
                    }}
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        className="win11-card"
        onClick={() => onEdit({}, null)} // New tag
        style={{
          padding: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          color: "var(--text-secondary)",
          border: "1px dashed var(--border-color)",
          background: "transparent",
        }}
      >
        <Plus size={16} />
        <span>添加新标签</span>
      </button>
    </div>
  );
});

export default TagList;
