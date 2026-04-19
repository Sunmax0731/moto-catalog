import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchJson } from "../api/client";
import { getCategoryHelp } from "../categoryHelp";
import { getNoDataTagLabel, getPaginationItems, groupMakerTags } from "../catalogMeta";
import type { Motorcycle, Tag, RangeFilter, PaginatedResponse } from "../types";

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
  transmission: "ミッション",
  clutch: "クラッチ",
  drive: "駆動方式",
  abs: "ABS",
  start: "始動方式",
  riding_position: "ライディングポジション",
  traction_control: "トラクションコントロール",
  riding_mode: "ライディングモード",
  quickshifter: "クイックシフター",
  meter_type: "メーター",
  usage: "用途・シーン",
  luggage: "積載性",
};

const CATEGORY_ORDER = [
  "maker", "type", "usage", "luggage", "riding_position", "transmission", "cooling",
  "engine_layout", "cylinders", "valves_per_cylinder", "fuel_system",
  "frame", "suspension", "clutch", "drive", "abs", "start",
  "traction_control", "riding_mode", "quickshifter", "meter_type",
];

const BIKE_SILHOUETTE_URL = `${import.meta.env.BASE_URL}bike-silhouette.svg`;
const NO_DATA_TAG_LABEL = getNoDataTagLabel();

function getRunningCostInfo(displacement: number | null, fuelEconomy: number | null) {
  if (displacement == null) return null;
  const needsInspection = displacement > 250;
  const insuranceClass = displacement <= 125 ? "原付・小型" : displacement <= 250 ? "軽二輪" : "小型二輪";
  const inspectionCost = needsInspection ? "約5〜7万円/2年" : "不要";
  return { needsInspection, insuranceClass, inspectionCost, fuelEconomy };
}

function getFootReach(heightCm: number, seatHeightMm: number): string {
  const inseam = heightCm * 0.45 * 10; // mm
  const diff = inseam - seatHeightMm;
  if (diff >= 50) return "両足べったり";
  if (diff >= 0) return "両足つま先";
  if (diff >= -30) return "片足つま先";
  return "厳しい";
}

function getPowerToWeight(maxPower: number, wetWeight: number, riderWeight: number): string {
  return (maxPower / (wetWeight + riderWeight)).toFixed(3);
}

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

function loadFavorites(): Set<number> {
  try {
    const saved = localStorage.getItem("moto-catalog-favorites");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch { return new Set(); }
}

function saveFavorites(ids: Set<number>) {
  localStorage.setItem("moto-catalog-favorites", JSON.stringify([...ids]));
}

const RANGE_FIELDS = [
  { key: "displacement", label: "排気量 (cc)", paramMin: "displacement_min", paramMax: "displacement_max" },
  { key: "year", label: "年式", paramMin: "year_min", paramMax: "year_max" },
  { key: "power", label: "最高出力 (PS)", paramMin: "power_min", paramMax: "power_max" },
  { key: "torque", label: "最大トルク (N·m)", paramMin: "torque_min", paramMax: "torque_max" },
  { key: "seat_height", label: "シート高 (mm)", paramMin: "seat_height_min", paramMax: "seat_height_max" },
] as const;

type RangeKey = (typeof RANGE_FIELDS)[number]["key"];

const LICENSE_OPTIONS = [
  { label: "指定なし", value: "" },
  { label: "原付（〜50cc）", value: "gentsuki" },
  { label: "小型限定普通二輪（〜125cc）", value: "kogata" },
  { label: "普通自動二輪（〜400cc）", value: "futsu" },
  { label: "大型自動二輪（全排気量）", value: "ogata" },
] as const;

const INSPECTION_OPTIONS = [
  { label: "指定なし", value: "" },
  { label: "車検なし（〜250cc）", value: "none" },
  { label: "車検あり（251cc〜）", value: "required" },
] as const;

const SORT_OPTIONS = [
  { label: "デフォルト", value: "" },
  { label: "排気量（小→大）", value: "displacement_asc" },
  { label: "排気量（大→小）", value: "displacement_desc" },
  { label: "馬力（小→大）", value: "power_asc" },
  { label: "馬力（大→小）", value: "power_desc" },
  { label: "シート高（低→高）", value: "seat_height_asc" },
  { label: "シート高（高→低）", value: "seat_height_desc" },
  { label: "重量（軽→重）", value: "weight_asc" },
  { label: "重量（重→軽）", value: "weight_desc" },
  { label: "価格（安→高）", value: "price_asc" },
  { label: "価格（高→安）", value: "price_desc" },
] as const;

const STATUS_OPTIONS = [
  { label: "すべて", value: "" },
  { label: "現行モデル", value: "current" },
  { label: "生産終了", value: "discontinued" },
] as const;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

type PresetFilter = {
  id: string;
  label: string;
  description: string;
  licenseClass?: string;
  sortKey?: string;
  ranges: Partial<Record<RangeKey, RangeFilter>>;
};

const PRESET_FILTERS: PresetFilter[] = [
  {
    id: "beginner",
    label: "初心者向け",
    description: "400cc以下・シート高低めで探す",
    licenseClass: "futsu",
    sortKey: "seat_height_asc",
    ranges: {
      displacement: { min: "", max: "400" },
      seat_height: { min: "", max: "800" },
    },
  },
  {
    id: "footreach",
    label: "足つき重視",
    description: "シート高が低いモデルを優先",
    sortKey: "seat_height_asc",
    ranges: {
      seat_height: { min: "", max: "780" },
    },
  },
  {
    id: "lightweight",
    label: "低排気量",
    description: "250cc以下を中心に比較する",
    sortKey: "displacement_asc",
    ranges: {
      displacement: { min: "", max: "250" },
    },
  },
] as const;

function getOptionLabel(options: readonly { label: string; value: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function createEmptyRanges(): Record<RangeKey, RangeFilter> {
  return {
    displacement: { min: "", max: "" },
    year: { min: "", max: "" },
    power: { min: "", max: "" },
    torque: { min: "", max: "" },
    seat_height: { min: "", max: "" },
  };
}

function parseUrlState(search: string) {
  const p = new URLSearchParams(search);
  const pageParam = Number(p.get("page") || "1");
  const pageSizeParam = Number(p.get("page_size") || String(DEFAULT_PAGE_SIZE));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeParam as (typeof PAGE_SIZE_OPTIONS)[number])
    ? pageSizeParam
    : DEFAULT_PAGE_SIZE;
  return {
    page,
    pageSize,
    q: p.get("q") || "",
    tags: p.get("tags") ? p.get("tags")!.split(",").map(Number) : [],
    licenseClass: p.get("license") || "",
    inspection: p.get("inspection") || "",
    sortKey: p.get("sort") || "",
    statusFilter: p.get("status") || "",
    ranges: {
      displacement: { min: p.get("dmin") || "", max: p.get("dmax") || "" },
      year: { min: p.get("ymin") || "", max: p.get("ymax") || "" },
      power: { min: p.get("pmin") || "", max: p.get("pmax") || "" },
      torque: { min: p.get("tmin") || "", max: p.get("tmax") || "" },
      seat_height: { min: p.get("shmin") || "", max: p.get("shmax") || "" },
    },
  };
}

export default function CatalogPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [initialState] = useState(() => parseUrlState(location.search));
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialState.page);
  const [pageSize, setPageSize] = useState(initialState.pageSize);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set(initialState.tags));
  const [singleSelectCats, setSingleSelectCats] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState(initialState.q);
  const [licenseClass, setLicenseClass] = useState(initialState.licenseClass);
  const [inspection, setInspection] = useState(initialState.inspection);
  const [sortKey, setSortKey] = useState(initialState.sortKey);
  const [statusFilter, setStatusFilter] = useState(initialState.statusFilter);
  const [favorites, setFavorites] = useState<Set<number>>(loadFavorites);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [userHeight, setUserHeight] = useState("");
  const [userWeight, setUserWeight] = useState("");
  const [ranges, setRanges] = useState<Record<string, RangeFilter>>(initialState.ranges);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compareBikes, setCompareBikes] = useState<Motorcycle[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [helpCategory, setHelpCategory] = useState<string | null>(null);
  const [pendingScrollRestore] = useState<number | null>(() => {
    const saved = sessionStorage.getItem("moto-catalog-scroll");
    if (!saved) return null;
    const parsed = Number(saved);
    return Number.isFinite(parsed) ? parsed : null;
  });
  const helpButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const helpCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const sidebarSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const hasRestoredScrollRef = useRef(false);

  useEffect(() => {
    fetchJson<Tag[]>("/motorcycles/tags/all").then(setTags);
  }, []);

  useEffect(() => {
    const saveScrollPosition = () => {
      sessionStorage.setItem("moto-catalog-scroll", String(window.scrollY));
    };
    window.addEventListener("pagehide", saveScrollPosition);
    return () => window.removeEventListener("pagehide", saveScrollPosition);
  }, []);

  useEffect(() => {
    if (hasRestoredScrollRef.current || pendingScrollRestore == null || bikes.length === 0) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: pendingScrollRestore, behavior: "auto" });
    });
    sessionStorage.removeItem("moto-catalog-scroll");
    hasRestoredScrollRef.current = true;
  }, [pendingScrollRestore, bikes.length]);

  useEffect(() => {
    if (!helpCategory) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    helpCloseButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const activeCategory = helpCategory;
      setHelpCategory(null);
      window.setTimeout(() => {
        helpButtonRefs.current[activeCategory]?.focus();
      }, 0);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [helpCategory]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set("page_size", String(pageSize));
    if (searchQuery) p.set("q", searchQuery);
    if (selectedTags.size > 0) p.set("tags", [...selectedTags].join(","));
    if (licenseClass) p.set("license", licenseClass);
    if (inspection) p.set("inspection", inspection);
    if (sortKey) p.set("sort", sortKey);
    if (statusFilter) p.set("status", statusFilter);
    if (ranges.displacement.min) p.set("dmin", ranges.displacement.min);
    if (ranges.displacement.max) p.set("dmax", ranges.displacement.max);
    if (ranges.year.min) p.set("ymin", ranges.year.min);
    if (ranges.year.max) p.set("ymax", ranges.year.max);
    if (ranges.power.min) p.set("pmin", ranges.power.min);
    if (ranges.power.max) p.set("pmax", ranges.power.max);
    if (ranges.torque.min) p.set("tmin", ranges.torque.min);
    if (ranges.torque.max) p.set("tmax", ranges.torque.max);
    if (ranges.seat_height.min) p.set("shmin", ranges.seat_height.min);
    if (ranges.seat_height.max) p.set("shmax", ranges.seat_height.max);
    const nextSearch = p.toString();
    const currentSearch = location.search.startsWith("?") ? location.search.slice(1) : location.search;

    if (currentSearch === nextSearch) return;

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true }
    );
  }, [
    page,
    pageSize,
    searchQuery,
    selectedTags,
    licenseClass,
    inspection,
    sortKey,
    statusFilter,
    ranges,
    location.pathname,
    location.search,
    navigate,
  ]);

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
    if (licenseClass === "gentsuki") {
      params.set("displacement_max", "50");
    } else if (licenseClass === "kogata") {
      params.set("displacement_max", "125");
    } else if (licenseClass === "futsu") {
      params.set("displacement_max", "400");
    }
    if (inspection === "none") {
      params.set("displacement_max", "250");
    } else if (inspection === "required") {
      params.set("displacement_min", "251");
    }
    if (sortKey) params.set("sort", sortKey);
    if (statusFilter) params.set("status", statusFilter);
    params.set("limit", String(pageSize));
    params.set("offset", String((page - 1) * pageSize));
    fetchJson<PaginatedResponse<Motorcycle>>(`/motorcycles?${params}`).then((res) => {
      const totalPages = Math.max(1, Math.ceil(res.total / pageSize));
      if (page > totalPages) {
        setTotal(res.total);
        setPage(totalPages);
        return;
      }
      setBikes(res.items);
      setTotal(res.total);
    });
  }, [selectedTags, searchQuery, ranges, singleSelectCats, tags, licenseClass, inspection, sortKey, statusFilter, page, pageSize]);

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
    setPage(1);
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
    setPage(1);
  };

  const toggleCompare = (bike: Motorcycle) => {
    setCompareBikes((prev) => {
      const alreadySelected = prev.some((item) => item.id === bike.id);
      if (alreadySelected) {
        return prev.filter((item) => item.id !== bike.id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, bike];
    });
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveFavorites(next);
      return next;
    });
  };

  const scrollToSidebarSection = (sectionId: string) => {
    const scroll = () => {
      sidebarSectionRefs.current[sectionId]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };

    if (window.innerWidth <= 768) {
      setSidebarOpen(true);
      window.setTimeout(scroll, 120);
      return;
    }

    scroll();
  };

  const toggleCollapse = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const openHelp = (category: string) => {
    setHelpCategory(category);
  };

  const closeHelp = (category = helpCategory) => {
    setHelpCategory(null);
    if (!category) return;
    window.setTimeout(() => {
      helpButtonRefs.current[category]?.focus();
    }, 0);
  };

  const clearAll = () => {
    setSelectedTags(new Set());
    setSingleSelectCats(new Set());
    setSearchQuery("");
    setLicenseClass("");
    setInspection("");
    setSortKey("");
    setStatusFilter("");
    setShowFavoritesOnly(false);
    setRanges(createEmptyRanges());
    setPage(1);
  };

  const copyFilterUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyPreset = (preset: PresetFilter) => {
    const nextRanges = createEmptyRanges();
    (Object.keys(preset.ranges) as RangeKey[]).forEach((key) => {
      const value = preset.ranges[key];
      if (value) nextRanges[key] = value;
    });
    setSelectedTags(new Set());
    setSingleSelectCats(new Set());
    setSearchQuery("");
    setLicenseClass(preset.licenseClass ?? "");
    setInspection("");
    setSortKey(preset.sortKey ?? "");
    setStatusFilter("");
    setShowFavoritesOnly(false);
    setRanges(nextRanges);
    setPage(1);
  };

  const openBikeDetails = (bikeId: number) => {
    navigate(`/motorcycles/${bikeId}${location.search}`);
  };

  const hasFilters =
    selectedTags.size > 0 ||
    searchQuery !== "" ||
    licenseClass !== "" ||
    inspection !== "" ||
    sortKey !== "" ||
    statusFilter !== "" ||
    showFavoritesOnly ||
    Object.values(ranges).some((r) => r.min || r.max);

  const sortedCategories = CATEGORY_ORDER.filter((cat) =>
    tags.some((t) => t.category === cat)
  );
  const activeHelp = helpCategory ? getCategoryHelp(helpCategory) : null;
  const activeHelpTagOptions = helpCategory
    ? tags.filter((tag) => tag.category === helpCategory && tag.name !== NO_DATA_TAG_LABEL)
    : [];
  const activeHelpSupportsNoData = helpCategory
    ? tags.some((tag) => tag.category === helpCategory && tag.name === NO_DATA_TAG_LABEL)
    : false;
  const activeHelpMode = helpCategory && singleSelectCats.has(helpCategory) ? "AND" : "OR";

  const displayBikes = showFavoritesOnly ? bikes.filter((b) => favorites.has(b.id)) : bikes;
  const totalPages = Math.ceil(total / pageSize);
  const paginationItems = totalPages > 1 ? getPaginationItems(page, totalPages) : [];
  const activeFilterChips: { key: string; label: string; onRemove: () => void }[] = [];

  const renderTagButtons = (tagItems: Tag[]) => (
    <>
      {tagItems.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggleTag(tag.id)}
          className={`tag-btn ${selectedTags.has(tag.id) ? "tag-btn-active" : ""}`}
        >
          {tag.name}
        </button>
      ))}
    </>
  );

  if (searchQuery) {
    activeFilterChips.push({
      key: "search",
      label: `検索: ${searchQuery}`,
      onRemove: () => {
        setSearchQuery("");
        setPage(1);
      },
    });
  }

  selectedTags.forEach((id) => {
    const tag = tags.find((item) => item.id === id);
    if (!tag) return;
    activeFilterChips.push({
      key: `tag-${id}`,
      label: `タグ: ${tag.name}`,
      onRemove: () => toggleTag(id),
    });
  });

  if (licenseClass) {
    activeFilterChips.push({
      key: "license",
      label: `免許: ${getOptionLabel(LICENSE_OPTIONS, licenseClass)}`,
      onRemove: () => {
        setLicenseClass("");
        setPage(1);
      },
    });
  }

  if (inspection) {
    activeFilterChips.push({
      key: "inspection",
      label: `車検: ${getOptionLabel(INSPECTION_OPTIONS, inspection)}`,
      onRemove: () => {
        setInspection("");
        setPage(1);
      },
    });
  }

  if (sortKey) {
    activeFilterChips.push({
      key: "sort",
      label: `並び替え: ${getOptionLabel(SORT_OPTIONS, sortKey)}`,
      onRemove: () => {
        setSortKey("");
        setPage(1);
      },
    });
  }

  if (statusFilter) {
    activeFilterChips.push({
      key: "status",
      label: `ステータス: ${getOptionLabel(STATUS_OPTIONS, statusFilter)}`,
      onRemove: () => {
        setStatusFilter("");
        setPage(1);
      },
    });
  }

  if (showFavoritesOnly) {
    activeFilterChips.push({
      key: "favorites",
      label: "お気に入りのみ",
      onRemove: () => {
        setShowFavoritesOnly(false);
        setPage(1);
      },
    });
  }

  RANGE_FIELDS.forEach((field) => {
    const range = ranges[field.key];
    if (!range?.min && !range?.max) return;
    const minLabel = range.min || "下限なし";
    const maxLabel = range.max || "上限なし";
    activeFilterChips.push({
      key: `range-${field.key}`,
      label: `${field.label}: ${minLabel}〜${maxLabel}`,
      onRemove: () => {
        setRanges((prev) => ({
          ...prev,
          [field.key]: { min: "", max: "" },
        }));
        setPage(1);
      },
    });
  });

  const compareIds = new Set(compareBikes.map((bike) => bike.id));
  const compareReady = compareBikes.length >= 2;
  const resultCountLabel = showFavoritesOnly ? `${displayBikes.length}件のお気に入り候補` : `${total}件の候補`;
  const explorationTitle = hasFilters
    ? "条件を足し引きしながら候補を整理しています"
    : "まずは入口を決めて、気になる軸から深掘りできます";
  const explorationCopy = hasFilters
    ? "探索開始から基本条件、詳細条件、比較・保存の順に見直すと、今の条件を崩さずに候補を整えやすくなります。"
    : "車名検索やおすすめ条件で広く見始めてから、免許・体格・タグで徐々に絞り込めます。";
  const emptyStateTitle = hasFilters
    ? "条件を少し緩めると候補が見つかる可能性があります"
    : "表示できる候補がまだ見つかっていません";
  const emptyStateCopy = showFavoritesOnly
    ? "お気に入りだけ表示しているため候補が空になっています。表示条件を戻すか、一覧全体から探し直してください。"
    : "現在の条件では一致するバイクがありません。直前の条件を1つ外すか、クイックスタートから探し直してください。";
  const recoveryActions: Array<{ key: string; label: string; onClick: () => void }> = [];

  if (showFavoritesOnly) {
    recoveryActions.push({
      key: "recover-favorites",
      label: "お気に入りのみ表示を解除",
      onClick: () => {
        setShowFavoritesOnly(false);
        setPage(1);
      },
    });
  }

  if (searchQuery) {
    recoveryActions.push({
      key: "recover-search",
      label: `検索「${searchQuery}」を外す`,
      onClick: () => {
        setSearchQuery("");
        setPage(1);
      },
    });
  }

  const firstSelectedTag = [...selectedTags]
    .map((tagId) => tags.find((tag) => tag.id === tagId) ?? null)
    .find((tag): tag is Tag => tag != null);
  if (firstSelectedTag) {
    recoveryActions.push({
      key: `recover-tag-${firstSelectedTag.id}`,
      label: `タグ「${firstSelectedTag.name}」を外す`,
      onClick: () => toggleTag(firstSelectedTag.id),
    });
  }

  if (licenseClass) {
    recoveryActions.push({
      key: "recover-license",
      label: "免許条件を外す",
      onClick: () => {
        setLicenseClass("");
        setPage(1);
      },
    });
  }

  if (inspection) {
    recoveryActions.push({
      key: "recover-inspection",
      label: "車検条件を外す",
      onClick: () => {
        setInspection("");
        setPage(1);
      },
    });
  }

  const firstRangeField = RANGE_FIELDS.find((field) => {
    const range = ranges[field.key];
    return range.min || range.max;
  });
  if (firstRangeField) {
    recoveryActions.push({
      key: `recover-range-${firstRangeField.key}`,
      label: `${firstRangeField.label} の条件を外す`,
      onClick: () => {
        setRanges((prev) => ({
          ...prev,
          [firstRangeField.key]: { min: "", max: "" },
        }));
        setPage(1);
      },
    });
  }

  if (statusFilter) {
    recoveryActions.push({
      key: "recover-status",
      label: "ステータス条件を外す",
      onClick: () => {
        setStatusFilter("");
        setPage(1);
      },
    });
  }

  const quickJumpActions = [
    { key: "start", label: "探索開始", description: "車名検索やおすすめ条件から始める", sectionId: "exploration-start" },
    { key: "basics", label: "基本条件", description: "免許や体格などの前提を整える", sectionId: "exploration-basics" },
    { key: "details", label: "詳細条件", description: "スペックとタグで深掘りする", sectionId: "exploration-details" },
    { key: "organize", label: "比較・保存", description: "候補を比較しながら絞り込む", sectionId: "exploration-organize" },
  ] as const;

  const sidebarContent = (
    <>
      <section
        className="sidebar-group"
        ref={(node) => {
          sidebarSectionRefs.current["exploration-start"] = node;
        }}
      >
        <p className="sidebar-group-kicker">探索開始</p>
        <h2 className="sidebar-group-title">入口を決めて探し始める</h2>
        <p className="sidebar-group-copy">車名検索やおすすめ条件から始めて、候補が見えたら下の条件で深掘りします。</p>

        <div className="filter-search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="search-icon">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="車名で検索..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <h3 className="filter-section-title">おすすめから探す</h3>
          <div className="preset-list">
            {PRESET_FILTERS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="preset-btn"
                onClick={() => applyPreset(preset)}
              >
                <span className="preset-btn-title">{preset.label}</span>
                <span className="preset-btn-description">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        className="sidebar-group"
        ref={(node) => {
          sidebarSectionRefs.current["exploration-basics"] = node;
        }}
      >
        <p className="sidebar-group-kicker">基本条件</p>
        <h2 className="sidebar-group-title">乗れる条件と体格を整える</h2>
        <p className="sidebar-group-copy">免許や車検条件を先に決めておくと、あとから細かい比較をしやすくなります。</p>

        <div className="filter-section">
          <h3 className="filter-section-title">免許・車検で絞り込み</h3>
          <div className="range-field">
            <label className="range-label">免許区分</label>
            <select
              value={licenseClass}
              onChange={(e) => { setLicenseClass(e.target.value); setPage(1); }}
              className="filter-select"
            >
              {LICENSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="range-field">
            <label className="range-label">車検有無</label>
            <select
              value={inspection}
              onChange={(e) => { setInspection(e.target.value); setPage(1); }}
              className="filter-select"
            >
              {INSPECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-section">
          <h3 className="filter-section-title">あなたの体格</h3>
          <p className="filter-section-copy">ここで入力した値は一覧の足つき・PW比の目安表示に反映されます。</p>
          <div className="range-field">
            <label className="range-label">身長 (cm)</label>
            <input
              type="number"
              placeholder="例: 170"
              value={userHeight}
              onChange={(e) => setUserHeight(e.target.value)}
              className="range-input"
            />
          </div>
          <div className="range-field">
            <label className="range-label">体重 (kg)</label>
            <input
              type="number"
              placeholder="例: 65"
              value={userWeight}
              onChange={(e) => setUserWeight(e.target.value)}
              className="range-input"
            />
          </div>
        </div>
      </section>

      <section
        className="sidebar-group"
        ref={(node) => {
          sidebarSectionRefs.current["exploration-details"] = node;
        }}
      >
        <p className="sidebar-group-kicker">詳細条件</p>
        <h2 className="sidebar-group-title">スペックとタグで深掘りする</h2>
        <p className="sidebar-group-copy">候補が見えてきたら、排気量や装備タグで違いを詰めていきます。</p>

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
                  <div className="tag-category-actions">
                    <button
                      ref={(node) => {
                        helpButtonRefs.current[cat] = node;
                      }}
                      type="button"
                      className="category-help-btn"
                      aria-label={`${CATEGORY_LABEL[cat] ?? cat} の説明を開く`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openHelp(cat);
                      }}
                    >
                      ?
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectionMode(cat);
                      }}
                      className={`mode-toggle ${singleSelectCats.has(cat) ? "mode-single" : "mode-multi"}`}
                      title={singleSelectCats.has(cat) ? "AND: すべて一致" : "OR: いずれか一致"}
                    >
                      {singleSelectCats.has(cat) ? "AND" : "OR"}
                    </button>
                  </div>
                </div>
                {!isCollapsed && (
                  cat === "maker" ? (
                    <div className="tag-list maker-tag-list">
                      {groupMakerTags(catTags).map((group) => (
                        <div key={group.key} className="maker-tag-group">
                          <div className="maker-tag-group-title">{group.label}</div>
                          <div className="maker-tag-buttons">
                            {renderTagButtons(group.tags)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tag-list">
                      {renderTagButtons(catTags)}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="sidebar-group"
        ref={(node) => {
          sidebarSectionRefs.current["exploration-organize"] = node;
        }}
      >
        <p className="sidebar-group-kicker">比較・保存・表示</p>
        <h2 className="sidebar-group-title">候補を並べて整理する</h2>
        <p className="sidebar-group-copy">比較とお気に入りを使って候補を残しつつ、一覧の見え方もここで整えます。</p>

        <div className="comparison-panel">
          <div className="comparison-panel-header">
            <div>
              <h3 className="filter-section-title comparison-panel-title">比較・保存の状況</h3>
              <p className="comparison-panel-copy">
                {compareReady
                  ? "比較候補が揃っています。今すぐ一覧の外に出ずに見比べられます。"
                  : "気になる車両を2台以上選ぶと比較できます。お気に入り数もここで確認できます。"}
              </p>
            </div>
            <div className="comparison-stats">
              <span className="comparison-stat"><strong>{compareBikes.length}</strong>比較</span>
              <span className="comparison-stat"><strong>{favorites.size}</strong>保存</span>
            </div>
          </div>
          {compareBikes.length > 0 ? (
            <div className="comparison-chip-list">
              {compareBikes.map((bike) => (
                <span key={bike.id} className="compare-tray-chip">
                  {bike.name}
                  <button className="compare-chip-remove" onClick={() => toggleCompare(bike)}>&times;</button>
                </span>
              ))}
            </div>
          ) : (
            <p className="comparison-empty-note">まだ比較候補はありません。カードの「比較に追加」から3台まで選べます。</p>
          )}
          <div className="comparison-panel-actions">
            <button
              type="button"
              className="compare-tray-open comparison-panel-open"
              onClick={() => setShowCompare(true)}
              disabled={!compareReady}
            >
              比較を見る
            </button>
            <button
              type="button"
              className="btn-copy-url comparison-panel-secondary"
              onClick={() => setShowFavoritesOnly((prev) => !prev)}
            >
              {showFavoritesOnly ? "一覧全体を表示" : "お気に入りだけ表示"}
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="filter-actions">
            <button onClick={clearAll} className="btn-clear">
              条件クリア
            </button>
            <button onClick={copyFilterUrl} className="btn-copy-url">
              URLをコピー
            </button>
          </div>
        )}

        <div className="filter-section">
          <h3 className="filter-section-title">表示設定</h3>
          <div className="range-field">
            <label className="range-label">並び替え</label>
            <select
              value={sortKey}
              onChange={(e) => { setSortKey(e.target.value); setPage(1); }}
              className="filter-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="range-field">
            <label className="range-label">ステータス</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="filter-select"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="range-field">
            <label className="range-label">表示件数</label>
            <select
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="filter-select"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}件</option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </>
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-shell">
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
            <span className="result-count">{resultCountLabel}</span>
          </div>

          <section className="header-active-filters" aria-label="現在の検索条件">
            <h2 className="header-active-filters-title">現在の検索条件</h2>
            {activeFilterChips.length > 0 ? (
              <div className="active-filters-list header-active-filters-list">
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="active-filter-chip"
                    onClick={chip.onRemove}
                  >
                    <span>{chip.label}</span>
                    <span className="active-filter-chip-remove" aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="header-active-filters-empty">検索条件なし</p>
            )}
          </section>
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
          <section className="catalog-structure-grid">
            <article className="catalog-structure-card">
              <p className="catalog-structure-kicker">探索の流れ</p>
              <h2 className="catalog-structure-title">{explorationTitle}</h2>
              <p className="catalog-structure-copy">{explorationCopy}</p>
              <div className="catalog-step-grid">
                {quickJumpActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className="catalog-step-card"
                    onClick={() => scrollToSidebarSection(action.sectionId)}
                  >
                    <strong>{action.label}</strong>
                    <span>{action.description}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="catalog-structure-card catalog-structure-card-emphasis">
              <p className="catalog-structure-kicker">比較・保存</p>
              <h2 className="catalog-structure-title">
                {compareBikes.length > 0 ? `${compareBikes.length}台を比較候補として保持中` : "気になる候補を比較と保存で残せます"}
              </h2>
              <p className="catalog-structure-copy">
                {compareReady
                  ? "比較候補が揃っているので、一覧を崩さずにスペック比較へ進めます。"
                  : "カードから比較に追加すると、ページ移動後も候補を保持したまま見比べられます。"}
              </p>
              <div className="catalog-structure-stats">
                <span className="comparison-stat"><strong>{compareBikes.length}</strong>比較候補</span>
                <span className="comparison-stat"><strong>{favorites.size}</strong>お気に入り</span>
              </div>
              <div className="catalog-structure-actions">
                <button
                  type="button"
                  className="compare-tray-open"
                  onClick={() => setShowCompare(true)}
                  disabled={!compareReady}
                >
                  比較を見る
                </button>
                <button
                  type="button"
                  className="btn-copy-url"
                  onClick={() => scrollToSidebarSection("exploration-organize")}
                >
                  比較・保存を開く
                </button>
              </div>
            </article>
          </section>

          {displayBikes.length > 0 ? (
            <div className="card-grid">
              {displayBikes.map((bike) => (
                <div
                  key={bike.id}
                  className="bike-card"
                  role="link"
                  tabIndex={0}
                  onClick={() => openBikeDetails(bike.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBikeDetails(bike.id);
                    }
                  }}
                >
                  <div className="card-body">
                  <div className="card-header-row">
                    <div className="card-header-left">
                      <h3 className="card-title">
                        <a
                          className="card-title-link"
                          href={getGoogleImageSearchUrl(bike)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={`${bike.name} のGoogle画像検索を開く`}
                        >
                          {bike.name}
                        </a>
                      </h3>
                      {bike.status === "discontinued" && (
                        <span className="status-badge status-discontinued">生産終了</span>
                      )}
                    </div>
                    <div className="card-header-right">
                      {bike.year && <span className="card-year">{bike.year}年</span>}
                      <button
                        className={`favorite-btn ${favorites.has(bike.id) ? "favorite-active" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(bike.id); }}
                        aria-label="お気に入り"
                      >
                        {favorites.has(bike.id) ? "♥" : "♡"}
                      </button>
                    </div>
                  </div>
                  <div className="card-maker">
                    {bike.maker}{bike.displacement != null ? ` / ${bike.displacement}cc` : ""}
                    {bike.model_code && <span className="card-model-code"> ({bike.model_code})</span>}
                  </div>
                  <div className="card-specs">
                    <div className="spec-item">
                      <span className="spec-label">流通目安</span>
                      <span className={`spec-value market-availability ${getUsedMarketAvailability(bike.status, bike.year).tone}`}>
                        {getUsedMarketAvailability(bike.status, bike.year).label}
                      </span>
                    </div>
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
                    {bike.wet_weight != null && (
                      <div className="spec-item">
                        <span className="spec-label">車重</span>
                        <span className="spec-value">{bike.wet_weight} kg</span>
                      </div>
                    )}
                    {bike.price != null && (
                      <div className="spec-item">
                        <span className="spec-label">参考価格</span>
                        <span className="spec-value">{bike.price}万円</span>
                      </div>
                    )}
                    {bike.displacement != null && (
                      <div className="spec-item">
                        <span className="spec-label">高速道路</span>
                        <span className={`spec-value ${bike.displacement > 125 ? "spec-highway-ok" : "spec-highway-ng"}`}>
                          {bike.displacement > 125 ? "走行可" : "不可"}
                        </span>
                      </div>
                    )}
                    {userHeight && bike.seat_height != null && (
                      <div className="spec-item">
                        <span className="spec-label">足つき目安</span>
                        <span className="spec-value spec-foot-reach">{getFootReach(Number(userHeight), bike.seat_height)}</span>
                      </div>
                    )}
                    {userWeight && bike.max_power != null && bike.wet_weight != null && (
                      <div className="spec-item">
                        <span className="spec-label">PW比(人込み)</span>
                        <span className="spec-value">
                          {getPowerToWeight(bike.max_power, bike.wet_weight, Number(userWeight))} PS/kg
                        </span>
                      </div>
                    )}
                  </div>
                  {bike.description && (
                    <p className="card-description">{bike.description}</p>
                  )}
                  {(() => {
                    const cost = getRunningCostInfo(bike.displacement, bike.fuel_economy);
                    if (!cost) return null;
                    return (
                      <div className="card-running-cost">
                        <span className="running-cost-label">維持費目安</span>
                        <span>車検: {cost.inspectionCost}</span>
                        <span>保険区分: {cost.insuranceClass}</span>
                        {cost.fuelEconomy && <span>燃費: {cost.fuelEconomy} km/L</span>}
                      </div>
                    );
                  })()}
                  <div className="card-tags">
                    {bike.tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`card-tag card-tag-button ${selectedTags.has(t.id) ? "card-tag-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTag(t.id);
                        }}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <button
                    className={`compare-btn ${compareIds.has(bike.id) ? "compare-btn-active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompare(bike);
                    }}
                    disabled={!compareIds.has(bike.id) && compareBikes.length >= 3}
                  >
                    {compareIds.has(bike.id) ? "比較から外す" : "比較に追加"}
                  </button>
                </div>
                </div>
              ))}
            </div>
          ) : (
            <section className="empty-state-panel">
              <p className="empty-state-kicker">候補が見つかりません</p>
              <h2 className="empty-state-title">{emptyStateTitle}</h2>
              <p className="empty-state-copy">{emptyStateCopy}</p>
              {activeFilterChips.length > 0 && (
                <div className="active-filters-list empty-state-filter-list">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      className="active-filter-chip"
                      onClick={chip.onRemove}
                    >
                      <span>{chip.label}</span>
                      <span className="active-filter-chip-remove" aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="empty-state-actions">
                {recoveryActions.slice(0, 3).map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className="btn-copy-url"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                ))}
                {hasFilters && (
                  <button type="button" className="btn-clear empty-state-clear" onClick={clearAll}>
                    条件をすべて外す
                  </button>
                )}
                <button
                  type="button"
                  className="btn-copy-url"
                  onClick={() => scrollToSidebarSection("exploration-start")}
                >
                  クイックスタートへ戻る
                </button>
              </div>
            </section>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-summary">
                {page} / {totalPages}ページ
              </span>
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
              >
                前へ
              </button>
              {paginationItems.map((paginationItem) =>
                typeof paginationItem === "number" ? (
                  <button
                    key={paginationItem}
                    className={`pagination-btn ${paginationItem === page ? "pagination-btn-active" : ""}`}
                    onClick={() => changePage(paginationItem)}
                    aria-current={paginationItem === page ? "page" : undefined}
                  >
                    {paginationItem}
                  </button>
                ) : (
                  <span key={paginationItem} className="pagination-ellipsis" aria-hidden="true">
                    …
                  </span>
                )
              )}
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => changePage(page + 1)}
              >
                次へ
              </button>
            </div>
          )}
        </main>
      </div>

      {activeHelp && helpCategory && (
        <div className="help-modal-overlay" onClick={() => closeHelp(helpCategory)}>
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="help-modal-header">
              <div>
                <p className="help-modal-kicker">{CATEGORY_LABEL[helpCategory] ?? helpCategory}</p>
                <h2 id="category-help-title">{activeHelp.title}</h2>
              </div>
              <button
                ref={helpCloseButtonRef}
                type="button"
                className="help-modal-close"
                aria-label="説明モーダルを閉じる"
                onClick={() => closeHelp(helpCategory)}
              >
                &times;
              </button>
            </div>

            <div className={`help-modal-body ${activeHelp.parts?.length ? "help-modal-body-split" : ""}`}>
              <div className="help-modal-copy">
                <p className="help-modal-summary">{activeHelp.summary}</p>

                <section className="help-modal-section">
                  <h3>見るポイント</h3>
                  <ul className="help-modal-list">
                    {activeHelp.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>

                <section className="help-modal-section">
                  <h3>絞り込みの読み方</h3>
                  <p>{activeHelp.stateGuide}</p>
                  <p className="help-modal-mode-note">
                    現在の一致方式は <strong>{activeHelpMode}</strong> です。OR はいずれか一致、AND は同じ項目内の条件を重ねます。
                  </p>
                </section>

                {activeHelpTagOptions.length > 0 && (
                  <section className="help-modal-section">
                    <h3>図鑑内の選択肢</h3>
                    <div className="help-modal-tag-list">
                      {activeHelpTagOptions.map((tag) => (
                        <span key={tag.id} className="help-modal-tag">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {activeHelpSupportsNoData && (
                  <p className="help-no-data-note">
                    この項目は <strong>{NO_DATA_TAG_LABEL}</strong> を併用できます。情報未登録の車両も拾いたいときに使ってください。
                  </p>
                )}
              </div>

              {activeHelp.parts?.length ? (
                <div className="help-visual-card">
                  <div className="help-silhouette-stage">
                    <img src={BIKE_SILHOUETTE_URL} alt="" className="help-silhouette-image" />
                    {activeHelp.parts.map((part) => (
                      <div
                        key={part.id}
                        className={`help-focus-point help-focus-${part.tone}`}
                        style={{ left: `${part.x}%`, top: `${part.y}%` }}
                      >
                        <span>{part.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="help-visual-legend">
                    {activeHelp.parts.map((part) => (
                      <div key={part.id} className="help-legend-item">
                        <span className={`help-legend-dot help-focus-${part.tone}`} aria-hidden="true" />
                        <div>
                          <strong>{part.label}</strong>
                          <p>{part.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {compareBikes.length > 0 && !showCompare && (
        <div className="compare-tray">
          <div className="compare-tray-content">
            <span className="compare-tray-label">比較: {compareBikes.length}台選択中</span>
            <div className="compare-tray-bikes">
              {compareBikes.map((b) => (
                <span key={b.id} className="compare-tray-chip">
                  {b.name}
                  <button className="compare-chip-remove" onClick={() => toggleCompare(b)}>&times;</button>
                </span>
              ))}
            </div>
            <button
              className="compare-tray-open"
              onClick={() => setShowCompare(true)}
              disabled={!compareReady}
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
                    ["排気量", (b: Motorcycle) => b.displacement != null ? `${b.displacement}cc` : "-"],
                    ["年式", (b: Motorcycle) => b.year ? `${b.year}年` : "-"],
                    ["最高出力", (b: Motorcycle) => b.max_power != null ? `${b.max_power} PS` : "-"],
                    ["最大トルク", (b: Motorcycle) => b.max_torque != null ? `${b.max_torque} N·m` : "-"],
                    ["シート高", (b: Motorcycle) => b.seat_height != null ? `${b.seat_height} mm` : "-"],
                    ["車重", (b: Motorcycle) => b.wet_weight != null ? `${b.wet_weight} kg` : "-"],
                    ["価格", (b: Motorcycle) => b.price != null ? `${b.price}万円` : "-"],
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
