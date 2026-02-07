import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Sparkles,
  Save,
  X,
  Tag,
  Plus,
  Check,
  Loader2,
  Image as ImageIcon,
  Upload,
  Clock,
  Pin,
  PinOff,
} from "lucide-react";

// 统一风格弹窗组件
const AlertDialog = ({ message, onClose, accent }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 16,
    }}
  >
    <div
      className="win11-card"
      style={{
        padding: "16px 20px",
        width: 320,
        maxWidth: "90%",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        animation: "alertScaleIn 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
        backdropFilter: "blur(20px)",
        backgroundColor: "color-mix(in srgb, var(--card-bg), transparent 15%)",
        backgroundImage:
          "linear-gradient(to bottom right, transparent, color-mix(in srgb, var(--accent), transparent 90%))",
      }}
    >
      <h3 className="title" style={{ marginBottom: 12, fontSize: "1rem" }}>
        提示
      </h3>
      <p style={{ marginBottom: 20, color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.9rem" }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          className="btn primary"
          onClick={onClose}
          style={{ background: accent, padding: "6px 20px", fontSize: "0.85rem" }}
        >
          确定
        </button>
      </div>
    </div>
    <style>{`
      @keyframes alertScaleIn {
        from { opacity: 0; transform: scale(0.96) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
    `}</style>
  </div>
);

// 带清除按钮的输入框组件
const InputWithClear = ({ value, onChange, placeholder, style, ...props }) => (
  <div style={{ position: "relative", width: "100%", ...style }}>
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: "100%", paddingRight: value ? 30 : 10, margin: 0 }}
      {...props}
    />
    {value && (
      <button
        onClick={() => onChange({ target: { value: "" } })}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 2,
        }}
      >
        <X size={14} />
      </button>
    )}
  </div>
);

import { APP_CONFIG } from "../config";

export default function RecordPage() {
  const [task, setTask] = useState("");
  const [desc, setDesc] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [accent, setAccent] = useState("#0078d4");
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [settings, setSettings] = useState({ aiModel: "moonshotai/Kimi-K2.5", aiApiKey: "", customModel: "" });
  const [duration, setDuration] = useState(30);
  const [isPomodoro, setIsPomodoro] = useState(false);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.send("set-pinned", pinned);
  }, [pinned]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  const [alertMsg, setAlertMsg] = useState(null);
  const [aiStatus, setAiStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'
  const [isFocused, setIsFocused] = useState(true);
  const startTime = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const fetchData = useCallback(async () => {
    if (window.electronAPI) {
      // Colors
      const colors = await window.electronAPI.invoke("get-system-colors");
      if (colors?.accent) {
        const hex = "#" + colors.accent;
        setAccent(hex);
        document.documentElement.style.setProperty("--accent", hex);
      }

      // Settings
      const s = await window.electronAPI.invoke("get-settings");
      if (s) {
        setSettings(s);
      }

      // Records for duration default
      const records = await window.electronAPI.invoke("get-records");
      if (records && records.length > 0) {
        const last = records[records.length - 1];
        // Sync logic: Duration = Now - (Last.Start + Last.Duration)
        // This represents the "gap" or "current unspoken status" duration
        const lastEnd = last.id + (last.duration || 0) * 60000;
        const diff = Math.max(1, Math.round((Date.now() - lastEnd) / 60000));
        setDuration(diff);
      } else {
        setDuration(30);
      }
    }
  }, []);

  useEffect(() => {
    startTime.current = Date.now();
    let mounted = true;

    fetchData();

    const handlePaste = (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (mounted) setScreenshots((prev) => [...prev, evt.target.result]);
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && window.electronAPI) {
        window.electronAPI.send("hide-input");
      }
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);

    const onScreenCaptured = async (result) => {
      const img =
        result && result.success ? result.image
        : typeof result === "string" ? result
        : null;
      if (mounted && img) {
        setScreenshots((prev) => [...prev, img]);

        // Refresh settings to ensure we have the latest API Key
        let currentSettings = settingsRef.current;
        if (window.electronAPI) {
          const s = await window.electronAPI.invoke("get-settings");
          if (s) {
            setSettings(s);
            currentSettings = s;
          }
        }

        // 如果是等待AI分析的截图，立即触发AI请求
        if (window._pendingAiAnalysis) {
          window._pendingAiAnalysis = false;
          setAiLoading(true);
          setAiStatus("loading");

          // Remove header prefix if present (data:image/png;base64,)
          const base64 = img.replace(/^data:image\/\w+;base64,/, "");
          if (window.electronAPI) {
            window.electronAPI.send("request-ai-summary", {
              image: base64,
              model: currentSettings.aiModel,
              apiKey: currentSettings.aiApiKey,
              customModel: currentSettings.customModel,
            });
          }
        }
      }
    };

    let removeCaptureListener = null;
    let removeAiListener = null;
    let removeRecordsUpdateListener = null;
    let removeQuickRecord = null;

    if (window.electronAPI) {
      removeCaptureListener = window.electronAPI.receive("screen-captured", onScreenCaptured);
      removeAiListener = window.electronAPI.receive("ai-summary-response", (result) => {
        setAiLoading(false);
        if (result.success) {
          let lines = result.summary.split("\n").filter((l) => l.trim());

          if (lines.length > 0) {
            const taskName = lines[0].trim();
            setTask((prev) => (prev ? prev + " / " + taskName : taskName));
            if (lines.length > 1) {
              const newDesc = lines.slice(1).join("\n");
              setDesc((prev) => (prev ? prev + "\n\n" + newDesc : newDesc));
            }
            setAiStatus("success");
            setTimeout(() => setAiStatus("idle"), 2000);
          }
        } else {
          setAiStatus("error");
          setTimeout(() => setAiStatus("idle"), 2000);
        }
      });
      removeRecordsUpdateListener = window.electronAPI.receive("records-updated", fetchData);

      removeQuickRecord = window.electronAPI.receive("execute-quick-record", ({ tag, image }) => {
        // Immediate Quick Save
        const record = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          task: tag,
          desc: "快速记录",
          tags: [tag],
          screenshots: image ? [image] : [],
          duration: 30, // Default duration for the NEW record (future planning)
          shouldSyncDuration: true, // Auto-sync previous record duration
        };
        window.electronAPI.send("save-record", record);
        // Optional: Notify or close?
        // Since this might be triggered from hidden window, we don't need UI feedback locally except success.
      });
    }

    return () => {
      mounted = false;
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
      if (removeCaptureListener) removeCaptureListener();
      if (removeAiListener) removeAiListener();
      if (removeRecordsUpdateListener) removeRecordsUpdateListener();
      if (removeQuickRecord) removeQuickRecord();
    };
  }, [fetchData]); // Added fetchData to dependency array

  // 自动调整窗口大小
  // Auto-resize removed
  useEffect(() => {}, []);

  const handleMouseDown = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.closest(".no-drag")) return;
    setIsDragging(true);
    dragStart.current = { x: e.screenX, y: e.screenY };
    if (window.electronAPI) window.electronAPI.send("input-window-moving", { isMoving: true });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging && window.electronAPI) {
        const dx = e.screenX - dragStart.current.x;
        const dy = e.screenY - dragStart.current.y;
        window.electronAPI.send("input-window-moving", { dx, dy });
        dragStart.current = { x: e.screenX, y: e.screenY };
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (window.electronAPI) window.electronAPI.send("input-window-moving", { isMoving: false });
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleScreenshot = () => {
    if (window.electronAPI) {
      window.electronAPI.send("capture-screen");
    }
  };

  const handleAI = () => {
    // 检查是否是内置模型
    const BUILTIN_MODELS = ["moonshotai/Kimi-K2.5", "Qwen/Qwen3-VL-235B-A22B-Instruct"];
    const actualModel =
      settings.aiModel === "custom" ? settings.customModel : settings.aiModel || "moonshotai/Kimi-K2.5";
    const isBuiltinModel = BUILTIN_MODELS.includes(actualModel);

    // 自定义模型需要 API key
    if (!isBuiltinModel && !settings.aiApiKey) {
      setAlertMsg("自定义模型需要配置 API 密钥，请在设置中配置");
      return;
    }

    // 设置加载状态
    setAiLoading(true);
    setAiStatus("loading");

    // 每次都先截图，然后分析（追加模式）
    if (window.electronAPI) {
      window.electronAPI.send("capture-screen");
      window._pendingAiAnalysis = true;
    }
  };

  const handleSave = () => {
    if (!task.trim() && screenshots.length === 0 && selectedTags.length === 0) {
      setAlertMsg("请填写任务内容、选择标签或上传截图");
      return;
    }

    // Fix: Always use Date.now() for start time to ensure "continuous flow".
    // The previous logic `Date.now() - duration` was treating every record as a backfill of the past N minutes.
    // But if we want to "stop previous timer and start new one", the new one must start NOW.
    const startId = Date.now();
    const record = {
      // 若专注模式，Start = Now. 若补录，Start = Now - Duration.
      id: startId,
      timestamp: new Date(startId).toISOString(),
      isFocus: isPomodoro, // Marker for Pet/Dashboard
      task: task.trim() || (selectedTags.length > 0 ? selectedTags.join(" ") : "未命名任务"),
      desc: desc.trim(),
      tags: selectedTags,
      duration: duration || 1,
      screenshots: screenshots,
      shouldSyncDuration: !isPomodoro, // 非专注模式（普通补录）才尝试同步上一条时长
    };

    if (window.electronAPI) {
      window.electronAPI.send("save-record", record);
      // 这里不再需要在前端重置，因为窗口会隐藏/销毁
    }

    setTask("");
    setDesc("");
    setScreenshots([]);
    setSelectedTags([]);
    startTime.current = Date.now();
  };

  const removeScreenshot = (index) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const openPreview = (img) => {
    // 通过IPC打开预览窗口
    if (window.electronAPI) {
      window.electronAPI.send("open-preview", img);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            setScreenshots((prev) => [...prev, evt.target.result]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  return (
    <div ref={containerRef} className={`win-container ${isFocused ? "" : "inactive"}`}>
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          borderBottom: "1px solid var(--border-color)",
          background: isFocused ? "rgba(255,255,255,0.05)" : "transparent",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.85rem",
            color: isFocused ? "var(--text-primary)" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 3,
              height: 16,
              borderRadius: 2,
              background: isFocused ? accent : "transparent",
              marginRight: 4,
            }}
          ></div>
          <span>{APP_CONFIG.APP_NAME} 记录</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            className="no-drag"
            onClick={() => setPinned(!pinned)}
            title={pinned ? "取消固定 (允许隐藏)" : "固定窗口 (保持最前)"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: pinned ? 1 : 0.4,
              color: "var(--text-primary)",
              marginRight: 8,
              padding: 4,
            }}
          >
            {pinned ?
              <Pin size={16} />
            : <PinOff size={16} />}
          </button>
          <button
            className="no-drag"
            onClick={() => window.electronAPI.send("hide-input")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.6,
              color: "var(--text-primary)",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden", // Prevent horizontal scroll
        }}
      >
        <InputWithClear
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="你在做什么？"
          autoFocus
          className="no-drag"
          accent={accent}
          style={{ marginBottom: "12px" }}
        />

        <div style={{ marginBottom: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }} className="no-drag">
          {(settings.tags && settings.tags.length > 0 ?
            settings.tags
          : [
              { name: "工作", color: "#6366f1" },
              { name: "学习", color: "#a855f7" },
              { name: "摸鱼", color: "#f43f5e" },
              { name: "休息", color: "#10b981" },
            ]
          ).map((tag) => (
            <span
              key={tag.name}
              onClick={() => toggleTag(tag.name)}
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "12px",
                background: selectedTags.includes(tag.name) ? tag.color : "rgba(128,128,128,0.1)",
                color: selectedTags.includes(tag.name) ? "#fff" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
                userSelect: "none",
                border: "1px solid transparent",
                borderColor: selectedTags.includes(tag.name) ? "transparent" : "var(--border-color)",
              }}
            >
              {tag.name}
            </span>
          ))}

          <div style={{ position: "relative" }}>
            <span
              onClick={() => window.electronAPI && window.electronAPI.send("open-settings-tags")}
              title="管理标签"
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "transparent",
                border: "1px dashed var(--border-color)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Plus size={10} /> 标签
            </span>
          </div>
        </div>

        {/* Pomodoro Toggle & Timer Module */}
        <div style={{ marginBottom: "12px" }} className="no-drag">
          {/* Custom Switch for Countdown Mode */}
          <div
            onClick={() => setIsPomodoro(!isPomodoro)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              userSelect: "none",
              marginBottom: isPomodoro ? "8px" : "0",
            }}
          >
            <div
              style={{
                width: 36,
                height: 20,
                background: isPomodoro ? accent : "rgba(128,128,128,0.2)",
                borderRadius: 10,
                position: "relative",
                transition: "all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: isPomodoro ? 18 : 2,
                  top: 2,
                  width: 16,
                  height: 16,
                  background: "white",
                  borderRadius: "50%",
                  transition: "all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              ></div>
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-primary)" }}>倒计时模式</span>
          </div>

          {/* Conditional Time Settings */}
          {isPomodoro && (
            <div
              style={{
                background: "rgba(0,0,0,0.02)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "12px",
                paddingBottom: "0",
                animation: "slideDown 0.2s ease-out",
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[10, 25, 30, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      background: duration === m ? accent : "rgba(128,128,128,0.05)",
                      border: "1px solid",
                      borderColor: duration === m ? accent : "transparent",
                      borderRadius: 6,
                      color: duration === m ? "white" : "var(--text-secondary)",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Clock size={16} style={{ color: "var(--text-secondary)", marginBottom: "10px" }} />
                <input
                  type="range"
                  min="1"
                  max="180"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  style={{ flex: 1, height: 4, accentColor: accent, cursor: "pointer" }}
                />
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) setDuration(val);
                  }}
                  style={{
                    width: 50,
                    textAlign: "center",
                    fontSize: "0.9rem",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    padding: "2px 0px",
                    marginRight: -5,
                  }}
                />
                <span style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "5px" }}>m</span>
              </div>
            </div>
          )}
        </div>
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-5px); margin-top: -10px; }
            to { opacity: 1; transform: translateY(0); margin-top: 0; }
          }
        `}</style>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }} className="no-drag">
          <button className="btn" onClick={handleScreenshot}>
            <Camera size={14} style={{ color: accent }} /> 截图
          </button>
          <button
            className="btn"
            onClick={handleAI}
            disabled={aiLoading}
            style={{
              background:
                aiStatus === "success" ? `color-mix(in srgb, ${accent} 20%, transparent)`
                : aiStatus === "error" ? "rgba(239, 68, 68, 0.2)"
                : undefined,
              borderColor:
                aiStatus === "success" ? accent
                : aiStatus === "error" ? "rgba(239, 68, 68, 0.5)"
                : undefined,
            }}
          >
            {aiStatus === "loading" ?
              <>
                <Loader2 size={14} style={{ color: accent, animation: "spin 1s linear infinite" }} /> 分析中...
              </>
            : aiStatus === "success" ?
              <>
                <Check size={14} style={{ color: accent }} /> 完成
              </>
            : aiStatus === "error" ?
              <>
                <X size={14} style={{ color: "#ef4444" }} /> 失败
              </>
            : <>
                <Sparkles size={14} style={{ color: accent }} /> AI识别
              </>
            }
          </button>
        </div>

        <div
          className="no-drag"
          style={{
            marginBottom: "12px",
            border: "1px dashed var(--border-color)",
            borderRadius: "6px",
            padding: "8px",
            minHeight: screenshots.length > 0 ? "auto" : "80px",
            background: "var(--input-bg)",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: screenshots.length > 0 ? "flex-start" : "center",
            justifyContent: screenshots.length > 0 ? "flex-start" : "center",
            overflowY: "auto",
            maxHeight: "130px",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              Array.from(files).forEach((file) => {
                if (file.type.startsWith("image/")) {
                  const reader = new FileReader();
                  reader.onload = (evt) => setScreenshots((prev) => [...prev, evt.target.result]);
                  reader.readAsDataURL(file);
                }
              });
            }
          }}
        >
          {screenshots.map((img, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                borderRadius: "4px",
                overflow: "hidden",
                border: "1px solid var(--border-color)",
                width: "80px",
                height: "60px",
                cursor: "zoom-in",
                flexShrink: 0,
              }}
              onClick={() => openPreview(img)}
            >
              <img
                src={img}
                alt={`截图 ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeScreenshot(idx);
                }}
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  borderRadius: "3px",
                  color: "white",
                  padding: 2,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={10} />
              </button>
            </div>
          ))}

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            multiple
            onChange={handleFileSelect}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: screenshots.length > 0 ? "80px" : "100%",
              height: screenshots.length > 0 ? "60px" : "100%",
              display: "flex",
              flexDirection: screenshots.length > 0 ? "column" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              border: screenshots.length > 0 ? "1px dashed var(--border-color)" : "none",
              borderRadius: screenshots.length > 0 ? "4px" : "0",
            }}
          >
            {screenshots.length === 0 ?
              <>
                <ImageIcon size={20} opacity={0.5} />
                <span>粘贴、拖入或点击上传图片</span>
              </>
            : <Plus size={20} opacity={0.5} />}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          <textarea
            rows={5}
            placeholder="添加详情..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            spellCheck={false}
            className="no-drag"
            style={{ resize: "none", flex: 1, width: "100%" }}
          />
          {desc && (
            <button
              onClick={() => setDesc("")}
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Fixed Footer for Actions */}
      <div
        className="no-drag"
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border-color)",
          background: isFocused ? "var(--bg-active)" : "var(--bg-inactive)",
          display: "flex",
          justifyContent: "space-between", // Maybe add more controls later?
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {/* Optional status info or just spacer */}
        </div>
        <button className="btn primary" onClick={handleSave} style={{ background: accent }}>
          {isPomodoro ?
            <Clock size={14} />
          : <Save size={14} />}{" "}
          {isPomodoro ? "开始专注" : "保存"}
        </button>
      </div>

      {alertMsg && <AlertDialog message={alertMsg} onClose={() => setAlertMsg(null)} accent={accent} />}
    </div>
  );
}
