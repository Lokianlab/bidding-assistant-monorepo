import { describe, it, expect } from "vitest";
import { CARD_SIZE_MAP } from "../types";
import type {
  CardSizePreset,
  CardSize,
  VisualizationType,
  MetricKey,
  MetricDataType,
  CardConfig,
  CustomCardConfig,
  DashboardCardLayout,
  DashboardLayout,
} from "../types";

// ── Exhaustive preset list ──────────────────────────────────────────

const ALL_PRESETS: CardSizePreset[] = [
  "small",
  "medium",
  "large",
  "wide",
  "tall",
];

// ── CARD_SIZE_MAP basic shape ───────────────────────────────────────

describe("CARD_SIZE_MAP", () => {
  it("has all presets", () => {
    for (const preset of ALL_PRESETS) {
      expect(CARD_SIZE_MAP).toHaveProperty(preset);
    }
  });

  it("has exactly 5 presets (no extra keys)", () => {
    expect(Object.keys(CARD_SIZE_MAP)).toHaveLength(5);
  });

  it("keys match the CardSizePreset union exactly", () => {
    const keys = Object.keys(CARD_SIZE_MAP).sort();
    expect(keys).toEqual([...ALL_PRESETS].sort());
  });

  it("each size has positive colSpan and rowSpan", () => {
    for (const preset of ALL_PRESETS) {
      const size = CARD_SIZE_MAP[preset];
      expect(size.colSpan).toBeGreaterThan(0);
      expect(size.rowSpan).toBeGreaterThan(0);
    }
  });

  it("colSpan and rowSpan are integers", () => {
    for (const preset of ALL_PRESETS) {
      const size = CARD_SIZE_MAP[preset];
      expect(Number.isInteger(size.colSpan)).toBe(true);
      expect(Number.isInteger(size.rowSpan)).toBe(true);
    }
  });

  it("each value has exactly two properties (colSpan and rowSpan)", () => {
    for (const preset of ALL_PRESETS) {
      const size = CARD_SIZE_MAP[preset];
      expect(Object.keys(size)).toHaveLength(2);
      expect(Object.keys(size).sort()).toEqual(["colSpan", "rowSpan"]);
    }
  });
});

// ── CARD_SIZE_MAP specific preset values ────────────────────────────

describe("CARD_SIZE_MAP specific values", () => {
  it("small is 1x1", () => {
    expect(CARD_SIZE_MAP.small).toEqual({ colSpan: 1, rowSpan: 1 });
  });

  it("medium is 2x1", () => {
    expect(CARD_SIZE_MAP.medium).toEqual({ colSpan: 2, rowSpan: 1 });
  });

  it("large is 2x2", () => {
    expect(CARD_SIZE_MAP.large).toEqual({ colSpan: 2, rowSpan: 2 });
  });

  it("wide is 4x1", () => {
    expect(CARD_SIZE_MAP.wide).toEqual({ colSpan: 4, rowSpan: 1 });
  });

  it("tall is 1x2", () => {
    expect(CARD_SIZE_MAP.tall).toEqual({ colSpan: 1, rowSpan: 2 });
  });
});

// ── CARD_SIZE_MAP grid layout invariants ────────────────────────────

describe("CARD_SIZE_MAP grid layout constraints", () => {
  it("no preset exceeds 4 columns (standard grid width)", () => {
    for (const preset of ALL_PRESETS) {
      expect(CARD_SIZE_MAP[preset].colSpan).toBeLessThanOrEqual(4);
    }
  });

  it("no preset exceeds 2 rows", () => {
    for (const preset of ALL_PRESETS) {
      expect(CARD_SIZE_MAP[preset].rowSpan).toBeLessThanOrEqual(2);
    }
  });

  it("total area (colSpan * rowSpan) is between 1 and 4 for each preset", () => {
    for (const preset of ALL_PRESETS) {
      const { colSpan, rowSpan } = CARD_SIZE_MAP[preset];
      const area = colSpan * rowSpan;
      expect(area).toBeGreaterThanOrEqual(1);
      expect(area).toBeLessThanOrEqual(4);
    }
  });

  it("small has the minimum area (1)", () => {
    const { colSpan, rowSpan } = CARD_SIZE_MAP.small;
    expect(colSpan * rowSpan).toBe(1);
  });

  it("large and wide share the maximum area (4)", () => {
    const largeArea =
      CARD_SIZE_MAP.large.colSpan * CARD_SIZE_MAP.large.rowSpan;
    const wideArea = CARD_SIZE_MAP.wide.colSpan * CARD_SIZE_MAP.wide.rowSpan;
    expect(largeArea).toBe(4);
    expect(wideArea).toBe(4);
  });

  it("wide is the only preset that spans the full 4-column grid width", () => {
    const fullWidthPresets = ALL_PRESETS.filter(
      (p) => CARD_SIZE_MAP[p].colSpan === 4,
    );
    expect(fullWidthPresets).toEqual(["wide"]);
  });

  it("tall and large are the only presets with rowSpan > 1", () => {
    const multiRowPresets = ALL_PRESETS.filter(
      (p) => CARD_SIZE_MAP[p].rowSpan > 1,
    ).sort();
    expect(multiRowPresets).toEqual(["large", "tall"]);
  });

  it("small and tall are the only single-column presets", () => {
    const singleColPresets = ALL_PRESETS.filter(
      (p) => CARD_SIZE_MAP[p].colSpan === 1,
    ).sort();
    expect(singleColPresets).toEqual(["small", "tall"]);
  });
});

// ── CARD_SIZE_MAP immutability ──────────────────────────────────────

describe("CARD_SIZE_MAP immutability", () => {
  it("is a plain object (not a Map or class instance)", () => {
    expect(typeof CARD_SIZE_MAP).toBe("object");
    expect(CARD_SIZE_MAP).not.toBeNull();
    expect(Array.isArray(CARD_SIZE_MAP)).toBe(false);
  });

  it("reading values does not mutate the map", () => {
    const before = JSON.stringify(CARD_SIZE_MAP);
    // read every value
    for (const preset of ALL_PRESETS) {
      void CARD_SIZE_MAP[preset];
    }
    const after = JSON.stringify(CARD_SIZE_MAP);
    expect(after).toBe(before);
  });
});

// ── Type-level contracts (runtime structural checks) ────────────────
// These tests verify that objects conforming to exported interfaces
// have the expected shape. TypeScript erasure means we cannot check
// union members at runtime, but we CAN verify structural contracts.

describe("CardConfig structural contract", () => {
  it("accepts minimal empty config", () => {
    const config: CardConfig = {};
    expect(config).toBeDefined();
  });

  it("accepts fully populated config", () => {
    const config: CardConfig = {
      title: "test",
      period: "year",
      colorScheme: "blue",
      threshold: { warn: 0.5, danger: 0.2 },
      showTrend: true,
      numberFormat: "currency",
    };
    expect(config.title).toBe("test");
    expect(config.period).toBe("year");
    expect(config.colorScheme).toBe("blue");
    expect(config.threshold).toEqual({ warn: 0.5, danger: 0.2 });
    expect(config.showTrend).toBe(true);
    expect(config.numberFormat).toBe("currency");
  });

  it("threshold has warn and danger as numbers", () => {
    const config: CardConfig = {
      threshold: { warn: 0.3, danger: 0.15 },
    };
    expect(typeof config.threshold!.warn).toBe("number");
    expect(typeof config.threshold!.danger).toBe("number");
  });

  it("period accepts all valid values", () => {
    const validPeriods: CardConfig["period"][] = [
      "all",
      "year",
      "month",
      "week",
    ];
    for (const period of validPeriods) {
      const config: CardConfig = { period };
      expect(config.period).toBe(period);
    }
  });

  it("numberFormat accepts all valid values", () => {
    const validFormats: CardConfig["numberFormat"][] = [
      "integer",
      "currency",
      "percentage",
    ];
    for (const fmt of validFormats) {
      const config: CardConfig = { numberFormat: fmt };
      expect(config.numberFormat).toBe(fmt);
    }
  });
});

describe("CustomCardConfig structural contract", () => {
  it("extends CardConfig with metric and visualization", () => {
    const config: CustomCardConfig = {
      metric: "activeProjects",
      visualization: "number",
    };
    expect(config.metric).toBe("activeProjects");
    expect(config.visualization).toBe("number");
  });

  it("accepts full chartConfig", () => {
    const config: CustomCardConfig = {
      metric: "winRate",
      visualization: "gauge",
      chartConfig: {
        showGrid: true,
        showLegend: false,
        showTooltip: true,
        stacked: false,
        axisLabel: "percentage",
      },
    };
    expect(config.chartConfig).toBeDefined();
    expect(config.chartConfig!.showGrid).toBe(true);
    expect(config.chartConfig!.stacked).toBe(false);
    expect(config.chartConfig!.axisLabel).toBe("percentage");
  });

  it("inherits CardConfig optional fields", () => {
    const config: CustomCardConfig = {
      metric: "totalBudget",
      visualization: "bar",
      title: "Budget",
      period: "month",
      showTrend: true,
      numberFormat: "currency",
      threshold: { warn: 0.8, danger: 0.95 },
    };
    expect(config.title).toBe("Budget");
    expect(config.period).toBe("month");
    expect(config.threshold).toEqual({ warn: 0.8, danger: 0.95 });
  });
});

describe("DashboardCardLayout structural contract", () => {
  it("requires cardId, type, position, size, and config", () => {
    const layout: DashboardCardLayout = {
      cardId: "card-1",
      type: "stat-projects",
      position: 0,
      size: "small",
      config: {},
    };
    expect(layout.cardId).toBe("card-1");
    expect(layout.type).toBe("stat-projects");
    expect(layout.position).toBe(0);
    expect(layout.size).toBe("small");
    expect(layout.config).toBeDefined();
  });

  it("size field accepts all CardSizePreset values", () => {
    for (const preset of ALL_PRESETS) {
      const layout: DashboardCardLayout = {
        cardId: `card-${preset}`,
        type: "test",
        position: 0,
        size: preset,
        config: {},
      };
      expect(layout.size).toBe(preset);
    }
  });

  it("config can be either CardConfig or CustomCardConfig", () => {
    const withBase: DashboardCardLayout = {
      cardId: "a",
      type: "stat",
      position: 0,
      size: "small",
      config: { title: "Base", period: "year" },
    };
    const withCustom: DashboardCardLayout = {
      cardId: "b",
      type: "custom",
      position: 1,
      size: "medium",
      config: {
        metric: "winRate",
        visualization: "ring",
        title: "Custom",
      } as CustomCardConfig,
    };
    expect(withBase.config).toBeDefined();
    expect((withCustom.config as CustomCardConfig).metric).toBe("winRate");
  });

  it("position can be zero or positive", () => {
    const layout: DashboardCardLayout = {
      cardId: "z",
      type: "t",
      position: 0,
      size: "small",
      config: {},
    };
    expect(layout.position).toBe(0);
    layout.position = 99;
    expect(layout.position).toBe(99);
  });
});

describe("DashboardLayout structural contract", () => {
  it("requires cards array and gridCols", () => {
    const layout: DashboardLayout = {
      cards: [],
      gridCols: 4,
    };
    expect(layout.cards).toEqual([]);
    expect(layout.gridCols).toBe(4);
  });

  it("can hold multiple cards", () => {
    const cards: DashboardCardLayout[] = ALL_PRESETS.map((preset, i) => ({
      cardId: `card-${i}`,
      type: "test",
      position: i,
      size: preset,
      config: {},
    }));
    const layout: DashboardLayout = { cards, gridCols: 4 };
    expect(layout.cards).toHaveLength(5);
  });

  it("gridCols can be any positive integer", () => {
    for (const cols of [1, 2, 3, 4, 6, 8, 12]) {
      const layout: DashboardLayout = { cards: [], gridCols: cols };
      expect(layout.gridCols).toBe(cols);
    }
  });
});

// ── Type unions exhaustiveness (runtime-checkable portion) ──────────

describe("VisualizationType exhaustiveness", () => {
  it("all 8 visualization types can be assigned", () => {
    const allTypes: VisualizationType[] = [
      "number",
      "ring",
      "bar",
      "line",
      "gauge",
      "mini-table",
      "stacked-bar",
      "heatmap",
    ];
    expect(allTypes).toHaveLength(8);
    // Ensure no duplicates
    expect(new Set(allTypes).size).toBe(allTypes.length);
  });
});

describe("MetricKey exhaustiveness", () => {
  it("all 21 metric keys can be assigned", () => {
    const allKeys: MetricKey[] = [
      "activeProjects",
      "totalBudget",
      "wonBudget",
      "winRate",
      "biddingBudget",
      "yearSubmitted",
      "yearWon",
      "monthSubmitted",
      "weekSubmitted",
      "yearlyGoal",
      "goalAttainment",
      "monthlyTarget",
      "weeklyTarget",
      "totalCost",
      "teamWorkload",
      "monthlyTrend",
      "typeAnalysis",
      "statusDistribution",
      "costBreakdown",
      "rollingWinRate",
      "quarterComparison",
    ];
    expect(allKeys).toHaveLength(21);
    expect(new Set(allKeys).size).toBe(allKeys.length);
  });
});

describe("MetricDataType exhaustiveness", () => {
  it("all 4 data types can be assigned", () => {
    const allTypes: MetricDataType[] = ["number", "ratio", "array", "matrix"];
    expect(allTypes).toHaveLength(4);
    expect(new Set(allTypes).size).toBe(allTypes.length);
  });
});

// ── CARD_SIZE_MAP used as lookup (realistic usage patterns) ─────────

describe("CARD_SIZE_MAP lookup patterns", () => {
  it("can be used to compute grid cell area for a card layout", () => {
    const layout: DashboardCardLayout = {
      cardId: "card-1",
      type: "stat-projects",
      position: 0,
      size: "large",
      config: {},
    };
    const { colSpan, rowSpan } = CARD_SIZE_MAP[layout.size];
    expect(colSpan * rowSpan).toBe(4);
  });

  it("can compute total grid cells consumed by a set of cards", () => {
    const cards: DashboardCardLayout[] = [
      { cardId: "a", type: "t", position: 0, size: "small", config: {} },
      { cardId: "b", type: "t", position: 1, size: "medium", config: {} },
      { cardId: "c", type: "t", position: 2, size: "large", config: {} },
      { cardId: "d", type: "t", position: 3, size: "wide", config: {} },
      { cardId: "e", type: "t", position: 4, size: "tall", config: {} },
    ];
    const totalCells = cards.reduce((sum, card) => {
      const { colSpan, rowSpan } = CARD_SIZE_MAP[card.size];
      return sum + colSpan * rowSpan;
    }, 0);
    // small=1 + medium=2 + large=4 + wide=4 + tall=2 = 13
    expect(totalCells).toBe(13);
  });

  it("can check if a card fits within a given grid width", () => {
    const gridCols = 4;
    for (const preset of ALL_PRESETS) {
      const fits = CARD_SIZE_MAP[preset].colSpan <= gridCols;
      expect(fits).toBe(true);
    }
  });

  it("wide card does NOT fit in a 3-column grid", () => {
    const gridCols = 3;
    expect(CARD_SIZE_MAP.wide.colSpan <= gridCols).toBe(false);
  });

  it("all presets fit in a 4-column grid but wide does not fit in narrower grids", () => {
    // 2-column grid
    const twoCol = ALL_PRESETS.filter(
      (p) => CARD_SIZE_MAP[p].colSpan <= 2,
    ).sort();
    expect(twoCol).toEqual(["large", "medium", "small", "tall"]);

    // 1-column grid
    const oneCol = ALL_PRESETS.filter(
      (p) => CARD_SIZE_MAP[p].colSpan <= 1,
    ).sort();
    expect(oneCol).toEqual(["small", "tall"]);
  });
});
