import React from "react";
import { Plus } from "lucide-react";
import TagList from "./TagList";

export default function TagsView({ settings, defaultTags, onEdit, onDelete, onSaveSettings }) {
  const currentPreset = settings.petPreset || "apple";

  const handlePresetChange = (preset) => {
    onSaveSettings({ petPreset: preset });
  };
  const getPresetPreviewIcon = (presetName) => {
    const appearance = settings.appearance || {};
    const overrides = appearance[presetName] || {};
    if (overrides["Idle"]) return overrides["Idle"];
    if (presetName === "manbo") return "icon_base_mb.png";
    return "icon_base.png";
  };

  return (
    <div style={{ width: "100%", margin: "0 auto", padding: 20 }}>
      {/* Preset Selection Hub */}
      <div
        className="win11-card"
        style={{
          marginBottom: 20,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "color-mix(in srgb, var(--card-bg), var(--accent) 3%)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>外观预设:</div>

          <div
            style={{
              display: "flex",
              background: "var(--bg-secondary)",
              padding: 4,
              borderRadius: 10,
              gap: 4,
              flexWrap: "wrap",
            }}
          >
            {/* Preset: Naiguo (Apple) */}
            <div
              onClick={() => handlePresetChange("apple")}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                background: currentPreset === "apple" ? "var(--accent)" : "transparent",
                color: currentPreset === "apple" ? "#fff" : "var(--text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <img
                src={getPresetPreviewIcon("apple")}
                style={{
                  width: 18,
                  height: 18,
                  objectFit: "contain",
                }}
              />
              奶果
            </div>

            {/* Preset: Manbo */}
            <div
              onClick={() => handlePresetChange("manbo")}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                background: currentPreset === "manbo" ? "var(--accent)" : "transparent",
                color: currentPreset === "manbo" ? "#fff" : "var(--text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <img
                src={getPresetPreviewIcon("manbo")}
                style={{
                  width: 18,
                  height: 18,
                  objectFit: "contain",
                }}
              />
              曼波
            </div>

            {/* Custom Presets */}
            {(settings.customPresets || []).map((p) => (
              <div
                key={p.id || p.name}
                onClick={() => handlePresetChange(p.name)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  background: currentPreset === p.name ? "var(--accent)" : "transparent",
                  color: currentPreset === p.name ? "#fff" : "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                <img
                  src={getPresetPreviewIcon(p.name)}
                  style={{
                    width: 18,
                    height: 18,
                    objectFit: "contain",
                  }}
                />
                {p.name}
              </div>
            ))}
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border-color)", margin: "0 2px" }} />

          {/* Add Preset Button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              const name = window.prompt("请输入新预设名称:");
              if (name && name.trim()) {
                const newPresetName = name.trim();
                const presets = settings.customPresets || [];
                const appearance = settings.appearance || {};
                const naiguoOverrides = appearance["apple"] || {};

                const newAppearance = {
                  ...appearance,
                  [newPresetName]: { ...naiguoOverrides },
                };

                onSaveSettings({
                  customPresets: [...presets, { id: Date.now(), name: newPresetName }],
                  petPreset: newPresetName,
                  appearance: newAppearance,
                });
              }
            }}
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              background: "rgba(128, 128, 128, 0.05)",
              border: "1px dashed var(--border-color)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.8rem",
              fontWeight: 500,
              transition: "all 0.2s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(128, 128, 128, 0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(128, 128, 128, 0.05)")}
          >
            <Plus size={12} />
            增加
          </div>
        </div>
      </div>

      <TagList
        tags={settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags}
        settings={settings}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
