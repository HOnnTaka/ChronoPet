import React, { useRef, useState } from "react";
import { Image as ImageIcon, Upload, Sparkles, Target, Brain, Coffee, Clock, List, Layout, Send } from "lucide-react";
import InputWithClear from "./InputWithClear";
import { APP_CONFIG } from "../../config";

const TagEditModal = ({ editingTag, setEditingTag, onSave, settings }) => {
  const tagIconFileRef = useRef(null);
  const [tab, setTab] = useState(editingTag?.isIdle ? "appearance" : "basic"); // basic | appearance

  if (!editingTag) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        background: "transparent",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setEditingTag(null);
      }}
    >
      {/* Dimmer Background Sibling */}
      <div
        className="modal-overlay-mask"
        style={{
          background: settings?.win12Experimental ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.4)",
          animation: "maskFadeIn 0.4s ease-out",
        }}
      />
      <div
        className={`win11-card ${settings?.win12Experimental ? "liquid-modal" : ""}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          animation: "modalScaleIn 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
          overflow: "hidden",
          maxHeight: "85vh",
          ...(settings?.win12Experimental ? {} : {
            backdropFilter: "blur(50px) saturate(180%)",
            WebkitBackdropFilter: "blur(50px) saturate(180%)",
            backgroundColor: "var(--bg-active)",
            backgroundImage: "linear-gradient(to bottom right, transparent, color-mix(in srgb, var(--accent), transparent 90%))",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.25), 0 0 0 1px inset rgba(255, 255, 255, 0.1)",
          }),
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "6px 20px",
            borderBottom: settings?.win12Experimental ? "none" : "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            className="title"
            style={{ fontSize: "0.9rem", margin: 0, color: editingTag.isIdle ? "var(--accent)" : "inherit" }}
          >
            {editingTag.isIdle ?
              "设置空闲状态形象"
              : editingTag.index !== undefined ?
                "编辑标签"
                : "添加新标签"}
          </h3>
          <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 6, padding: 2 }}>
            <button
              onClick={() => setTab("basic")}
              disabled={editingTag.isIdle}
              style={{
                padding: "2px 10px",
                borderRadius: 4,
                border: "none",
                background: tab === "basic" ? "var(--card-bg)" : "transparent",
                boxShadow: tab === "basic" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                fontSize: "0.75rem",
                cursor: editingTag.isIdle ? "not-allowed" : "pointer",
                color: tab === "basic" ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "all 0.2s",
                opacity: editingTag.isIdle ? 0.5 : 1,
              }}
            >
              基础
            </button>
            <button
              onClick={() => setTab("appearance")}
              disabled={!editingTag.isIdle && !editingTag.name?.trim()}
              style={{
                padding: "2px 10px",
                borderRadius: 4,
                border: "none",
                background: tab === "appearance" ? "var(--card-bg)" : "transparent",
                boxShadow: tab === "appearance" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                fontSize: "0.75rem",
                cursor: !editingTag.isIdle && !editingTag.name?.trim() ? "not-allowed" : "pointer",
                color: tab === "appearance" ? "var(--text-primary)" : "var(--text-secondary)",
                opacity: !editingTag.isIdle && !editingTag.name?.trim() ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              外观
            </button>
          </div>
        </div>

        {/* Content Scrollable */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {tab === "basic" && (
            <div className="animate-fade-in">
              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}
                >
                  标签名称
                </label>
                <InputWithClear
                  value={editingTag.name}
                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>

              {/* Color */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}
                >
                  标记颜色
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {APP_CONFIG.THEME_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setEditingTag({ ...editingTag, color: c })}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: c,
                        cursor: "pointer",
                        border: editingTag.color === c ? "2px solid var(--card-bg)" : "2px solid transparent",
                        boxShadow: editingTag.color === c ? `0 0 0 2px ${c}` : "none",
                        transform: editingTag.color === c ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.2s",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label
                  style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}
                >
                  图标
                </label>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  {/* Toggle Type - Styled Buttons */}
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      fontSize: "0.8rem",
                      background: "rgba(128,128,128,0.1)",
                      padding: 3,
                      borderRadius: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setEditingTag({ ...editingTag, iconType: "preset" })}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        background: editingTag.iconType !== "image" ? "var(--card-bg)" : "transparent",
                        color: editingTag.iconType !== "image" ? "var(--text-primary)" : "var(--text-secondary)",
                        boxShadow: editingTag.iconType !== "image" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        fontWeight: editingTag.iconType !== "image" ? 500 : 400,
                        transition: "all 0.2s",
                      }}
                    >
                      预设
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // FIX: Check if current iconValue is a valid URL/DataURI before keeping it
                        const isValidImage =
                          editingTag.iconValue &&
                          (editingTag.iconValue.startsWith("data:") ||
                            editingTag.iconValue.startsWith("http") ||
                            editingTag.iconValue.includes("/"));
                        setEditingTag({
                          ...editingTag,
                          iconType: "image",
                          iconValue: isValidImage ? editingTag.iconValue : "",
                        });
                      }}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        background: editingTag.iconType === "image" ? "var(--card-bg)" : "transparent",
                        color: editingTag.iconType === "image" ? "var(--text-primary)" : "var(--text-secondary)",
                        boxShadow: editingTag.iconType === "image" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        fontWeight: editingTag.iconType === "image" ? 500 : 400,
                        transition: "all 0.2s",
                      }}
                    >
                      图片
                    </button>
                  </div>
                </div>

                {/* Icon Content Container with Fixed Height and Transition */}
                <div
                  style={{
                    height: 150,
                    overflow: "hidden",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                  }}
                >
                  {editingTag.iconType !== "image" ?
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 1fr)",
                        gap: 8,
                        height: "100%",
                        alignContent: "start",
                        animation: "fadeIn 0.3s ease-out",
                      }}
                    >
                      {APP_CONFIG.DEFAULT_ICONS.map((iconName) => {
                        let C = Target;
                        if (iconName === "Brain") C = Brain;
                        if (iconName === "Coffee") C = Coffee;
                        if (iconName === "Clock") C = Clock;
                        if (iconName === "Sparkles") C = Sparkles;
                        if (iconName === "List") C = List;
                        if (iconName === "Layout") C = Layout;
                        if (iconName === "Send") C = Send;
                        const isSelected = editingTag.iconValue === iconName;
                        return (
                          <div
                            key={iconName}
                            onClick={() => setEditingTag({ ...editingTag, iconValue: iconName })}
                            style={{
                              aspectRatio: "1",
                              borderRadius: 8,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: isSelected ? `${editingTag.color}20` : "rgba(128,128,128,0.05)",
                              color: isSelected ? editingTag.color : "var(--text-secondary)",
                              border: isSelected ? `1px solid ${editingTag.color}` : "1px solid transparent",
                              transition: "all 0.2s",
                            }}
                          >
                            <C size={18} />
                          </div>
                        );
                      })}
                    </div>
                    : <div
                      onClick={() => tagIconFileRef.current?.click()}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "2px dashed var(--border-color)",
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        background: "var(--bg-secondary)",
                        gap: 8,
                        color: "var(--text-secondary)",
                        transition: "all 0.2s",
                        position: "relative",
                        overflow: "hidden",
                        animation: "fadeIn 0.3s ease-out",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)";
                        e.currentTarget.style.background = "var(--card-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-color)";
                        e.currentTarget.style.background = "var(--bg-secondary)";
                      }}
                    >
                      {editingTag.iconValue ?
                        <div style={{ width: "100%", height: "100%", position: "relative" }}>
                          <img
                            src={editingTag.iconValue}
                            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: "rgba(0,0,0,0.6)",
                              color: "white",
                              fontSize: "0.75rem",
                              padding: "4px",
                              textAlign: "center",
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            点击更换
                          </div>
                        </div>
                        : <>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "var(--card-bg)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                            }}
                          >
                            <Upload size={18} color="var(--accent)" />
                          </div>
                          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>上传自定义图标</span>
                          <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>支持 PNG, JPG</span>
                        </>
                      }
                    </div>
                  }
                </div>
                <input
                  type="file"
                  ref={tagIconFileRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = (ev) =>
                        setEditingTag({ ...editingTag, iconValue: ev.target.result, iconType: "image" });
                      r.readAsDataURL(f);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {tab === "appearance" && (
            <div className="animate-fade-in">
              <div
                style={{
                  background: "linear-gradient(to bottom right, var(--bg-secondary), transparent)",
                  borderRadius: 12,
                  padding: 16,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      border: "2px solid var(--border-color)",
                      background: "#fff",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      position: "relative",
                    }}
                  >
                    {(() => {
                      // Use the same logic as TagList to determine the current pet icon
                      let currentPetIcon = null;
                      const preset = settings?.petPreset || "apple";
                      const appearance = settings?.appearance || {};
                      const overrides = appearance[preset] || {};

                      if (editingTag.petIcon) {
                        currentPetIcon = editingTag.petIcon;
                      } else if (settings) {
                        // Preset-specific override
                        if (editingTag.isIdle && overrides["Idle"]) currentPetIcon = overrides["Idle"];
                        else if (overrides[editingTag.name]) currentPetIcon = overrides[editingTag.name];
                        // Legacy global overrides
                        else if (editingTag.name === "工作" && settings.petIconWork)
                          currentPetIcon = settings.petIconWork;
                        else if (editingTag.name === "学习" && settings.petIconStudy)
                          currentPetIcon = settings.petIconStudy;
                        else if (editingTag.name === "休息" && settings.petIconRest)
                          currentPetIcon = settings.petIconRest;
                        else if (editingTag.name === "摸鱼" && settings.petIconMoyu)
                          currentPetIcon = settings.petIconMoyu;
                        else if (editingTag.isIdle && settings.petIconPath) currentPetIcon = settings.petIconPath;
                      }

                      // Suffix based on preset
                      const suffix = preset === "manbo" ? "_mb" : "";

                      // Fallback for default tags if not overridden
                      if (!currentPetIcon) {
                        if (editingTag.name === "工作") currentPetIcon = `icon_work${suffix}.png`;
                        else if (editingTag.name === "学习") currentPetIcon = `icon_study${suffix}.png`;
                        else if (editingTag.name === "休息") currentPetIcon = `icon_rest${suffix}.png`;
                        else if (editingTag.name === "摸鱼") currentPetIcon = `icon_moyu${suffix}.png`;
                        else currentPetIcon = `icon_base${suffix}.png`;
                      }

                      return (
                        <img
                          src={currentPetIcon}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            const fallback = `icon_base${suffix}.png`;
                            if (e.target.src.indexOf(fallback) === -1) {
                              e.target.src = fallback;
                            }
                          }}
                        />
                      );
                    })()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>桌宠形象 (可选)</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      标签激活时显示此形象
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <label
                    className="btn primary"
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Upload size={16} />
                    选择图片
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = (ev) => setEditingTag({ ...editingTag, petIcon: ev.target.result });
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                  <button
                    className="btn"
                    onClick={() => {
                      if (editingTag.isIdle) {
                        setEditingTag({ ...editingTag, petIcon: "icon_base.png" });
                      } else {
                        setEditingTag({ ...editingTag, petIcon: null });
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      fontSize: "0.85rem",
                      background: "rgba(0,0,0,0.05)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    恢复默认
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            background: "transparent",
          }}
        >
          <button className="btn" onClick={() => setEditingTag(null)} style={{ background: "var(--bg-secondary)" }}>
            取消
          </button>

          <button
            className="btn primary"
            disabled={tab === "basic" && !editingTag.name?.trim()}
            onClick={
              tab === "basic" ?
                () => setTab("appearance") // Next button now just switches tab
                : onSave
            }
            style={{
              background: "var(--accent)",
              borderColor: "transparent",
              padding: "6px 24px",
              opacity: tab === "basic" && !editingTag.name?.trim() ? 0.5 : 1,
              cursor: tab === "basic" && !editingTag.name?.trim() ? "not-allowed" : "pointer",
            }}
          >
            {tab === "basic" ? "下一步" : "保存"}
          </button>
        </div>

        <style>{`
           @keyframes modalScaleIn {
             from { opacity: 0; transform: scale(0.96) translateY(10px); }
             to { opacity: 1; transform: scale(1) translateY(0); }
           }
           .animate-fade-in {
             animation: fadeIn 0.3s ease;
           }
           @keyframes fadeIn {
             from { opacity: 0; transform: translateX(5px); }
             to { opacity: 1; transform: translateX(0); }
           }
        `}</style>
      </div>
    </div>
  );
};

export default TagEditModal;
