import { useEffect, useState } from "react";
import { fetchJson } from "../api/client";
import type { Motorcycle, Tag } from "../types";

export default function CatalogPage() {
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchJson<Tag[]>("/motorcycles/tags/all").then(setTags);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    selectedTags.forEach((id) => params.append("tag_ids", String(id)));
    fetchJson<Motorcycle[]>(`/motorcycles?${params}`).then(setBikes);
  }, [selectedTags, searchQuery]);

  const toggleTag = (id: number) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const categories = [...new Set(tags.map((t) => t.category))];
  const categoryLabel: Record<string, string> = {
    maker: "メーカー",
    type: "車種タイプ",
    displacement: "排気量",
    feature: "特徴",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28 }}>バイク図鑑</h1>
        <p style={{ color: "#666", margin: 0 }}>
          タグで絞り込んでお気に入りの一台を見つけよう
        </p>
      </header>

      <input
        type="text"
        placeholder="車名で検索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          padding: "8px 16px",
          fontSize: 16,
          width: 320,
          marginBottom: 20,
          borderRadius: 6,
          border: "1px solid #ccc",
        }}
      />

      <div style={{ marginBottom: 24 }}>
        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: 10 }}>
            <strong style={{ marginRight: 8, fontSize: 14 }}>
              {categoryLabel[cat] ?? cat}:
            </strong>
            {tags
              .filter((t) => t.category === cat)
              .map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    margin: 2,
                    padding: "4px 14px",
                    borderRadius: 16,
                    border: selectedTags.has(tag.id)
                      ? "1px solid #1565c0"
                      : "1px solid #bbb",
                    background: selectedTags.has(tag.id) ? "#1976d2" : "#fff",
                    color: selectedTags.has(tag.id) ? "#fff" : "#333",
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "all 0.15s",
                  }}
                >
                  {tag.name}
                </button>
              ))}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
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
            <h3 style={{ margin: "0 0 4px" }}>{bike.name}</h3>
            <div style={{ color: "#666", fontSize: 14, marginBottom: 8 }}>
              {bike.maker} / {bike.displacement}cc / {bike.year}年
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 10px" }}>
              {bike.description}
            </p>
            <div>
              {bike.tags.map((t) => (
                <span
                  key={t.id}
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    background: "#e8eaf6",
                    color: "#3949ab",
                    borderRadius: 12,
                    padding: "2px 10px",
                    margin: 2,
                  }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        ))}
        {bikes.length === 0 && (
          <p style={{ color: "#999" }}>該当するバイクがありません</p>
        )}
      </div>
    </div>
  );
}
