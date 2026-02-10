import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Clock,
  List,
  Layout,
  Sparkles,
  Target,
  Coffee,
  Brain,
  X,
  Edit3,
  Loader2,
  Send,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Helper to get duration in seconds
const getDurationS = (record) => {
  if (!record) return 0;
  const d = record.duration || 0;
  // If record is newer than the migration time, it's seconds
  if (record.id > 1739015400000 || d > 3600) return d;
  return d * 60;
};

const resolveStatusIcon = (settings, statusLabel, tags = []) => {
  const s = settings || {};
  const preset = s.petPreset || "apple";
  const appearance = s.appearance || {};
  const overrides = appearance[preset] || {};
  const suffix = preset === "manbo" ? "_mb" : "";
  const baseIcon = `icon_base${suffix}.png`;

  if (statusLabel === "空闲") {
    if (overrides["Idle"]) return overrides["Idle"];
    const currentIdle = s.petIconPath;
    if (currentIdle && currentIdle !== "icon_base.png" && currentIdle !== "icon_base_mb.png") {
      return currentIdle;
    }
    return baseIcon;
  }

  const tagList = tags || [];

  // Check overrides
  if (tagList.includes("工作") && overrides["工作"]) return overrides["工作"];
  if (tagList.includes("学习") && overrides["学习"]) return overrides["学习"];
  if (tagList.includes("休息") && overrides["休息"]) return overrides["休息"];
  if (tagList.includes("摸鱼") && overrides["摸鱼"]) return overrides["摸鱼"];

  // Check legacy global overrides
  if (tagList.includes("工作") && s.petIconWork) return s.petIconWork;
  if (tagList.includes("学习") && s.petIconStudy) return s.petIconStudy;
  if (tagList.includes("休息") && s.petIconRest) return s.petIconRest;
  if (tagList.includes("摸鱼") && s.petIconMoyu) return s.petIconMoyu;

  // Custom tag petIcon
  const activeCustomTag = s.tags ? s.tags.find((t) => tagList.includes(t.name)) : null;
  if (activeCustomTag && activeCustomTag.petIcon) return activeCustomTag.petIcon;

  // Defaults with suffix
  if (tagList.includes("工作")) return `icon_work${suffix}.png`;
  if (tagList.includes("学习")) return `icon_study${suffix}.png`;
  if (tagList.includes("休息")) return `icon_rest${suffix}.png`;
  if (tagList.includes("摸鱼")) return `icon_moyu${suffix}.png`;

  return `icon_base${suffix}.png`;
};

const Pet = () => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isSwitching, setIsSwitching] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [accent, setAccent] = useState("#7c3aed");
  const [iconPath, setIconPath] = useState("icon_moyu.png");
  const [lastRecordTime, setLastRecordTime] = useState(() => Date.now());
  const [durationStr, setDurationStr] = useState("00:00");
  const [showMenu, setShowMenu] = useState(false);
  const [availableTags, setAvailableTags] = useState([
    { name: "工作", color: "#6366f1", icon: <Target size={16} /> },
    { name: "学习", color: "#a855f7", icon: <Brain size={16} /> },
    { name: "摸鱼", color: "#f43f5e", icon: <Coffee size={16} /> },
    { name: "休息", color: "#10b981", icon: <Clock size={16} /> },
  ]);

  const [currentStatus, setCurrentStatus] = useState("空闲");
  const [lastRecord, setLastRecord] = useState(null);
  const [settings, setSettings] = useState({});
  const [tagPage, setTagPage] = useState(0);
  const [slideAnim, setSlideAnim] = useState("slideInFromRight");

  const handlePageChange = (newPage, direction) => {
    if (newPage === tagPage) return;
    const dir = direction || (newPage > tagPage ? "next" : "prev");
    setSlideAnim(dir === "next" ? "slideInFromRight" : "slideInFromLeft");
    setTagPage(newPage);
  };
  const hasPlayedSound = useRef({ recordId: null, played: false });
  const playBeepFallback = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const playEndSound = useCallback(() => {
    if (settings?.timerEndAudioEnabled === false) return;
    const audioPath = settings?.timerEndAudioPath || "manbo.wav";

    try {
      const isAbsolute = audioPath.includes(":") || audioPath.startsWith("/");
      const src = isAbsolute ? `file://${audioPath}` : audioPath;

      const audio = new Audio(src);
      audio.volume = 0.6;
      audio.play().catch((err) => {
        console.warn("Audio file play failed, using fallback beep:", err);
        playBeepFallback();
      });
    } catch (e) {
      console.error("Sound play error:", e);
      playBeepFallback();
    }
  }, [settings, playBeepFallback]);

  const fetchData = async () => {
    try {
      if (window.electronAPI) {
        const colors = await window.electronAPI.invoke("get-system-colors");
        if (colors?.accent) setAccent("#" + colors.accent);
        if (colors?.isDark !== undefined) setIsDark(colors.isDark);

        const settings = await window.electronAPI.invoke("get-settings");
        setSettings(settings || {});

        if (settings?.tags && Array.isArray(settings.tags) && settings.tags.length > 0) {
          const mappedTags = settings.tags.map((t) => {
            let IconComp = Target;
            const iconName = t.iconValue || t.icon;
            if (iconName === "Brain") IconComp = Brain;
            else if (iconName === "Coffee") IconComp = Coffee;
            else if (iconName === "Clock") IconComp = Clock;
            else if (iconName === "Sparkles") IconComp = Sparkles;
            else if (iconName === "List") IconComp = List;
            else if (iconName === "Layout") IconComp = Layout;
            else if (iconName === "Send") IconComp = Send;

            const iconElement =
              t.iconType === "image" ?
                <img
                  src={t.iconValue}
                  style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover" }}
                  onError={(e) => (e.target.style.display = "none")}
                />
              : <IconComp size={16} />;

            return {
              name: t.name,
              color: t.color,
              icon: iconElement,
            };
          });
          setAvailableTags(mappedTags);
        }

        const records = await window.electronAPI.invoke("get-records");

        // resolveStatusIcon introduced outside to make it accessible to other functions
        let iconToUse = resolveStatusIcon(settings, "空闲");
        let status = "空闲";
        let lastRecordToSet = null;
        let lastRecordTimeToSet = null;

        if (records && records.length > 0) {
          // Find the chronologically latest record, not just the last in array
          const sorted = [...records].sort((a, b) => a.id - b.id);
          const last = sorted[sorted.length - 1];
          const now = Date.now();
          const durationMs =
            last.id > 1739015400000 || (last.duration || 0) > 3600 ?
              (last.duration || 0) * 1000
            : (last.duration || 0) * 60000;
          const end = last.id + durationMs;

          // Special case: duration 0 means "Until stopped" (Unlimited)
          // We treat it as always active unless explicitly stopped (which would set a duration)
          const isUnlimited = last.duration === 0;

          // Heuristic: if a FIXED duration record ended more than 5s ago, consider it "Idle"
          if (!isUnlimited && now >= end + 5000) {
            status = "空闲";
            iconToUse = resolveStatusIcon(settings, "空闲");
            lastRecordTimeToSet = null;
            lastRecordToSet = null;
          } else {
            status = "记录中";
            lastRecordToSet = last;
            lastRecordTimeToSet = last.id;
            const tags = last.tags || [];

            if (tags.includes("学习")) status = "学习中";
            else if (tags.includes("工作")) status = "工作中";
            else if (tags.includes("休息")) status = "休息中";
            else if (tags.includes("摸鱼")) status = "摸鱼中";

            iconToUse = resolveStatusIcon(settings, status, tags);
          }

          setIconPath(iconToUse);
          setCurrentStatus(status);
          setLastRecord(lastRecordToSet);
          setLastRecordTime(lastRecordTimeToSet);
        } else {
          setIconPath(resolveStatusIcon(settings, "空闲"));
          setCurrentStatus("空闲");
          setLastRecord(null);
          setLastRecordTime(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
    const cleanUpdates = window.electronAPI?.receive("records-updated", () => fetchData());
    // Listen for tab/settings updates to refresh tags
    const cleanSettingsUpdates = window.electronAPI?.receive("settings-updated", () => fetchData()); // Assuming we might trigger this

    // Listen for system theme updates
    const cleanThemeUpdates = window.electronAPI?.receive("theme-updated", (data) => {
      if (data.isDark !== undefined) setIsDark(data.isDark);
      if (data.accent) setAccent("#" + data.accent);
    });

    return () => {
      if (cleanUpdates) cleanUpdates();
      if (cleanSettingsUpdates) cleanSettingsUpdates();
      if (cleanThemeUpdates) cleanThemeUpdates();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!lastRecordTime) {
        setDurationStr("空闲中");
        return;
      }

      const now = Date.now();

      // Reset sound flag if record changes
      if (lastRecord && lastRecord.id !== hasPlayedSound.current.recordId) {
        hasPlayedSound.current = { recordId: lastRecord.id, played: false };
      }

      let timeStr = "";
      const diffMs = Math.max(0, now - lastRecordTime);
      const diffS = Math.floor(diffMs / 1000);

      if (lastRecord && lastRecord.isFocus) {
        const durationS = getDurationS(lastRecord);
        const elapsedS = Math.floor((now - lastRecord.id) / 1000);

        if (elapsedS >= durationS) {
          if (!hasPlayedSound.current.played) {
            playEndSound();
            hasPlayedSound.current.played = true;
            setCurrentStatus("空闲");
            setIconPath(resolveStatusIcon(settings, "空闲"));
            setLastRecordTime(null); // Ensure timer stops updating for this record
            if (window.electronAPI) {
              window.electronAPI.send("sync-app-icon");
            }
          }
          timeStr = "已结束";
        } else {
          const eM = Math.floor(elapsedS / 60);
          const eS = elapsedS % 60;
          const tM = Math.floor(durationS / 60);
          const tS = durationS % 60;
          timeStr = `${eM}m ${eS}s / ${tM}m ${tS}s`;
        }
      } else {
        const durationS = getDurationS(lastRecord);
        if (diffS >= durationS && durationS > 0) {
          setCurrentStatus("空闲");
          setDurationStr("空闲中");
          setIconPath(resolveStatusIcon(settings, "空闲"));
          setLastRecordTime(null);
          if (window.electronAPI) {
            window.electronAPI.send("sync-app-icon");
          }
          return;
        }

        const h = Math.floor(diffS / 3600);
        const m = Math.floor((diffS % 3600) / 60);
        const s = diffS % 60;
        timeStr = `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
      }

      setDurationStr(`${currentStatus} ${timeStr}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRecordTime, currentStatus, lastRecord, settings, playEndSound]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(false);
    dragStart.current = { x: e.screenX, y: e.screenY };

    const handleMouseMove = (mmE) => {
      const deltaX = mmE.screenX - dragStart.current.x;
      const deltaY = mmE.screenY - dragStart.current.y;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        setIsDragging(true);
        if (window.electronAPI) {
          window.electronAPI.send("window-moving", { dx: deltaX, dy: deltaY });
        }
        dragStart.current = { x: mmE.screenX, y: mmE.screenY };
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setTimeout(() => setIsDragging(false), 50);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const setIgnoreMouse = (ignore) => {
    if (window.electronAPI) {
      window.electronAPI.send("set-ignore-mouse", ignore);
    }
  };

  const [menuPosition, setMenuPosition] = useState("right");

  const toggleMenu = () => {
    if (isDragging) return;

    if (!showMenu) {
      const screenWidth = window.screen.width;
      const petScreenX = window.screenX + 300;

      if (petScreenX < screenWidth * 0.4) {
        setMenuPosition("left");
      } else {
        setMenuPosition("right");
      }
    }

    setShowMenu(!showMenu);
  };

  const closeMenu = () => {
    setShowMenu(false);
  };

  const handleQuickAction = (tag) => {
    setIsSwitching(true);
    if (window.electronAPI) {
      window.electronAPI.send("quick-record-now", { tag });
    }
    closeMenu();
  };

  const handleDetailedRecord = () => {
    if (window.electronAPI) {
      window.electronAPI.send("open-detailed-record");
    }
    closeMenu();
  };

  const handleOpenDashboard = () => {
    if (window.electronAPI) {
      window.electronAPI.send("pet-clicked", "right");
    }
    closeMenu();
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    if (!isDragging) {
      if (window.electronAPI) {
        window.electronAPI.send("pet-clicked", "right");
      }
    }
  };

  const handleStop = () => {
    if (window.electronAPI) {
      // Local optimistic update
      setCurrentStatus("空闲");
      setLastRecordTime(null);
      setDurationStr("空闲中 0s");
      setIconPath(resolveStatusIcon(settings, "空闲"));

      window.electronAPI.send("stop-current-record");
      setShowMenu(false);
    }
  };

  // Tags Pagination
  const tagsPerPage = 6;
  const totalPages = Math.ceil(availableTags.length / tagsPerPage);
  const currentTags = availableTags.slice(tagPage * tagsPerPage, (tagPage + 1) * tagsPerPage);

  // Mouse Through Logic with Grace Period
  const ignoreTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (ignoreTimeoutRef.current) {
      clearTimeout(ignoreTimeoutRef.current);
      ignoreTimeoutRef.current = null;
    }
    setIgnoreMouse(false);
  };

  const handleMouseLeave = () => {
    if (ignoreTimeoutRef.current) clearTimeout(ignoreTimeoutRef.current);
    ignoreTimeoutRef.current = setTimeout(() => {
      setIgnoreMouse(true);
    }, 300); // Increased grace period to 300ms to prevent flickering during gap traversal
  };

  const themeStyles = {
    bubbleBg: isDark ? "rgba(20,20,20,0.99)" : "rgba(255,255,255,0.98)",
    bubbleShadow:
      isDark ?
        "0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)"
      : "0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
    textPrimary: isDark ? "#ffffff" : "#1a1a1a",
    textSecondary: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
    btnBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    btnBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    btnHoverBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
    btnText: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        padding: "30px",
        boxSizing: "border-box",
        overflow: "visible",
      }}
    >
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "fit-content",
        }}
      >
        {/* Premium Bubble Menu */}
        {showMenu && (
          <div
            className="bubble-content"
            onMouseEnter={handleMouseEnter}
            style={{
              position: "absolute",
              bottom: "100px",
              ...(menuPosition === "left" ? { left: "-20px" } : { right: "-20px" }),
              width: "260px",
              // 注意：在 Electron 透明窗口中，backdrop-filter 无法模糊窗口背后的 OS 桌面，只能模糊窗口内的元素。
              // 若要模糊桌面背景，需要开启窗口的 acrylic 材质，但这会导致整个 600x800 窗口变成矩形磨砂块，破坏异形效果。
              // 因此此处采用高不透明度 + 渐变 + 内阴影来模拟质感。
              // 因此此处采用高不透明度 + 渐变 + 内阴影来模拟质感。
              background: themeStyles.bubbleBg,
              // backdropFilter: "blur(30px)", // 无效，留着也没用
              borderRadius: "18px",
              padding: "16px",
              boxShadow: themeStyles.bubbleShadow,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              animation: "premiumPop 0.35s cubic-bezier(0.1, 0.9, 0.2, 1)",
              zIndex: 1000,
              color: themeStyles.textPrimary,
              pointerEvents: "auto",
              fontFamily: '"SF Pro Display", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
              userSelect: "none",
            }}
          >
            {/* Tag Input Overlay Removed */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "0 4px",
                marginBottom: "2px",
              }}
            >
              <div style={{ width: 4, height: 16, borderRadius: 2, background: accent }}></div>
              <span
                style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.3px", color: themeStyles.textPrimary }}
              >
                快速记事
              </span>
            </div>

            <div
              onWheel={(e) => {
                if (totalPages <= 1) return;
                if (e.deltaY < 0) {
                  const next = (tagPage + 1) % totalPages;
                  handlePageChange(next, "next");
                } else {
                  const prev = (tagPage - 1 + totalPages) % totalPages;
                  handlePageChange(prev, "prev");
                }
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(2, 60px)", // Fixed row height
                gap: "8px",
                position: "relative",
                height: "128px", // Fixed container height (60*2 + gap)
                padding: "4px",
                overflow: "visible",
              }}
            >
              <div
                key={tagPage}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gridTemplateRows: "repeat(2, 60px)", // Keep rows fixed inside
                  gap: "8px",
                  gridColumn: "1 / span 3",
                  animation: `${slideAnim} 0.35s cubic-bezier(0.1, 0.9, 0.2, 1)`,
                }}
              >
                {currentTags.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => handleQuickAction(tag.name)}
                    style={{
                      background: themeStyles.btnBg,
                      border: `1px solid ${themeStyles.btnBorder}`,
                      borderRadius: "12px",
                      padding: "4px", // Minimal padding due to fixed size
                      height: "60px", // Fixed height
                      width: "100%", // Use grid width
                      color: themeStyles.btnText,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2px",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = tag.color + "20";
                      e.currentTarget.style.borderColor = tag.color;
                      e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = themeStyles.btnBg;
                      e.currentTarget.style.borderColor = themeStyles.btnBorder;
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                    }}
                  >
                    <div style={{ color: tag.color }}>{tag.icon}</div>
                    <span style={{ fontWeight: 600 }}>{tag.name}</span>
                  </button>
                ))}
                {/* 管理按钮放在最后一页的空位或是独立控制 */}
                {tagPage === totalPages - 1 && currentTags.length < 6 && (
                  <button
                    onClick={() => {
                      if (window.electronAPI) window.electronAPI.send("open-settings-tags");
                      closeMenu();
                    }}
                    style={{
                      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                      border: isDark ? "1px dashed rgba(255,255,255,0.15)" : "1px dashed rgba(0,0,0,0.1)",
                      borderRadius: "12px",
                      padding: "4px",
                      height: "60px", // Fixed height to match tags
                      width: "100%",
                      color: themeStyles.textSecondary,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2px",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                  >
                    <Plus size={16} />
                    <span style={{ fontWeight: 500 }}>管理</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pagination Dots */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "-4px" }}>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => handlePageChange(i)}
                    style={{
                      width: i === tagPage ? "12px" : "6px",
                      height: "6px",
                      borderRadius: "3px",
                      background: i === tagPage ? accent : themeStyles.btnBorder,
                      transition: "all 0.3s",
                      cursor: "pointer",
                    }}
                  ></div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={handleDetailedRecord}
                style={{
                  flex: 1,
                  background: themeStyles.btnBg,
                  border: `1px solid ${themeStyles.btnBorder}`,
                  borderRadius: "12px",
                  padding: "10px",
                  color: themeStyles.textPrimary,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
              >
                <Edit3 size={14} />
                详细记录
              </button>
              <button
                className="bubble-item"
                onClick={handleStop}
                title="停止当前任务"
                disabled={currentStatus === "空闲"}
                style={{
                  flex: 1,
                  background: themeStyles.btnBg,
                  border: `1px solid ${themeStyles.btnBorder}`,
                  borderRadius: "12px",
                  padding: "10px",
                  color: themeStyles.textPrimary,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                  opacity: currentStatus === "空闲" ? 0.5 : 1,
                }}
              >
                <Square size={14} />
                停止
              </button>
            </div>
            <button
              onClick={handleOpenDashboard}
              style={{
                width: "100%",
                background: accent,
                border: "none",
                borderRadius: "12px",
                padding: "10px",
                color: "white",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: `0 4px 12px ${accent}50`,
                transition: "all 0.2s",
              }}
            >
              <Layout size={14} />
              主面板
            </button>

            {/* Bubble Tail */}
            <div
              style={{
                position: "absolute",
                bottom: "-7px",
                ...(menuPosition === "left" ? { left: "48px" } : { right: "48px" }),
                width: "14px",
                height: "14px",
                background: themeStyles.bubbleBg, // Match bubble bg
                transform: "rotate(45deg)",
                boxShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                zIndex: -1,
              }}
            ></div>
          </div>
        )}

        {/* Pet Avatar Container */}
        <div style={{ position: "relative" }}>
          <div
            onMouseDown={handleMouseDown}
            onClick={toggleMenu}
            onContextMenu={handleRightClick}
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: `url(${iconPath}) center/cover no-repeat`,
              // 暗色适配：减少白边亮度
              boxShadow:
                showMenu ?
                  isDark ? `0 0 0 3px rgba(255,255,255,0.15), 0 16px 40px ${accent}40`
                  : `0 0 0 3px rgba(0,0,0,0.05), 0 16px 40px ${accent}30`
                : isDark ? `0 8px 30px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3)`
                : `0 8px 25px rgba(0,0,0,0.15), 0 0 0 2px rgba(255,255,255,0.8)`,
              cursor: isDragging ? "grabbing" : "pointer",
              transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              userSelect: "none",
              zIndex: 1001,
              position: "relative",
              transform: showMenu ? "scale(1.08) translateY(-6px)" : "scale(1)",
            }}
            className="pet-avatar"
          >
            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  background: accent,
                  color: "white",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                  animation: "scaleIn 0.25s",
                  border: isDark ? "2px solid rgba(28,28,28,0.8)" : "2px solid rgba(255,255,255,0.9)",
                }}
              >
                <X size={12} strokeWidth={3} />
              </div>
            )}

            {isSwitching && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(2px)",
                  zIndex: 20,
                }}
              >
                <Loader2 className="spin" size={24} color="#fff" />
              </div>
            )}
          </div>

          {/* Duration Badge */}
          {!showMenu && (
            <div
              style={{
                position: "absolute",
                top: "58px",
                left: "50%",
                transform: "translateX(-50%)",
                background: isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)",
                color: isDark ? "white" : "#333",
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                animation: "floatingDuration 3s ease-in-out infinite",
                zIndex: 1002,
                fontFamily: '"SF Pro Display", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
              }}
            >
              {durationStr}
            </div>
          )}
        </div>
      </div>

      <style>{`
          @keyframes premiumPop {
            0% { opacity: 0; transform: scale(0.7) translateY(30px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes fadeUpIn {
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes floatingDuration {
            0%, 100% { transform: translate(-50%, 0); }
            50% { transform: translate(-50%, -4px); }
          }
          @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
          @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(24px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-24px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .pet-avatar:hover { 
            transform: scale(1.08) translateY(-3px); 
            box-shadow: 0 12px 35px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.9);
          }
          .pet-avatar:active { transform: scale(0.94); }
      `}</style>
    </div>
  );
};

export default Pet;
