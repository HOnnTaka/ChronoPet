import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Plus, Download, X, Check, Clock, Copy } from "lucide-react";
import FilterButton from "./FilterButton";
import RecordCard from "./RecordCard";

const AiSummaryCard = ({ aiSummaryResult, setAiSummaryResult }) => {
  return (
    <div
      className="win11-card"
      style={{
        padding: "16px 20px",
        marginBottom: 24,
        background: "color-mix(in srgb, var(--accent), transparent 96%)",
        border: "1px solid color-mix(in srgb, var(--accent), transparent 85%)",
        position: "relative",
        animation: "fadeIn 0.4s ease-out",
        userSelect: "text",
        cursor: "text",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          color: "var(--accent)",
          fontWeight: 600,
          fontSize: "0.85rem",
          userSelect: "none",
          cursor: "default",
          opacity: 0.9,
        }}
      >
        <Sparkles size={14} />
        <span>AI 阶段性总结</span>
        <button
          onClick={() => setAiSummaryResult("")}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            opacity: 0.6,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
        >
          <X size={16} />
        </button>
      </div>
      <div
        style={{
          fontSize: "0.9rem",
          lineHeight: 1.6,
          color: "var(--text-primary)",
          whiteSpace: "pre-wrap",
          letterSpacing: "0.01em",
        }}
      >
        {aiSummaryResult}
      </div>
    </div>
  );
};

const LiveClock = () => {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
};

const LiveDuration = ({ start }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, now - start);
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

const formatDurationS = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h > 0 ? h + "h " : ""}${m}m`;
};

// Helper to determine if a record's duration is in minutes (old) or seconds (new)
const getDurationMs = (record) => {
  const d = record.duration || 0;
  // If record is newer than the migration time (approx 1739015400000), it's seconds
  // Or if duration is very large (> 3600), it's likely seconds
  if (record.id > 1739015400000 || d > 3600) {
    return d * 1000;
  }
  return d * 60000;
};

const LiveTimelineHeader = ({ lastRecord, onInsert, accent }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!lastRecord) return null;
  // If duration is 0, it means it's an active/unlimited task -> No gap
  if (lastRecord.duration === 0) return null;

  const durationMs = getDurationMs(lastRecord);
  const end = lastRecord.id + durationMs;
  const gapMs = now - end;
  const gapS = Math.floor(gapMs / 1000);

  if (gapMs < 0) return null;

  return (
    <>
      <div style={{ display: "flex", gap: "16px", marginBottom: "0", position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: "60px",
            marginTop: "-12px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--text-secondary)",
              opacity: 0.5,
              marginTop: "6px",
            }}
          ></div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", opacity: 0.7 }}>
            现在
          </div>
        </div>
      </div>
      <div style={{ display: "flex", margin: "0 0 16px 60px", position: "relative" }}>
        <div
          style={{
            flex: 1,
            padding: "10px 16px",
            background: "rgba(128, 128, 128, 0.04)",
            border: "1px dashed var(--border-color)",
            borderRadius: "8px",
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Clock size={14} opacity={0.6} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>空闲状态：{formatDurationS(gapS)}</span>
            <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
              {new Date(end).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 起
            </div>
          </div>
          <button
            className="btn primary"
            onClick={() => onInsert(end, gapS)}
            style={{ padding: "4px 12px", fontSize: "0.8rem", background: accent, borderColor: "transparent" }}
          >
            <Plus size={14} style={{ marginRight: 4 }} /> 补录
          </button>
        </div>
      </div>
    </>
  );
};

const LiveRecordNode = ({ record, index, accent }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (index !== 0) return; // Only the latest record needs a live timer
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [index]);

  const durationMs = getDurationMs(record);
  const end = record.id + durationMs;
  // Active if it is the latest record AND (duration is 0 OR end time hasn't passed)
  const isActive = index === 0 && (record.duration === 0 || now < end);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: "60px",
        marginTop: "-24px",
      }}
    >
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: accent,
          border: "3px solid var(--bg-active)",
          boxShadow: `0 0 0 2px ${accent}`,
          marginTop: "6px",
        }}
      ></div>
      <div
        style={{
          fontSize: "0.80rem",
          color: "var(--text-secondary)",
          marginTop: "8px",
          fontWeight: 600,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        {isActive && <span style={{ fontSize: "0.7rem", color: accent, fontWeight: 700 }}>当前正在</span>}
        <span>
          {new Date(isActive ? now : end).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            ...(isActive ? { second: "2-digit" } : {}),
          })}
        </span>
      </div>
      <div
        style={{
          fontSize: "0.7rem",
          color: "white",
          background: accent,
          padding: "2px 6px",
          borderRadius: "4px",
          marginTop: "6px",
          fontWeight: 600,
          minWidth: "32px",
          textAlign: "center",
        }}
      >
        {isActive ?
          <LiveDuration start={record.id} />
        : formatDurationS(Math.round(durationMs / 1000))}
      </div>
    </div>
  );
};

const SmallTimeNode = ({ time, label }) => (
  <div style={{ display: "flex", gap: "16px", marginBottom: "0", position: "relative", zIndex: 1, marginTop: "-16px" }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "60px", marginTop: "0" }}>
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "var(--text-secondary)",
          border: `2px solid var(--bg-active)`,
          boxShadow: `0 0 0 1px var(--text-secondary)`,
          opacity: 0.8,
        }}
      ></div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 500 }}>
        {label || new Date(time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  </div>
);

export default function TimelineView({
  filteredRecords,
  timeFilter,
  hasDateRange,
  handleFilterClick,

  handleExport,
  dateRange,
  setDateRange,
  aiSummaryResult,
  setAiSummaryResult,
  accent,
  handleInsertGap,
  handleDeleteRecord,
  setEditingRecord,
  handleSingleAiSummary,
  loadingRecordIds,
  onViewImages,
  settings,
}) {
  const handleUpdateRecord = (updatedRecord) => {
    if (window.electronAPI) window.electronAPI.send("update-record", updatedRecord);
  };

  return (
    <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}>
      {/* 筛选栏 - 两行布局 */}
      <div className="win11-card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          {/* 快捷筛选按钮 */}
          <div style={{ display: "flex", gap: 6 }}>
            <FilterButton
              id="all"
              label="全部"
              activeId={timeFilter}
              hasDateRange={hasDateRange}
              onClick={handleFilterClick}
              accent={accent}
            />
            <FilterButton
              id="today"
              label="今天"
              activeId={timeFilter}
              hasDateRange={hasDateRange}
              onClick={handleFilterClick}
              accent={accent}
            />
            <FilterButton
              id="yesterday"
              label="昨天"
              activeId={timeFilter}
              hasDateRange={hasDateRange}
              onClick={handleFilterClick}
              accent={accent}
            />
            <FilterButton
              id="week"
              label="本周"
              activeId={timeFilter}
              hasDateRange={hasDateRange}
              onClick={handleFilterClick}
              accent={accent}
            />
            <FilterButton
              id="month"
              label="本月"
              activeId={timeFilter}
              hasDateRange={hasDateRange}
              onClick={handleFilterClick}
              accent={accent}
            />
          </div>
          {/* 操作按钮组 */}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={handleExport} title="导出CSV" style={{ padding: "6px 12px" }}>
              <Download size={14} style={{ color: "var(--accent)" }} /> 导出
            </button>
          </div>
        </div>
        {/* 日期范围选择 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>日期范围:</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            style={{
              margin: 0,
              padding: "6px 10px",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: 4,
              width: 130,
            }}
          />
          <span style={{ color: "var(--text-secondary)" }}>至</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            style={{
              margin: 0,
              padding: "6px 10px",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: 4,
              width: 130,
            }}
          />
          {(dateRange.start || dateRange.end) && (
            <button
              className="btn"
              onClick={() => setDateRange({ start: "", end: "" })}
              title="清除日期范围"
              style={{ padding: "6px 10px" }}
            >
              <X size={14} /> 清除
            </button>
          )}
        </div>
      </div>

      {filteredRecords.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>暂无记录</div>
      )}

      {aiSummaryResult && <AiSummaryCard aiSummaryResult={aiSummaryResult} setAiSummaryResult={setAiSummaryResult} />}
      <div style={{ position: "relative", paddingLeft: "8px", paddingTop: "24px" }}>
        {/* Vertical Timeline Line */}
        <div
          style={{
            position: "absolute",
            left: "38px",
            top: "10px",
            bottom: "10px",
            width: "2px",
            background: "var(--border-color)",
            zIndex: 0,
            opacity: 0.6,
          }}
        ></div>

        {timeFilter === "today" && filteredRecords.length > 0 && (
          <LiveTimelineHeader lastRecord={filteredRecords[0]} onInsert={handleInsertGap} accent={accent} />
        )}

        {filteredRecords.map((r, index) => {
          const nextRecord = filteredRecords[index + 1];
          let gapElement = null;

          if (nextRecord) {
            const newerStart = r.id;
            const olderEnd = nextRecord.id + getDurationMs(nextRecord);
            const gapMs = newerStart - olderEnd;
            const gapS = Math.floor(gapMs / 1000);

            if (gapMs > 60000) {
              // Only show real gaps (> 1 min)

              gapElement = (
                <div key={`gap-${r.id}`} style={{ display: "flex", margin: "0 0 16px 60px", position: "relative" }}>
                  <div
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: "rgba(128, 128, 128, 0.04)",
                      border: "1px dashed var(--border-color)",
                      borderRadius: "8px",
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Clock size={14} opacity={0.6} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                        空闲状态：{formatDurationS(gapS)}
                      </span>
                      <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                        {new Date(olderEnd).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(newerStart).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => handleInsertGap(olderEnd, gapS)}
                      style={{
                        padding: "4px 12px",
                        fontSize: "0.8rem",
                        background: "var(--accent)",
                        borderColor: "transparent",
                      }}
                    >
                      <Plus size={14} style={{ marginRight: 4 }} /> 补录
                    </button>
                  </div>
                </div>
              );
            }
          }

          return (
            <React.Fragment key={r.id}>
              <div style={{ display: "flex", gap: "16px", marginBottom: "16px", position: "relative", zIndex: 1 }}>
                <LiveRecordNode record={r} index={index} accent={accent} />

                {/* Record Card */}
                <RecordCard
                  record={r}
                  accent={accent}
                  onDelete={handleDeleteRecord}
                  onUpdate={handleUpdateRecord}
                  onEdit={(record) => setEditingRecord(record)}
                  onAiSummary={handleSingleAiSummary}
                  loadingAi={loadingRecordIds.has(r.id)}
                  onViewImages={onViewImages}
                  settings={settings}
                />
              </div>

              {/* Start Time Node: 只要有空闲间隙或是最后一条，就必须显示节点 */}
              {(!nextRecord || r.id - (nextRecord.id + getDurationMs(nextRecord)) > 60000) && (
                <SmallTimeNode time={r.id} label={getDurationMs(r) < 60000 ? "" : undefined} />
              )}

              {gapElement}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
