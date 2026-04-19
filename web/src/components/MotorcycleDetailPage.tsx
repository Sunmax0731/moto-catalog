import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchJson } from "../api/client";
import type { Motorcycle, PaginatedResponse } from "../types";

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

export default function MotorcycleDetailPage() {
  const { motorcycleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [bike, setBike] = useState<Motorcycle | null>(null);
  const [similarBikes, setSimilarBikes] = useState<Array<{ bike: Motorcycle; sharedTags: Motorcycle["tags"] }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!motorcycleId) return;

    let cancelled = false;

    Promise.all([
      fetchJson<Motorcycle>(`/motorcycles/${motorcycleId}`),
      fetchJson<PaginatedResponse<Motorcycle>>("/motorcycles?limit=500"),
    ])
      .then(([currentBike, response]) => {
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
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setBike(null);
        setSimilarBikes([]);
        setError("車両詳細の読み込みに失敗しました。");
      });

    return () => {
      cancelled = true;
    };
  }, [motorcycleId]);

  if (!motorcycleId) {
    return (
      <div className="detail-page">
        <div className="detail-shell">
          <button type="button" className="detail-back-btn" onClick={() => navigate("/")}>
            一覧へ戻る
          </button>
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
          <button type="button" className="detail-back-btn" onClick={() => navigate("/")}>
            一覧へ戻る
          </button>
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
          <button type="button" className="detail-back-btn" onClick={() => navigate(-1)}>
            一覧へ戻る
          </button>
          <a
            className="detail-image-link"
            href={getGoogleImageSearchUrl(bike)}
            target="_blank"
            rel="noreferrer"
          >
            Google画像検索
          </a>
        </div>

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
