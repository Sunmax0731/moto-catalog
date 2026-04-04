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
  const [searchQuery, setSearchQuery] = useState("");
  const [ranges, setRanges] = useState<Record<string, RangeFilter>>({
    displacement: { min: "", max: "" },
    power: { min: "", max: "" },
    torque: { min: "", max: "" },
    seat_height: { min: "", max: "" },
  });
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchJson<Tag[]>("/motorcycles/tags/all").then(setTags);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    selectedTags.forEach((id) => params.append("tag_ids", String(id)));
    for (const field of RANGE_FIELDS) {
      const r = ranges[field.key];
      if (r.min) params.set(field.paramMin, r.min);
      if (r.max) params.set(field.paramMax, r.max);
    }
    fetchJson<Motorcycle[]>(`/motorcycles?${params}`).then(setBikes);
  }, [selectedTags, searchQuery, ranges]);

  const toggleTag = (id: number) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateRange = (key: string, side: "min" | "max", value: string) => {
    setRanges((prev) => ({
      ...prev,
      [key]: { ...prev[key], [side]: value },
    }));
  };

  const toggleCollapse = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const clearAll = () => {
    setSelectedTags(new Set());
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

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28 }}>バイク図鑑</h1>
        <p style={{ color: "#666", margin: 0 }}>
          タグやスペックで絞り込んでお気に入りの一台を見つけよう
        </p>
      </header>

      {/* 検索バー + クリアボタン */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <input
          type="text"
          placeholder="車名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "8px 16px",
            fontSize: 15,
            width: 320,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        {hasFilters && (
          <button
            onClick={clearAll}
            style={{
              padding: "8px 16px",
              background: "#e53935",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            条件クリア
          </button>
        )}
        <span style={{ color: "#888", fontSize: 13, marginLeft: 8 }}>
          {bikes.length}件 ヒット
        </span>
      </div>

      {/* フィルタパネル */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        {/* レンジフィルタ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid #eee",
          }}
        >
          {RANGE_FIELDS.map((field) => (
            <div key={field.key}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>
                {field.label}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <input
                  type="number"
                  placeholder="最小"
                  value={ranges[field.key].min}
                  onChange={(e) => updateRange(field.key, "min", e.target.value)}
                  style={{
                    width: 90,
                    padding: "5px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 13,
                  }}
                />
                <span style={{ color: "#999" }}>〜</span>
                <input
                  type="number"
                  placeholder="最大"
                  value={ranges[field.key].max}
                  onChange={(e) => updateRange(field.key, "max", e.target.value)}
                  style={{
                    width: 90,
                    padding: "5px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 13,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* タグフィルタ */}
        {sortedCategories.map((cat) => {
          const isCollapsed = collapsedCats.has(cat);
          const catTags = tags.filter((t) => t.category === cat);
          const selectedCount = catTags.filter((t) => selectedTags.has(t.id)).length;
          return (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div
                onClick={() => toggleCollapse(cat)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 11, color: "#999" }}>
                  {isCollapsed ? "+" : "-"}
                </span>
                <strong style={{ fontSize: 13 }}>
                  {CATEGORY_LABEL[cat] ?? cat}
                </strong>
                {selectedCount > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      background: "#1976d2",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "1px 7px",
                    }}
                  >
                    {selectedCount}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div style={{ paddingLeft: 18 }}>
                  {catTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        margin: 2,
                        padding: "3px 12px",
                        borderRadius: 14,
                        border: selectedTags.has(tag.id)
                          ? "1px solid #1565c0"
                          : "1px solid #bbb",
                        background: selectedTags.has(tag.id) ? "#1976d2" : "#fff",
                        color: selectedTags.has(tag.id) ? "#fff" : "#333",
                        cursor: "pointer",
                        fontSize: 12,
                        transition: "all 0.15s",
                      }}
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

      {/* カード一覧 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
        }}
      >
        {bikes.map((bike) => (
          <div
            key={bike.id}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              padding: 20,
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <h3 style={{ margin: "0 0 4px", fontSize: 17 }}>{bike.name}</h3>
            <div style={{ color: "#666", fontSize: 13, marginBottom: 6 }}>
              {bike.maker} / {bike.displacement}cc / {bike.year}年
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2px 12px",
                fontSize: 12,
                color: "#555",
                marginBottom: 8,
              }}
            >
              {bike.max_power != null && <span>出力: {bike.max_power} PS</span>}
              {bike.max_torque != null && <span>トルク: {bike.max_torque} N·m</span>}
              {bike.seat_height != null && <span>シート高: {bike.seat_height} mm</span>}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 10px", color: "#444" }}>
              {bike.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {bike.tags.map((t) => (
                <span
                  key={t.id}
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    background: "#e8eaf6",
                    color: "#3949ab",
                    borderRadius: 10,
                    padding: "2px 8px",
                  }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        ))}
        {bikes.length === 0 && (
          <p style={{ color: "#999", gridColumn: "1 / -1" }}>
            該当するバイクがありません
          </p>
        )}
      </div>
    </div>
  );
}
