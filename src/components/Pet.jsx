import React, { useState, useRef, useEffect } from "react";
import { Plus, Clock, List, Layout, Sparkles, Target, Coffee, Brain, X, Edit3, Loader2, Send } from "lucide-react";

const Pet = () => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isSwitching, setIsSwitching] = useState(false);
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
  const hasPlayedSound = useRef(false);

  const playBeep = () => {
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
  };

  const fetchData = async () => {
    try {
      if (window.electronAPI) {
        const colors = await window.electronAPI.invoke("get-system-colors");
        if (colors?.accent) setAccent("#" + colors.accent);

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

        let iconToUse = "icon_moyu.png";
        let status = "空闲";

        // Always show the last record as current status
        if (records && records.length > 0) {
          const last = records[records.length - 1];
          const tags = last.tags || [];

          status = tags.length > 0 ? tags[0] : last.task || "进行中";

          if (tags.includes("学习")) iconToUse = settings.petIconStudy || "icon_study.png";
          else if (tags.includes("工作")) iconToUse = settings.petIconWork || "icon_work.png";
          else if (tags.includes("休息")) iconToUse = settings.petIconRest || "icon_rest.png";
          else {
            // Check for custom tag icon
            const activeCustomTag = settings.tags ? settings.tags.find((t) => tags.includes(t.name)) : null;
            if (activeCustomTag && activeCustomTag.petIcon) {
              iconToUse = activeCustomTag.petIcon;
            } else {
              iconToUse = settings.petIconPath || "icon_moyu.png";
            }
          }

          if (last.isFocus) {
            const now = Date.now();
            const end = last.id + (last.duration || 0) * 60000;
            if (now >= end) {
              // Expired, switch to Moyu
              iconToUse = settings.petIconPath || "icon_moyu.png";
              status = "摸鱼";
              setLastRecordTime(end); // Count from when it finished
            } else {
              setLastRecordTime(last.id);
            }
          } else {
            setLastRecordTime(last.id); // Always count from start
          }
          setLastRecord(last);
        } else {
          // No records at all -> Idle
          iconToUse = settings.petIconPath || "icon_moyu.png";
          status = "空闲";
          setLastRecordTime(Date.now());
          setLastRecord(null);
        }

        setIconPath(iconToUse);
        setCurrentStatus(status);
      }
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
    return () => {
      if (cleanUpdates) cleanUpdates();
      if (cleanSettingsUpdates) cleanSettingsUpdates();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      // Reset sound flag if record changes
      if (lastRecord && lastRecord.id !== hasPlayedSound.current.recordId) {
        hasPlayedSound.current = { recordId: lastRecord.id, played: false };
      }

      let timeStr = "";
      let diff = Math.max(0, now - lastRecordTime);

      if (lastRecord && lastRecord.isFocus) {
        // Focus Mode
        const durationMs = (lastRecord.duration || 0) * 60000;
        // Recalculate diff relative to start (lastRecord.id) for progress
        // Wait, fetchData might have changed lastRecordTime to 'end' if expired
        // Let's use lastRecord.id directly for calculating progress
        const elapsed = now - lastRecord.id;

        if (elapsed >= durationMs) {
          // Finished
          if (!hasPlayedSound.current.played) {
            playBeep();
            hasPlayedSound.current.played = true;
            // Force visual update to Moyu if not already
            setCurrentStatus("摸鱼");
            setIconPath(settings?.petIconPath || "icon_moyu.png");
          }
          // Count uptime since finish
          diff = Math.max(0, elapsed - durationMs);
        } else {
          // Running
          diff = elapsed;
        }

        // Format: Elapsed / Total
        // e.g. 5m 0s / 25m
        const eM = Math.floor(diff / 60000);
        const eS = Math.floor((diff % 60000) / 1000);
        const tM = lastRecord.duration;

        if (elapsed >= durationMs) {
          // Overtime
          const oHrs = Math.floor(diff / 3600000);
          const oMins = Math.floor((diff % 3600000) / 60000);
          const oSecs = Math.floor((diff % 60000) / 1000);
          timeStr = `+ ${oHrs > 0 ? oHrs + "h " : ""}${oMins}m ${oSecs}s`;
        } else {
          timeStr = `${eM}m ${eS}s / ${tM}m`;
        }
      } else {
        // Standard Mode
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        timeStr = `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds}s`;
      }

      setDurationStr(`${currentStatus} ${timeStr}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRecordTime, currentStatus, lastRecord, settings]);

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

  // 限制显示的标签数量为6个，多余的用+号展示
  const visibleTags = availableTags.slice(0, 6);
  // Unused: const hasMoreTags = availableTags.length > 6;

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
              background: "rgba(20,20,20,0.99)",
              // backdropFilter: "blur(30px)", // 无效，留着也没用
              borderRadius: "18px",
              padding: "16px",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              animation: "premiumPop 0.35s cubic-bezier(0.1, 0.9, 0.2, 1)",
              zIndex: 1000,
              color: "#ffffff",
              pointerEvents: "auto",
              fontFamily: '"SF Pro Display", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
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
                style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.3px", color: "rgba(255,255,255,0.9)" }}
              >
                快速记事
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {visibleTags.map((tag, idx) => (
                <button
                  key={tag.name}
                  onClick={() => handleQuickAction(tag.name)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px",
                    padding: "12px 6px",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                    animation: `fadeUpIn 0.25s ease forwards ${idx * 0.04}s`,
                    opacity: 0,
                    transform: "translateY(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tag.color + "20";
                    e.currentTarget.style.borderColor = tag.color;
                    e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                  }}
                >
                  <div style={{ color: tag.color }}>{tag.icon}</div>
                  <span style={{ fontWeight: 600 }}>{tag.name}</span>
                </button>
              ))}
              {/* + 按钮 (跳转设置) */}
              <button
                onClick={() => {
                  if (window.electronAPI) window.electronAPI.send("open-settings-tags");
                  closeMenu();
                }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  borderRadius: "14px",
                  padding: "12px 6px",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                  animation: `fadeUpIn 0.25s ease forwards ${visibleTags.length * 0.04}s`,
                  opacity: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                }}
              >
                <Plus size={16} />
                <span style={{ fontWeight: 500 }}>管理</span>
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={handleDetailedRecord}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
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
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
              >
                <Edit3 size={14} />
                详细记录
              </button>
              <button
                onClick={handleOpenDashboard}
                style={{
                  flex: 1,
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
                onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
              >
                <Layout size={14} />
                主面板
              </button>
            </div>

            {/* Bubble Tail */}
            <div
              style={{
                position: "absolute",
                bottom: "-7px",
                ...(menuPosition === "left" ? { left: "48px" } : { right: "48px" }),
                width: "14px",
                height: "14px",
                background: "rgba(28, 28, 28, 0.60)", // Match bubble bg
                transform: "rotate(45deg)",
                boxShadow: "2px 2px 4px rgba(0,0,0,0.4)",
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
                  `0 0 0 3px rgba(255,255,255,0.15), 0 16px 40px ${accent}40`
                : `0 8px 30px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3)`,
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
                  border: "2px solid rgba(28,28,28,0.8)", // 暗色适配
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
                background: "rgba(0, 0, 0, 0.7)",
                color: "white",
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
