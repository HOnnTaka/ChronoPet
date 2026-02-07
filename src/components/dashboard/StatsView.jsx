import React from "react";
import { Clock, TrendingUp, Image as ImageIcon, Tag as TagIcon } from "lucide-react";
import FilterButton from "./FilterButton";

// Helper components assuming they are available or simple enough to inline
// If FilterButton is complex, it should be imported. I see FilterButton import in DashboardPage.
// I will assume FilterButton is available in ./FilterButton (since I will move it or export it)
// Wait, FilterButton is already in `src/components/dashboard/FilterButton` based on lines 39 of DashboardPage.
// So I can import it from "./FilterButton".

export default function StatsView({
  stats,
  view,
  timeFilter,
  handleFilterClick,
  hasDateRange,
  accent,
  settings,
  defaultTags,
}) {
  if (view !== "stats") return null;

  return (
    <div style={{ width: "100%", margin: "0 auto", paddingBottom: 40, userSelect: "text" }}>
      {/* Filter Bar */}
      <div style={{ marginBottom: 24, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
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

      {/* Top Metrics Grid - Responsive */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Total Duration */}
        <div className="win11-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, opacity: 0.7 }}>
            <Clock size={16} />
            <span style={{ fontSize: "0.85rem" }}>专注总时长</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 600 }}>
            {(stats.totalDuration / 60).toFixed(1)}
            <span style={{ fontSize: "0.9rem", marginLeft: 4, fontWeight: 400, opacity: 0.6 }}>小时</span>
          </div>
        </div>

        {/* Card 2: Top Tag */}
        <div className="win11-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, opacity: 0.7 }}>
            <TagIcon size={16} />
            <span style={{ fontSize: "0.85rem" }}>最长投入</span>
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {Object.entries(stats.tagDurationStats).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"}
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 4 }}>
            {((Object.entries(stats.tagDurationStats).sort((a, b) => b[1] - a[1])[0]?.[1] || 0) / 60).toFixed(1)} 小时
          </div>
        </div>

        {/* Card 3: Peak Hour */}
        <div className="win11-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, opacity: 0.7 }}>
            <TrendingUp size={16} />
            <span style={{ fontSize: "0.85rem" }}>高峰时段</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 600 }}>{stats.peakHour}:00</div>
        </div>

        {/* Card 4: Record Count */}
        <div className="win11-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, opacity: 0.7 }}>
            <ImageIcon size={16} />
            <span style={{ fontSize: "0.85rem" }}>记录次数</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 600 }}>{stats.totalRecords}</div>
        </div>
      </div>

      {/* Main Charts Area - Responsive */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
        {/* Left: Tag Distribution */}
        <div className="win11-card" style={{ padding: 24, minHeight: 300 }}>
          <h3 className="title" style={{ marginBottom: 20, fontSize: "1rem" }}>
            分类投入分布
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(stats.tagDurationStats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([tag, duration]) => {
                const percentage = ((duration / (stats.totalDuration || 1)) * 100).toFixed(0);
                const tagColor = (settings.tags || defaultTags).find((t) => t.name === tag)?.color || accent;

                return (
                  <div key={tag} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 80,
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tag}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        background: "var(--bg-active)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${percentage}%`,
                          background: tagColor,
                          borderRadius: 4,
                          transition: "width 0.5s ease-out",
                        }}
                      />
                    </div>
                    <div style={{ width: 60, fontSize: "0.8rem", textAlign: "right", opacity: 0.7 }}>
                      {Math.round(duration)}m
                    </div>
                  </div>
                );
              })}
            {Object.keys(stats.tagDurationStats).length === 0 && (
              <div style={{ textAlign: "center", opacity: 0.5, marginTop: 40 }}>暂无数据</div>
            )}
          </div>
        </div>

        {/* Right: Hourly Activity */}
        <div className="win11-card" style={{ padding: 24, minHeight: 300, display: "flex", flexDirection: "column" }}>
          <h3 className="title" style={{ marginBottom: 20, fontSize: "1rem" }}>
            24小时分布
          </h3>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 4 }}>
            {Array.from({ length: 24 }, (_, i) => {
              const count = stats.tasksByHour[i] || 0;
              const maxCount = Math.max(...Object.values(stats.tasksByHour), 1);
              const heightPercent = (count / maxCount) * 100;

              return (
                <div
                  key={i}
                  className="bar-tooltip-trigger"
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    height: "100%",
                  }}
                  title={`${i}:00 - ${count}条记录`}
                >
                  <div
                    style={{
                      width: "80%",
                      height: `${heightPercent}%`,
                      background:
                        count > 0 ?
                          "linear-gradient(to top, var(--accent) 0%, rgba(124, 58, 237, 0.4) 100%)"
                        : "transparent",
                      borderRadius: "2px 2px 0 0",
                      transition: "all 0.3s",
                      minHeight: count > 0 ? 4 : 0,
                      borderBottom: "1px solid var(--border-color)",
                      opacity: 0.8,
                    }}
                  />
                  {i % 4 === 0 && (
                    <div style={{ position: "absolute", bottom: -20, fontSize: "0.7rem", opacity: 0.5 }}>{i}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
