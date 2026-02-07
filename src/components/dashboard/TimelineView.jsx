import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Plus, Download, X, Check, Clock, Copy } from "lucide-react";
import FilterButton from "./FilterButton";
import RecordCard from "./RecordCard";

const AiSummaryCard = ({ aiSummaryResult, setAiSummaryResult }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(aiSummaryResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className="win11-card"
      style={{
        padding: 20,
        marginBottom: 24,
        background: "rgba(124, 58, 237, 0.05)",
        border: "1px solid rgba(124, 58, 237, 0.2)",
        position: "relative",
        animation: "fadeIn 0.4s ease-out",
        userSelect: "text", // Allow text selection
        cursor: "text",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          color: "#7c3aed",
          fontWeight: 600,
          userSelect: "none", // Don't select header
          cursor: "default",
        }}
      >
        <Sparkles size={18} />
        <span>AI 阶段性总结</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isCopied ? "#10b981" : "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.8rem",
              transition: "all 0.2s",
            }}
          >
            {isCopied ?
              <Check size={14} />
            : <Copy size={14} />}
            {isCopied ? "已复制" : "复制"}
          </button>
          <button
            onClick={() => setAiSummaryResult("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
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

export default function TimelineView({
  filteredRecords,
  timeFilter,
  hasDateRange,
  handleFilterClick,
  aiSummaryLoading,
  handleAiSummary,
  handleAddEvent,
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
            <button
              className="btn"
              onClick={handleAiSummary}
              disabled={aiSummaryLoading}
              style={{
                padding: "6px 12px",
                background: "rgba(124, 58, 237, 0.1)",
                borderColor: "rgba(124, 58, 237, 0.3)",
                color: "#7c3aed",
              }}
            >
              {aiSummaryLoading ?
                <Loader2 size={14} className="spin" />
              : <Sparkles size={14} />}
              {aiSummaryLoading ? "总结中..." : "AI 总结"}
            </button>
            <button
              className="btn primary"
              onClick={handleAddEvent}
              style={{ padding: "6px 12px", background: "var(--accent)", borderColor: "transparent" }}
            >
              <Plus size={14} /> 添加事件
            </button>
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

        {filteredRecords.map((r, index) => {
          const nextRecord = filteredRecords[index + 1];
          let gapElement = null;

          if (nextRecord) {
            const currentStart = r.id;
            const nextEnd = nextRecord.id + (nextRecord.duration || 1) * 60000;
            const gapMs = currentStart - nextEnd;
            const gapMins = Math.floor(gapMs / 60000);

            if (gapMins > 5) {
              gapElement = (
                <div
                  key={`gap-${r.id}`}
                  style={{
                    display: "flex",
                    margin: "8px 0 24px 60px",
                    position: "relative",
                  }}
                >
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
                        ❓ 未记录时段：{gapMins} 分钟
                      </span>
                      <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                        {new Date(nextEnd).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(currentStart).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => handleInsertGap(nextEnd)}
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
              <div style={{ display: "flex", gap: "16px", marginBottom: "24px", position: "relative", zIndex: 1 }}>
                {/* Timeline Node */}
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
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      marginTop: "8px",
                      fontWeight: 600,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    {index === 0 && (
                      <span style={{ fontSize: "0.7rem", color: accent, fontWeight: 700 }}>当前正在</span>
                    )}
                    {index === 0 ?
                      <LiveClock />
                    : new Date(r.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
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
                    {index === 0 ?
                      <LiveDuration start={r.id} />
                    : (r.duration || 1) + "m"}
                  </div>
                </div>

                {/* Record Card */}
                <RecordCard
                  record={r}
                  accent={accent}
                  onDelete={handleDeleteRecord}
                  onUpdate={handleUpdateRecord}
                  onEdit={(record) => setEditingRecord(record)}
                  onAiSummary={handleSingleAiSummary}
                  loadingAi={loadingRecordIds.has(r.id)}
                />
              </div>
              {gapElement}
            </React.Fragment>
          );
        })}

        {filteredRecords.length > 0 && (
          <div style={{ display: "flex", gap: "16px", position: "relative", zIndex: 1 }}>
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
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginTop: "8px",
                  fontWeight: 600,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {new Date(filteredRecords[filteredRecords.length - 1].timestamp).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
                开始
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
