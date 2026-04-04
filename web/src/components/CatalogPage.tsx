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

  useEffect(() => {
    fetchJson<Tag[]>("/motorcycles/tags/all").then(setTags);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    // 単一選択カテゴリのタグはAND（tag_ids）、複数選択カテゴリはOR（or_tag_ids）
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
        // 単一選択モードの場合、同一カテゴリの他のタグを解除
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
        // 単一選択に切替時、カテゴリ内で2つ以上選択されていたら最後の1つだけ残す
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <div
                  onClick={() => toggleCollapse(cat)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectionMode(cat);
                  }}
                  title={singleSelectCats.has(cat) ? "単一選択モード（クリックで複数選択に切替）" : "複数選択モード（クリックで単一選択に切替）"}
                  style={{
                    fontSize: 10,
                    padding: "1px 8px",
                    borderRadius: 10,
                    border: "1px solid #bbb",
                    background: singleSelectCats.has(cat) ? "#f5f5f5" : "#e3f2fd",
                    color: singleSelectCats.has(cat) ? "#777" : "#1565c0",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {singleSelectCats.has(cat) ? "単一" : "複数"}
                </button>
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
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {bikes.map((bike) => (
          <div
            key={bike.id}
            className="bike-card"
            style={{
              borderRadius: 12,
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
            }}
          >
            {bike.image_url && (
              <div style={{ width: "100%", height: 180, overflow: "hidden", background: "#f0f0f0" }}>
                <img
                  src={bike.image_url}
                  alt={bike.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <div style={{ padding: "16px 20px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{bike.name}</h3>
                {bike.year && <span style={{ fontSize: 12, color: "#888" }}>{bike.year}年</span>}
              </div>
              <div style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
                {bike.maker}{bike.displacement ? ` / ${bike.displacement}cc` : ""}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px 16px",
                  fontSize: 12,
                  marginBottom: 12,
                  padding: "10px 12px",
                  background: "#f8f9fa",
                  borderRadius: 8,
                }}
              >
                {bike.max_power != null && (
                  <div>
                    <span style={{ color: "#999", fontSize: 10 }}>最高出力</span>
                    <div style={{ fontWeight: 600, color: "#333" }}>{bike.max_power} PS</div>
                  </div>
                )}
                {bike.max_torque != null && (
                  <div>
                    <span style={{ color: "#999", fontSize: 10 }}>最大トルク</span>
                    <div style={{ fontWeight: 600, color: "#333" }}>{bike.max_torque} N·m</div>
                  </div>
                )}
                {bike.seat_height != null && (
                  <div>
                    <span style={{ color: "#999", fontSize: 10 }}>シート高</span>
                    <div style={{ fontWeight: 600, color: "#333" }}>{bike.seat_height} mm</div>
                  </div>
                )}
                {bike.displacement != null && (
                  <div>
                    <span style={{ color: "#999", fontSize: 10 }}>排気量</span>
                    <div style={{ fontWeight: 600, color: "#333" }}>{bike.displacement} cc</div>
                  </div>
                )}
              </div>
              {bike.description && (
                <p style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: "0 0 12px",
                  color: "#555",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {bike.description}
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {bike.tags.map((t) => (
                  <span
                    key={t.id}
                    style={{
                      display: "inline-block",
                      fontSize: 10,
                      background: "#e8eaf6",
                      color: "#3949ab",
                      borderRadius: 10,
                      padding: "3px 10px",
                      fontWeight: 500,
                    }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        {bikes.length === 0 && (
          <p style={{ color: "#999", gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
            該当するバイクがありません
          </p>
        )}
      </div>
    </div>
  );
}
