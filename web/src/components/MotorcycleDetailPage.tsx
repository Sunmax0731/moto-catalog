import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { fetchJson } from "../api/client";
import type { Motorcycle, PaginatedResponse, Tag } from "../types";

const DETAIL_LICENSE_OPTIONS = [
  { label: "原付（〜50cc）", value: "gentsuki" },
  { label: "小型限定普通二輪（〜125cc）", value: "kogata" },
  { label: "普通自動二輪（〜400cc）", value: "futsu" },
  { label: "大型自動二輪（全排気量）", value: "ogata" },
] as const;

const DETAIL_INSPECTION_OPTIONS = [
  { label: "車検なし（〜250cc）", value: "none" },
  { label: "車検あり（251cc〜）", value: "required" },
] as const;

const DETAIL_STATUS_OPTIONS = [
  { label: "現行モデル", value: "current" },
  { label: "生産終了", value: "discontinued" },
] as const;

const DETAIL_RANGE_FIELDS = [
  { key: "d", min: "dmin", max: "dmax", label: "排気量 (cc)" },
  { key: "y", min: "ymin", max: "ymax", label: "年式" },
  { key: "p", min: "pmin", max: "pmax", label: "最高出力 (PS)" },
  { key: "t", min: "tmin", max: "tmax", label: "最大トルク (N·m)" },
  { key: "sh", min: "shmin", max: "shmax", label: "シート高 (mm)" },
] as const;

function getGoogleImageSearchUrl(bike: Pick<Motorcycle, "maker" | "name">) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${bike.maker} ${bike.name} バイク`)}`;
}

function getUsedMarketAvailability(status: string | null, year: number | null) {
  if (status !== "discontinued") {
    return { label: "新車流通中心", tone: "market-current" };
  }
  if (year != null && year >= 2015) {
    return { label: "中古流通 多め", tone: "market-high" };
  }
  if (year != null && year >= 2000) {
    return { label: "中古流通 ふつう", tone: "market-medium" };
  }
  return { label: "中古流通 少なめ", tone: "market-low" };
}

function scoreSimilarity(base: Motorcycle, candidate: Motorcycle) {
  const baseTagIds = new Set(base.tags.map((tag) => tag.id));
  const sharedTags = candidate.tags.filter((tag) => baseTagIds.has(tag.id));
  let score = sharedTags.length * 3;

  if (base.maker === candidate.maker) score += 2;
  if (base.displacement != null && candidate.displacement != null) {
    score += Math.max(0, 3 - Math.abs(base.displacement - candidate.displacement) / 200);
  }
  if (base.seat_height != null && candidate.seat_height != null) {
    score += Math.max(0, 2 - Math.abs(base.seat_height - candidate.seat_height) / 60);
  }
  if (base.year != null && candidate.year != null) {
    score += Math.max(0, 1 - Math.abs(base.year - candidate.year) / 10);
  }

  return { score, sharedTags };
}

function formatValue(value: number | string | null | undefined, suffix = "") {
  if (value == null || value === "") return "—";
  return `${value}${suffix}`;
}

function getOptionLabel(
  options: readonly { label: string; value: string }[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getSearchContextLabels(search: string, tags: Tag[]) {
  const params = new URLSearchParams(search);
  const labels: string[] = [];

  const searchQuery = params.get("q");
  if (searchQuery) {
    labels.push(`検索: ${searchQuery}`);
  }

  const tagIds = params.get("tags")?.split(",").map(Number).filter((id) => Number.isFinite(id)) ?? [];
  tagIds.forEach((tagId) => {
    const tag = tags.find((item) => item.id === tagId);
    if (tag) {
      labels.push(`タグ: ${tag.name}`);
    }
  });

  const licenseClass = params.get("license");
  if (licenseClass) {
    labels.push(`免許: ${getOptionLabel(DETAIL_LICENSE_OPTIONS, licenseClass)}`);
  }

  const inspection = params.get("inspection");
  if (inspection) {
    labels.push(`車検: ${getOptionLabel(DETAIL_INSPECTION_OPTIONS, inspection)}`);
  }

  const statusFilter = params.get("status");
  if (statusFilter) {
    labels.push(`ステータス: ${getOptionLabel(DETAIL_STATUS_OPTIONS, statusFilter)}`);
  }

  DETAIL_RANGE_FIELDS.forEach((field) => {
    const min = params.get(field.min);
    const max = params.get(field.max);
    if (!min && !max) return;
    labels.push(`${field.label}: ${min || "下限なし"}〜${max || "上限なし"}`);
  });

  return labels;
}

export default function MotorcycleDetailPage() {
  const { motorcycleId } = useParams();
  const location = useLocation();
  const [bike, setBike] = useState<Motorcycle | null>(null);
  const [similarBikes, setSimilarBikes] = useState<Array<{ bike: Motorcycle; sharedTags: Motorcycle["tags"] }>>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!motorcycleId) return;

    let cancelled = false;

    Promise.all([
      fetchJson<Motorcycle>(`/motorcycles/${motorcycleId}`),
      fetchJson<PaginatedResponse<Motorcycle>>("/motorcycles?limit=500"),
      fetchJson<Tag[]>("/motorcycles/tags/all"),
    ])
      .then(([currentBike, response, nextTags]) => {
        if (cancelled) return;

        const nextSimilar = response.items
          .filter((candidate) => candidate.id !== currentBike.id)
          .map((candidate) => ({
            bike: candidate,
            ...scoreSimilarity(currentBike, candidate),
          }))
          .filter((candidate) => candidate.score > 3)
          .sort((left, right) => right.score - left.score)
          .slice(0, 3)
          .map(({ bike: similarBike, sharedTags }) => ({ bike: similarBike, sharedTags }));

        setBike(currentBike);
        setSimilarBikes(nextSimilar);
        setAllTags(nextTags);
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setBike(null);
        setSimilarBikes([]);
        setAllTags([]);
        setError("車両詳細の読み込みに失敗しました。");
      });

    return () => {
      cancelled = true;
    };
  }, [motorcycleId]);

  const catalogReturnTo = location.search ? `/${location.search}` : "/";
  const searchContextLabels = getSearchContextLabels(location.search, allTags);

  if (!motorcycleId) {
    return (
      <div className="detail-page">
        <div className="detail-shell">
          <Link className="detail-back-btn" to={catalogReturnTo}>一覧へ戻る</Link>
          <p className="detail-message">車両IDが指定されていません。</p>
        </div>
      </div>
    );
  }

  const isLoading = error === "" && (bike == null || String(bike.id) !== motorcycleId);

  if (isLoading) {
    return (
      <div className="detail-page">
        <div className="detail-shell">
          <p className="detail-message">車両詳細を読み込み中です...</p>
        </div>
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="detail-page">
        <div className="detail-shell">
          <Link className="detail-back-btn" to={catalogReturnTo}>一覧へ戻る</Link>
          <p className="detail-message">{error || "車両が見つかりません。"}</p>
        </div>
      </div>
    );
  }

  const availability = getUsedMarketAvailability(bike.status, bike.year);

  return (
    <div className="detail-page">
      <div className="detail-shell">
        <div className="detail-toolbar">
          <Link className="detail-back-btn" to={catalogReturnTo}>結果一覧へ戻る</Link>
          <a
            className="detail-image-link"
            href={getGoogleImageSearchUrl(bike)}
            target="_blank"
            rel="noreferrer"
          >
            Google画像検索
          </a>
        </div>

        <section className="detail-context-card">
          <div className="detail-context-copy">
            <p className="detail-context-kicker">一覧の探索条件</p>
            <h2 className="detail-context-title">
              {searchContextLabels.length > 0 ? "この条件から見つけた車両です" : "一覧の流れを保ったまま詳細を見ています"}
            </h2>
            <p className="detail-context-description">
              {searchContextLabels.length > 0
                ? "結果一覧へ戻ると、同じ条件のまま他の候補も見比べられます。"
                : "絞り込み条件がない状態で一覧から開いています。結果一覧へ戻ってそのまま探し続けられます。"}
            </p>
          </div>
          {searchContextLabels.length > 0 ? (
            <div className="detail-context-tags">
              {searchContextLabels.map((label) => (
                <span key={label} className="card-tag">{label}</span>
              ))}
            </div>
          ) : (
            <p className="detail-context-empty">検索条件なし</p>
          )}
        </section>

        <section className="detail-hero">
          <div className="detail-hero-main">
            <p className="detail-kicker">{bike.maker}</p>
            <div className="detail-title-row">
              <h1 className="detail-title">{bike.name}</h1>
              {bike.status === "discontinued" && (
                <span className="status-badge status-discontinued">生産終了</span>
              )}
            </div>
            <p className="detail-meta">
              {formatValue(bike.displacement, "cc")}
              {bike.year != null ? ` / ${bike.year}年` : ""}
              {bike.model_code ? ` / ${bike.model_code}` : ""}
            </p>
            {bike.description && <p className="detail-description">{bike.description}</p>}
          </div>

          <div className="detail-spec-grid">
            <div className="detail-spec-card">
              <span className="detail-spec-label">流通目安</span>
              <strong className={`detail-spec-value market-availability ${availability.tone}`}>{availability.label}</strong>
            </div>
            <div className="detail-spec-card">
              <span className="detail-spec-label">最高出力</span>
              <strong className="detail-spec-value">{formatValue(bike.max_power, " PS")}</strong>
            </div>
            <div className="detail-spec-card">
              <span className="detail-spec-label">最大トルク</span>
              <strong className="detail-spec-value">{formatValue(bike.max_torque, " N·m")}</strong>
            </div>
            <div className="detail-spec-card">
              <span className="detail-spec-label">シート高</span>
              <strong className="detail-spec-value">{formatValue(bike.seat_height, " mm")}</strong>
            </div>
            <div className="detail-spec-card">
              <span className="detail-spec-label">車重</span>
              <strong className="detail-spec-value">{formatValue(bike.wet_weight, " kg")}</strong>
            </div>
            <div className="detail-spec-card">
              <span className="detail-spec-label">参考価格</span>
              <strong className="detail-spec-value">{formatValue(bike.price, "万円")}</strong>
            </div>
            <div className="detail-spec-card">
              <span className="detail-spec-label">燃費</span>
              <strong className="detail-spec-value">{formatValue(bike.fuel_economy, " km/L")}</strong>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <div className="detail-section-header">
            <h2 className="detail-section-title">特徴タグ</h2>
            <p className="detail-section-copy">車種タイプや用途をひと目で確認できます。</p>
          </div>
          <div className="detail-tag-list">
            {bike.tags.map((tag) => (
              <span key={tag.id} className="card-tag">{tag.name}</span>
            ))}
          </div>
        </section>

        <section className="detail-section" id="similar-bikes">
          <div className="detail-section-header">
            <h2 className="detail-section-title">似ているバイク</h2>
            <p className="detail-section-copy">共有タグと近いスペックから自動提案しています。</p>
          </div>
          <div className="similar-bike-grid">
            {similarBikes.length > 0 ? (
              similarBikes.map(({ bike: similarBike, sharedTags }) => (
                <Link
                  key={similarBike.id}
                  className="similar-bike-card"
                  to={`/motorcycles/${similarBike.id}${location.search}#similar-bikes`}
                >
                  <div className="similar-bike-header">
                    <strong>{similarBike.name}</strong>
                    <span>{similarBike.maker}</span>
                  </div>
                  <div className="similar-bike-meta">
                    <span>{formatValue(similarBike.displacement, "cc")}</span>
                    <span>{formatValue(similarBike.seat_height, " mm")}</span>
                    <span>{formatValue(similarBike.price, "万円")}</span>
                  </div>
                  <div className="similar-bike-tags">
                    {sharedTags.slice(0, 4).map((tag) => (
                      <span key={tag.id} className="card-tag">{tag.name}</span>
                    ))}
                  </div>
                </Link>
              ))
            ) : (
              <p className="detail-message">似ているバイク候補はまだ十分に見つかっていません。</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
