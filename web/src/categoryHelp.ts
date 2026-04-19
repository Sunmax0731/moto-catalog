export type HelpFocusTone = "powertrain" | "chassis" | "control" | "brake" | "cargo" | "rider";

export type HelpFocusPoint = {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  tone: HelpFocusTone;
};

export type CategoryHelp = {
  title: string;
  summary: string;
  points: string[];
  stateGuide: string;
  parts?: HelpFocusPoint[];
};

const BIKE_PARTS = {
  cockpit: {
    id: "cockpit",
    label: "スイッチ・メーター",
    description: "ハンドル周辺のスイッチとメーターで電子制御の状態を確認します。",
    x: 36,
    y: 26,
    tone: "control",
  },
  engine: {
    id: "engine",
    label: "エンジン本体",
    description: "気筒数や配置、冷却方式などの中心になる部分です。",
    x: 45,
    y: 57,
    tone: "powertrain",
  },
  head: {
    id: "head",
    label: "シリンダーヘッド",
    description: "バルブ数や燃焼室設計に関わる上側のユニットです。",
    x: 46,
    y: 48,
    tone: "powertrain",
  },
  radiator: {
    id: "radiator",
    label: "ラジエーター",
    description: "水冷モデルでは前方に置かれ、走行風で熱を逃がします。",
    x: 32,
    y: 49,
    tone: "powertrain",
  },
  frame: {
    id: "frame",
    label: "フレーム",
    description: "車体全体の骨格。剛性やハンドリングの土台です。",
    x: 49,
    y: 42,
    tone: "chassis",
  },
  frontSuspension: {
    id: "front-suspension",
    label: "フロント足回り",
    description: "フォーク形式や剛性、ブレーキの支持剛性に関わります。",
    x: 20,
    y: 53,
    tone: "chassis",
  },
  rearSuspension: {
    id: "rear-suspension",
    label: "リアサスペンション",
    description: "ショック形式やストローク量で乗り心地が変わります。",
    x: 61,
    y: 48,
    tone: "chassis",
  },
  clutch: {
    id: "clutch",
    label: "クラッチ",
    description: "エンジンと変速機のつなぎ目。発進や変速の感触を左右します。",
    x: 42,
    y: 62,
    tone: "powertrain",
  },
  transmission: {
    id: "transmission",
    label: "ミッション",
    description: "ギア段数や自動変速ユニットが入る駆動系の中心です。",
    x: 50,
    y: 62,
    tone: "powertrain",
  },
  drive: {
    id: "drive",
    label: "最終駆動",
    description: "チェーン、ベルト、シャフトなど後輪へ力を送る部分です。",
    x: 72,
    y: 63,
    tone: "powertrain",
  },
  frontBrake: {
    id: "front-brake",
    label: "フロントブレーキ",
    description: "ABS の介入が特に効くポイントです。",
    x: 12,
    y: 66,
    tone: "brake",
  },
  rearBrake: {
    id: "rear-brake",
    label: "リアブレーキ",
    description: "後輪側の制動と姿勢安定に関わります。",
    x: 80,
    y: 67,
    tone: "brake",
  },
  tail: {
    id: "tail",
    label: "シート後方",
    description: "トップケースや荷掛け装備が集まりやすい位置です。",
    x: 67,
    y: 36,
    tone: "cargo",
  },
  riderTriangle: {
    id: "rider-triangle",
    label: "着座位置",
    description: "ハンドル、シート、ステップの三角関係で姿勢が決まります。",
    x: 54,
    y: 34,
    tone: "rider",
  },
  shifter: {
    id: "shifter",
    label: "シフト操作部",
    description: "クイックシフターやシフト操作感に関係する足元です。",
    x: 57,
    y: 70,
    tone: "control",
  },
} satisfies Record<string, HelpFocusPoint>;

const CATEGORY_HELP: Record<string, CategoryHelp> = {
  maker: {
    title: "メーカー",
    summary: "ブランドごとの設計思想、得意ジャンル、サポート網の傾向を見るための絞り込みです。",
    points: [
      "同じメーカーでも、ネイキッドとツアラーでは性格が大きく変わります。",
      "保守部品や中古流通の量はメーカー差が出やすいです。",
    ],
    stateGuide: "まずはメーカーを広く選び、その後に車種タイプや用途で絞ると比較しやすくなります。",
  },
  type: {
    title: "車種タイプ",
    summary: "ネイキッド、スクーター、アドベンチャーなど、車体コンセプトの違いを表します。",
    points: [
      "同じ排気量でも、車種タイプが違うと姿勢や装備、得意な場面が変わります。",
      "0cc の車両には電気バイクタグが付き、EV を見つけやすくしています。",
    ],
    stateGuide: "複数選択の OR は候補を広く拾う用途、AND は『スクーターかつ電気バイク』のような絞り込みに向きます。",
  },
  usage: {
    title: "用途・シーン",
    summary: "街乗り、ツーリング、サーキット、林道など、使い方の相性を見るための項目です。",
    points: [
      "メーカーや車種タイプと違って、1台に複数の用途タグが付くことがあります。",
      "用途タグは『どこで気持ちよく使えるか』を見る目安です。",
    ],
    stateGuide: "迷ったら用途タグを複数 OR 選択し、候補を広げてからスペックで狭めるのが有効です。",
  },
  luggage: {
    title: "積載性",
    summary: "ケース装着や荷物の載せやすさなど、旅装備との相性を見るための項目です。",
    points: [
      "純正ケース対応車はツーリング用途で比較しやすくなります。",
      "積載性良好はリア周りの設計や荷掛けしやすさの目安です。",
    ],
    stateGuide: "有無を見るときは『対応』のタグ、情報未登録車も含めたいときはデータなしも併用できます。",
    parts: [BIKE_PARTS.tail],
  },
  riding_position: {
    title: "ライディングポジション",
    summary: "ハンドル、シート、ステップの位置関係から決まるライダー姿勢の違いです。",
    points: [
      "アップライトは街乗りやツーリングで疲れにくく、前傾はスポーツ走行向きです。",
      "ポジションはシート高と合わせて見ると体格との相性が分かりやすくなります。",
    ],
    stateGuide: "まず好みの姿勢を選び、その後にシート高や車重で現実的な候補を絞り込むと失敗しにくいです。",
    parts: [BIKE_PARTS.cockpit, BIKE_PARTS.riderTriangle],
  },
  transmission: {
    title: "ミッション",
    summary: "変速方式の違いを表します。MT は操作感重視、DCT/CVT は自動変速寄りです。",
    points: [
      "段数が多いほど高速巡航や細かなギア選択に有利になりやすいです。",
      "DCT や CVT は渋滞や通勤で扱いやすい反面、操作感は大きく変わります。",
    ],
    stateGuide: "MT と自動変速を混ぜて比較したいなら OR、特定方式だけ見たいなら単独選択が分かりやすいです。",
    parts: [BIKE_PARTS.transmission, BIKE_PARTS.shifter],
  },
  cooling: {
    title: "冷却方式",
    summary: "エンジンの熱をどう逃がすかを示します。水冷、油冷、空冷で性格が変わります。",
    points: [
      "水冷は安定した温度管理がしやすく、空冷は構造のシンプルさや雰囲気が魅力です。",
      "走行シーンや整備性、デザインにも冷却方式の違いが出ます。",
    ],
    stateGuide: "冷却方式は排気量や用途とセットで見ると、日常使いか趣味性重視かが判断しやすくなります。",
    parts: [BIKE_PARTS.engine, BIKE_PARTS.radiator],
  },
  engine_layout: {
    title: "エンジン形状",
    summary: "気筒の並び方や向きを示します。直列、並列、V型、水平対向などが代表例です。",
    points: [
      "形状によって幅、前後長、鼓動感、重心感が大きく変わります。",
      "同じ気筒数でも、V型と直列ではキャラクターがかなり異なります。",
    ],
    stateGuide: "エンジン形状は気筒数や車重と一緒に見ると、乗り味の方向性をつかみやすいです。",
    parts: [BIKE_PARTS.engine],
  },
  cylinders: {
    title: "気筒数",
    summary: "単気筒、二気筒、三気筒、四気筒など、エンジンのシリンダー数を表します。",
    points: [
      "単気筒は軽快さと扱いやすさ、四気筒は高回転の伸びや滑らかさが魅力です。",
      "気筒数が増えるほど構造や重量、フィーリングも変わっていきます。",
    ],
    stateGuide: "排気量だけでなく気筒数も見ると、同クラス内での性格差が見えます。",
    parts: [BIKE_PARTS.engine],
  },
  valves_per_cylinder: {
    title: "バルブ数/気筒",
    summary: "1 気筒あたりに何本のバルブを持つかを示します。吸排気効率の参考になります。",
    points: [
      "4 バルブ化は高回転域の効率や出力特性に寄与しやすいです。",
      "2 バルブは構造が比較的シンプルで、低中速重視の味付けも多く見られます。",
    ],
    stateGuide: "バルブ数だけで性能が決まるわけではないので、気筒数や最高出力も合わせて見てください。",
    parts: [BIKE_PARTS.head],
  },
  fuel_system: {
    title: "燃料供給",
    summary: "キャブレターかフューエルインジェクションかを示します。始動性や味付けに差が出ます。",
    points: [
      "インジェクションは始動性や環境条件への強さが魅力です。",
      "キャブレターは整備やセッティングを楽しみたい人に向く場合があります。",
    ],
    stateGuide: "古めの車両を探すならキャブ、日常の扱いやすさ重視ならインジェクションを起点に探すと分かりやすいです。",
    parts: [BIKE_PARTS.engine, BIKE_PARTS.head],
  },
  frame: {
    title: "フレーム形状",
    summary: "車体の骨格設計です。剛性、重量配分、整備性、見た目に大きく影響します。",
    points: [
      "ツインスパーはスポーツ寄り、クレードルやバックボーンは実用寄りの採用例が多いです。",
      "同じエンジンでもフレーム形状で旋回性や乗り味が変わります。",
    ],
    stateGuide: "乗り味の傾向を見る項目なので、車種タイプやサスペンションと一緒に比較すると違いが見えます。",
    parts: [BIKE_PARTS.frame],
  },
  suspension: {
    title: "懸架方式",
    summary: "路面からの入力を受け止める足回りの構成です。快適性とスポーツ性の両方に影響します。",
    points: [
      "倒立フォークは剛性面で有利なことが多く、ツインショックはクラシックな雰囲気も魅力です。",
      "前後どちらの形式かで意味が違うので、タグの組み合わせで読むのがコツです。",
    ],
    stateGuide: "街乗り中心かスポーツ走行中心かで、足回りに求める性格が変わります。",
    parts: [BIKE_PARTS.frontSuspension, BIKE_PARTS.rearSuspension],
  },
  clutch: {
    title: "クラッチ",
    summary: "エンジンの力を変速機へつなぐ装置です。乾式か湿式かでフィーリングや音も変わります。",
    points: [
      "乾式は切れ味やメカ感、湿式は扱いやすさや耐久性の印象で語られることが多いです。",
      "スクーター系ではクラッチ形式が一般的な MT と違う場合があります。",
    ],
    stateGuide: "乾式を探すときはデータなしを併用すると、情報未登録の車両も落としにくくなります。",
    parts: [BIKE_PARTS.clutch],
  },
  drive: {
    title: "駆動方式",
    summary: "変速機から後輪へ力を送る最終駆動の形式です。チェーン、ベルト、シャフトが代表例です。",
    points: [
      "チェーンは軽さと交換自由度、ベルトは静粛性、シャフトはメンテ頻度の少なさが特徴です。",
      "駆動方式でホイール周りの重量感や日常整備の手間が変わります。",
    ],
    stateGuide: "長距離ツーリング重視ならシャフトやベルト、軽快さ重視ならチェーンから比較しやすいです。",
    parts: [BIKE_PARTS.drive],
  },
  abs: {
    title: "ABS",
    summary: "急制動時のタイヤロックを抑えるブレーキ制御です。コーナリング ABS は車体姿勢も見ます。",
    points: [
      "街乗りや雨天では安心感が大きく、初心者にも恩恵が分かりやすい装備です。",
      "コーナリング ABS は IMU 連携の高度な制御を含むことがあります。",
    ],
    stateGuide: "ABS 無しを探すときは年式や価格とも合わせて見て、古い設計との差も確認してください。",
    parts: [BIKE_PARTS.frontBrake, BIKE_PARTS.rearBrake],
  },
  start: {
    title: "始動方式",
    summary: "セル、キック、併用など、エンジンのかけ方の違いを示します。",
    points: [
      "セルスタートは日常で扱いやすく、キック併用は古い車両や軽量車で見かけます。",
      "始動方式は年代や用途、整備性の傾向も表します。",
    ],
    stateGuide: "旧車や軽量オフロードを探すときはキック系を起点にすると候補の傾向が見えます。",
    parts: [BIKE_PARTS.cockpit, BIKE_PARTS.engine],
  },
  traction_control: {
    title: "トラクションコントロール",
    summary: "加速時の後輪空転を検知して出力を調整する電子制御です。",
    points: [
      "雨天や荒れた路面、高出力車で安心感が増しやすい装備です。",
      "設定の介入度はライディングモードと連動することがあります。",
    ],
    stateGuide: "有りは安全マージン重視、無しはダイレクトな操作感重視という見方がしやすいです。",
    parts: [BIKE_PARTS.cockpit, BIKE_PARTS.drive],
  },
  riding_mode: {
    title: "ライディングモード",
    summary: "出力特性や ABS、トラコン介入度などをまとめて切り替える電子制御です。",
    points: [
      "スポーツ、レイン、ロードなど、走行シーンに合わせたプリセットが用意されることがあります。",
      "近年のミドル以上では、電子制御パッケージの中心的な項目です。",
    ],
    stateGuide: "有りは場面対応力を重視する人向け、無しはシンプルな操作感を好む人向けです。",
    parts: [BIKE_PARTS.cockpit],
  },
  quickshifter: {
    title: "クイックシフター",
    summary: "クラッチ操作を省いて素早く変速する補助装置です。スポーツ系で採用が増えています。",
    points: [
      "加速や減速のリズムを崩しにくく、サーキットやワインディングで恩恵が大きいです。",
      "アップだけ対応か、ブリッパー付きでダウンも対応かは車種差があります。",
    ],
    stateGuide: "有りはスポーツ走行との相性を重視したいときに有効です。",
    parts: [BIKE_PARTS.shifter, BIKE_PARTS.transmission],
  },
  meter_type: {
    title: "メーター",
    summary: "アナログ、フルデジタル、ハイブリッドなど、情報表示の方式です。",
    points: [
      "表示量や視認性、雰囲気が大きく変わるので、毎回見る UI と考えると重要です。",
      "電子制御の設定項目が多い車両ほど、フルデジタル化される傾向があります。",
    ],
    stateGuide: "昔ながらの雰囲気を重視するならアナログ、機能性重視ならデジタル系から比較すると分かりやすいです。",
    parts: [BIKE_PARTS.cockpit],
  },
};

export function getCategoryHelp(category: string): CategoryHelp {
  return (
    CATEGORY_HELP[category] ?? {
      title: category,
      summary: "この項目の特徴を比較するためのフィルターです。",
      points: ["図鑑内のタグ例と実車スペックを合わせて見ると判断しやすくなります。"],
      stateGuide: "気になる項目を単独で絞り、その後に排気量や用途で絞り込むと候補を整理しやすいです。",
    }
  );
}
