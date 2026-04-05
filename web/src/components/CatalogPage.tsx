import { useEffect, useState } from "react";
import { fetchJson } from "../api/client";
import type { Motorcycle, Tag, RangeFilter } from "../types";

const CATEGORY_LABEL: Record<string, string> = {
  maker: "メーカー",
  type: "車種タイプ",
  cooling: "冷却方式",
  suspension: "懸架方式",
  frame: "フレーム形状",
  engine_layout: "エンジン形状",
  cylinders: "気筒数",
  valves_per_cylinder: "バルブ数/気筒",
  fuel_system: "燃料供給",
  clutch: "クラッチ",
  drive: "駆動方式",
  abs: "ABS",
  start: "始動方式",
};

const CATEGORY_ORDER = [
  "maker", "type", "cooling", "engine_layout", "cylinders",
  "valves_per_cylinder", "fuel_system", "frame", "suspension",
  "clutch", "drive", "abs", "start",
];

const RANGE_FIELDS = [
  { key: "displacement", label: "排気量 (cc)", paramMin: "displacement_min", paramMax: "displacement_max" },
  { key: "power", label: "最高出力 (PS)", paramMin: "power_min", paramMax: "power_max" },
  { key: "torque", label: "最大トルク (N·m)", paramMin: "torque_min", paramMax: "torque_max" },
  { key: "seat_height", label: "シート高 (mm)", paramMin: "seat_height_min", paramMax: "seat_height_max" },
] as const;

export default function CatalogPage() {
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [singleSelectCats, setSingleSelectCats] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [ranges, setRanges] = useState<Record<string, RangeFilter>>({
    displacement: { min: "", max: "" },
    power: { min: "", max: "" },
    torque: { min: "", max: "" },
    seat_height: { min: "", max: "" },
  });
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetchJson<Tag[]>("/motorcycles/tags/all").then(setTags);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    selectedTags.forEach((id) => {
      const tag = tags.find((t) => t.id === id);
      if (tag && singleSelectCats.has(tag.category)) {
        params.append("tag_ids", String(id));
      } else {
        params.append("or_tag_ids", String(id));
      }
    });
    for (const field of RANGE_FIELDS) {
      const r = ranges[field.key];
      if (r.min) params.set(field.paramMin, r.min);
      if (r.max) params.set(field.paramMax, r.max);
    }
    fetchJson<Motorcycle[]>(`/motorcycles?${params}`).then(setBikes);
  }, [selectedTags, searchQuery, ranges, singleSelectCats, tags]);

  const toggleTag = (id: number) => {
    const tag = tags.find((t) => t.id === id);
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (tag && singleSelectCats.has(tag.category)) {
          tags
            .filter((t) => t.category === tag.category && t.id !== id)
            .forEach((t) => next.delete(t.id));
        }
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectionMode = (cat: string) => {
    setSingleSelectCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
        const catTagIds = tags.filter((t) => t.category === cat).map((t) => t.id);
        const selected = catTagIds.filter((id) => selectedTags.has(id));
        if (selected.length > 1) {
          setSelectedTags((prevTags) => {
            const nextTags = new Set(prevTags);
            selected.slice(0, -1).forEach((id) => nextTags.delete(id));
            return nextTags;
          });
        }
      }
      return next;
    });
  };

  const updateRange = (key: string, side: "min" | "max", value: string) => {
    setRanges((prev) => ({
      ...prev,
      [key]: { ...prev[key], [side]: value },
    }));
  };

  const toggleCompare = (id: number) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const compareBikes = compareIds.map((id) => bikes.find((b) => b.id === id)).filter(Boolean) as Motorcycle[];

  const toggleCollapse = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const clearAll = () => {
    setSelectedTags(new Set());
    setSingleSelectCats(new Set());
    setSearchQuery("");
    setRanges({
      displacement: { min: "", max: "" },
      power: { min: "", max: "" },
      torque: { min: "", max: "" },
      seat_height: { min: "", max: "" },
    });
  };

  const hasFilters =
    selectedTags.size > 0 ||
    searchQuery !== "" ||
    Object.values(ranges).some((r) => r.min || r.max);

  const sortedCategories = CATEGORY_ORDER.filter((cat) =>
    tags.some((t) => t.category === cat)
  );

  const sidebarContent = (
    <>
      <div className="filter-search">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="search-icon">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="車名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {hasFilters && (
        <button onClick={clearAll} className="btn-clear">
          条件クリア
        </button>
      )}

      <div className="filter-section">
        <h3 className="filter-section-title">スペックで絞り込み</h3>
        {RANGE_FIELDS.map((field) => (
          <div key={field.key} className="range-field">
            <label className="range-label">{field.label}</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="最小"
                value={ranges[field.key].min}
                onChange={(e) => updateRange(field.key, "min", e.target.value)}
                className="range-input"
              />
              <span className="range-separator">—</span>
              <input
                type="number"
                placeholder="最大"
                value={ranges[field.key].max}
                onChange={(e) => updateRange(field.key, "max", e.target.value)}
                className="range-input"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="filter-section">
        <h3 className="filter-section-title">タグで絞り込み</h3>
        {sortedCategories.map((cat) => {
          const isCollapsed = collapsedCats.has(cat);
          const catTags = tags.filter((t) => t.category === cat);
          const selectedCount = catTags.filter((t) => selectedTags.has(t.id)).length;
          return (
            <div key={cat} className="tag-category">
              <div className="tag-category-header">
                <div
                  onClick={() => toggleCollapse(cat)}
                  className="tag-category-label"
                >
                  <svg
                    width="12" height="12" viewBox="0 0 12 12"
                    className="chevron-icon"
                    style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)" }}
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <span className="tag-category-name">
                    {CATEGORY_LABEL[cat] ?? cat}
                  </span>
                  {selectedCount > 0 && (
                    <span className="tag-count-badge">{selectedCount}</span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectionMode(cat);
                  }}
                  className={`mode-toggle ${singleSelectCats.has(cat) ? "mode-single" : "mode-multi"}`}
                  title={singleSelectCats.has(cat) ? "単一選択モード" : "複数選択モード"}
                >
                  {singleSelectCats.has(cat) ? "単一" : "複数"}
                </button>
              </div>
              {!isCollapsed && (
                <div className="tag-list">
                  {catTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`tag-btn ${selectedTags.has(tag.id) ? "tag-btn-active" : ""}`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-content">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="フィルタを開く"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div>
            <h1 className="app-title">バイク図鑑</h1>
            <p className="app-subtitle">
              タグやスペックで絞り込んでお気に入りの一台を見つけよう
            </p>
          </div>
          <span className="result-count">{bikes.length}件</span>
        </div>
      </header>

      <div className="content-layout">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
          {sidebarContent}
        </aside>

        <main className="main-content">
          <div className="card-grid">
            {bikes.map((bike) => (
              <div key={bike.id} className="bike-card">
                {bike.image_url && (
                  <div className="card-image">
                    <img src={bike.image_url} alt={bike.name} />
                  </div>
                )}
                <div className="card-body">
                  <div className="card-header-row">
                    <h3 className="card-title">{bike.name}</h3>
                    {bike.year && <span className="card-year">{bike.year}年</span>}
                  </div>
                  <div className="card-maker">
                    {bike.maker}{bike.displacement ? ` / ${bike.displacement}cc` : ""}
                  </div>
                  <div className="card-specs">
                    {bike.max_power != null && (
                      <div className="spec-item">
                        <span className="spec-label">最高出力</span>
                        <span className="spec-value">{bike.max_power} PS</span>
                      </div>
                    )}
                    {bike.max_torque != null && (
                      <div className="spec-item">
                        <span className="spec-label">最大トルク</span>
                        <span className="spec-value">{bike.max_torque} N·m</span>
                      </div>
                    )}
                    {bike.seat_height != null && (
                      <div className="spec-item">
                        <span className="spec-label">シート高</span>
                        <span className="spec-value">{bike.seat_height} mm</span>
                      </div>
                    )}
                    {bike.displacement != null && (
                      <div className="spec-item">
                        <span className="spec-label">排気量</span>
                        <span className="spec-value">{bike.displacement} cc</span>
                      </div>
                    )}
                  </div>
                  {bike.description && (
                    <p className="card-description">{bike.description}</p>
                  )}
                  <div className="card-tags">
                    {bike.tags.map((t) => (
                      <span key={t.id} className="card-tag">{t.name}</span>
                    ))}
                  </div>
                  <button
                    className={`compare-btn ${compareIds.includes(bike.id) ? "compare-btn-active" : ""}`}
                    onClick={() => toggleCompare(bike.id)}
                    disabled={!compareIds.includes(bike.id) && compareIds.length >= 3}
                  >
                    {compareIds.includes(bike.id) ? "比較から外す" : "比較に追加"}
                  </button>
                </div>
              </div>
            ))}
            {bikes.length === 0 && (
              <p className="no-results">該当するバイクがありません</p>
            )}
          </div>
        </main>
      </div>

      {compareIds.length > 0 && !showCompare && (
        <div className="compare-tray">
          <div className="compare-tray-content">
            <span className="compare-tray-label">比較: {compareIds.length}台選択中</span>
            <div className="compare-tray-bikes">
              {compareBikes.map((b) => (
                <span key={b.id} className="compare-tray-chip">
                  {b.name}
                  <button className="compare-chip-remove" onClick={() => toggleCompare(b.id)}>&times;</button>
                </span>
              ))}
            </div>
            <button
              className="compare-tray-open"
              onClick={() => setShowCompare(true)}
              disabled={compareIds.length < 2}
            >
              比較する
            </button>
          </div>
        </div>
      )}

      {showCompare && (
        <div className="compare-overlay" onClick={() => setShowCompare(false)}>
          <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
            <div className="compare-modal-header">
              <h2>スペック比較</h2>
              <button className="compare-modal-close" onClick={() => setShowCompare(false)}>&times;</button>
            </div>
            <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th></th>
                    {compareBikes.map((b) => (
                      <th key={b.id}>{b.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["メーカー", (b: Motorcycle) => b.maker],
                    ["排気量", (b: Motorcycle) => b.displacement ? `${b.displacement}cc` : "-"],
                    ["年式", (b: Motorcycle) => b.year ? `${b.year}年` : "-"],
                    ["最高出力", (b: Motorcycle) => b.max_power != null ? `${b.max_power} PS` : "-"],
                    ["最大トルク", (b: Motorcycle) => b.max_torque != null ? `${b.max_torque} N·m` : "-"],
                    ["シート高", (b: Motorcycle) => b.seat_height != null ? `${b.seat_height} mm` : "-"],
                  ] as [string, (b: Motorcycle) => string][]).map(([label, fn]) => {
                    const vals = compareBikes.map(fn);
                    const allSame = vals.every((v) => v === vals[0]);
                    return (
                      <tr key={label}>
                        <td className="compare-label">{label}</td>
                        {vals.map((v, i) => (
                          <td key={i} className={!allSame ? "compare-diff" : ""}>{v}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
