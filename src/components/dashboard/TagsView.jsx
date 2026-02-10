import React from "react";
import { Plus, X, Check } from "lucide-react";
import TagList from "./TagList";

export default function TagsView({ settings, defaultTags, onEdit, onDelete, onSaveSettings, showCustomAlert }) {
  const currentPreset = settings.petPreset || "apple";

  const handlePresetChange = (preset) => {
    onSaveSettings({ petPreset: preset });
  };
  const [isAddingPreset, setIsAddingPreset] = React.useState(false);
  const [hoveredPreset, setHoveredPreset] = React.useState(null);

  const getPresetPreviewIcon = (presetName) => {
    const appearance = settings.appearance || {};
    const overrides = appearance[presetName] || {};
    if (overrides["Idle"]) return overrides["Idle"];
    if (presetName === "manbo") return "icon_base_mb.png";
    return "icon_base.png";
  };

  const saveNewPreset = (name) => {
    if (["apple", "manbo", ...(settings.customPresets || []).map((p) => p.name)].includes(name)) {
      if (showCustomAlert) {
        showCustomAlert("预设已存在", "该预设名称已被使用，请换一个名称。");
      } else {
        alert("预设名称已存在");
      }
      return;
    }
    const currentPresets = settings.customPresets || [];
    const appearance = settings.appearance || {};
    const baseOverrides = appearance["apple"] || {};
    const newAppearance = {
      ...appearance,
      [name]: { ...baseOverrides },
    };
    onSaveSettings({
      customPresets: [...currentPresets, { id: Date.now(), name: name }],
      appearance: newAppearance,
      petPreset: name,
    });
    setIsAddingPreset(false);
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
              onMouseEnter={(e) => {
                if (currentPreset !== "apple") e.currentTarget.style.background = "rgba(128, 128, 128, 0.1)";
              }}
              onMouseLeave={(e) => {
                if (currentPreset !== "apple") e.currentTarget.style.background = "transparent";
              }}
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
              onMouseEnter={(e) => {
                if (currentPreset !== "manbo") e.currentTarget.style.background = "rgba(128, 128, 128, 0.1)";
              }}
              onMouseLeave={(e) => {
                if (currentPreset !== "manbo") e.currentTarget.style.background = "transparent";
              }}
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
                onMouseEnter={() => setHoveredPreset(p.name)}
                onMouseLeave={() => setHoveredPreset(null)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  background:
                    currentPreset === p.name ? "var(--accent)"
                    : hoveredPreset === p.name ? "rgba(128, 128, 128, 0.1)"
                    : "transparent",
                  color: currentPreset === p.name ? "#fff" : "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  position: "relative",
                  paddingRight: hoveredPreset === p.name ? 28 : 12, // Make room for X
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

                {hoveredPreset === p.name && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showCustomAlert) {
                        showCustomAlert("删除预设", `确定要删除预设 "${p.name}" 吗？此操作不可撤销。`, {
                          showCancel: true,
                          onConfirm: () => {
                            const newPresets = (settings.customPresets || []).filter((item) => item.name !== p.name);
                            const newAppearance = { ...settings.appearance };
                            delete newAppearance[p.name];

                            const updateData = {
                              customPresets: newPresets,
                              appearance: newAppearance,
                            };

                            if (currentPreset === p.name) {
                              updateData.petPreset = "apple";
                            }

                            onSaveSettings(updateData);
                          },
                        });
                      } else if (window.confirm(`确定要删除预设 "${p.name}" 吗？`)) {
                        const newPresets = (settings.customPresets || []).filter((item) => item.name !== p.name);
                        const newAppearance = { ...settings.appearance };
                        delete newAppearance[p.name];

                        const updateData = {
                          customPresets: newPresets,
                          appearance: newAppearance,
                        };

                        if (currentPreset === p.name) {
                          updateData.petPreset = "apple";
                        }

                        onSaveSettings(updateData);
                      }
                    }}
                    style={{
                      position: "absolute",
                      right: 4,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 4,
                      color: currentPreset === p.name ? "rgba(255,255,255,0.8)" : "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        currentPreset === p.name ? "rgba(255,0,0,0.3)" : "rgba(255,0,0,0.1)";
                      e.currentTarget.style.color = currentPreset === p.name ? "#fff" : "red";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color =
                        currentPreset === p.name ? "rgba(255,255,255,0.8)" : "var(--text-secondary)";
                    }}
                  >
                    <X size={12} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border-color)", margin: "0 2px" }} />

          {/* Add Preset Button */}
          {/* Add Preset Button / Input */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {!isAddingPreset ?
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingPreset(true);
                  setTimeout(() => document.getElementById("new-preset-input")?.focus(), 100);
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
            : <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  id="new-preset-input"
                  type="text"
                  placeholder="预设名称"
                  autoFocus
                  style={{
                    margin: 0,
                    width: 100,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--accent)",
                    fontSize: "0.8rem",
                    outline: "none",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = e.target.value.trim();
                      if (val) {
                        saveNewPreset(val);
                      }
                    } else if (e.key === "Escape") {
                      setIsAddingPreset(false);
                    }
                  }}
                  // onBlur removed so button click doesn't close first
                />
                <button
                  className="btn-icon"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    const input = document.getElementById("new-preset-input");
                    if (input && input.value.trim()) {
                      saveNewPreset(input.value.trim());
                    }
                  }}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={14} />
                </button>
                <button
                  className="btn-icon"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsAddingPreset(false);
                  }}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            }
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
