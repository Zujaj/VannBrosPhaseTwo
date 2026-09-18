import { testData, byLabel, byName } from './testData';

export interface WoScenario {
  name: string;
  priority: string;
  farm: string;
  task: string;
  supervisor?: string;
  inspectionTemplate?: string;
}

/** Timestamp-suffixed so re-running a `@mutating` spec doesn't reuse a prior run's WO name. */
function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

const FARM = byLabel(testData.farms.items, 'Vann Farm (VBSF)').label;
const HIGH_PRIORITY = byName(testData.priorities.items, 'High').name;
// "Agrierp 02 (02)" dropped out of the live Supervisor and Select Resources lists after the
// 2026-08-26 fixture snapshot. "Agrierp 04 (04)" is live (2026-09-11) and sits outside the first
// five Select Resources rows, so a bulk scenario never adds its own supervisor as a resource.
const SUPERVISOR = byLabel(testData.resources.items, 'Agrierp 04 (04)').label;

export function plannedScenario(overrides: Partial<WoScenario> = {}): WoScenario {
  return {
    name: uniqueName('Planned WO'),
    priority: HIGH_PRIORITY,
    farm: FARM,
    task: byLabel(testData.tasks.workOrder, 'Fertilization (1240)').label,
    supervisor: SUPERVISOR,
    ...overrides,
  };
}

/** How many rows a bulk Planned WO takes from each section's selection panel. */
export interface BulkSelection {
  plots: number;
  resources: number;
  assets: number;
}

/**
 * A Planned WO sized for WP-093's 30-plot tier, with several resources and assets.
 *
 * Counts are bounded by what one panel page shows (verified live 2026-09-11): Select Plots lists
 * every plot for the farm + operation on a single page (99 for Vann Farm / Fertilization), while
 * Select Resources and Select Assets page at 50 rows. `addFromModal` does not page, so keep
 * resources and assets at 50 or fewer.
 */
export function plannedBulkScenario(
  overrides: Partial<WoScenario & BulkSelection> = {},
): WoScenario & BulkSelection {
  return {
    ...plannedScenario(),
    name: uniqueName('Planned WO 30 Plots'),
    plots: 30,
    resources: 5,
    assets: 5,
    ...overrides,
  };
}

export function tankMixScenario(overrides: Partial<WoScenario> = {}): WoScenario {
  return {
    name: uniqueName('Tank Mix WO'),
    priority: HIGH_PRIORITY,
    farm: FARM,
    task: byLabel(testData.tasks.workOrder, 'Fertilization (1240)').label,
    supervisor: SUPERVISOR,
    ...overrides,
  };
}

/**
 * Harvest WOs are authored from the "Harvest Work Orders" sub-tab, where Task* is scoped to
 * the five harvest operations in `tasks.harvest` (metadata Category=2). Supervisor IS required
 * here — unlike the inspection form, it is not pre-set/disabled. No materials or tank mixing.
 */
export function harvestScenario(overrides: Partial<WoScenario> = {}): WoScenario {
  return {
    name: uniqueName('Harvest WO'),
    priority: HIGH_PRIORITY,
    farm: FARM,
    task: byLabel(testData.tasks.harvest, 'Harvest (1610)').label,
    supervisor: SUPERVISOR,
    ...overrides,
  };
}

export function inspectionScenario(overrides: Partial<WoScenario> = {}): WoScenario {
  return {
    name: uniqueName('Inspection WO'),
    priority: HIGH_PRIORITY,
    farm: FARM,
    task: byLabel(testData.tasks.inspection, 'Sampling (1510)').label,
    inspectionTemplate: byName(testData.inspectionTemplates.items, 'Sampling Template').name,
    ...overrides,
  };
}

/** What `pnpm seed:planned` / `pnpm seed:harvest` ask for (see scripts/seed.mts). */
export interface SeedRequest {
  type: 'planned' | 'harvest';
  count: number;
  plots: number;
  materials: number;
  resources: number;
  assets: number;
  prefix?: string;
  farm?: string;
  task?: string;
}

/** The `index`-th WO of a seed run: the type's default scenario, resized and renamed. */
export function seedScenario(req: SeedRequest, index: number) {
  const base = req.type === 'harvest' ? harvestScenario() : plannedScenario();
  const prefix = req.prefix ?? `Seed ${req.type === 'harvest' ? 'Harvest' : 'Planned'} WO`;
  return {
    ...base,
    name: `${prefix} ${Date.now()}-${index + 1}`,
    ...(req.farm && { farm: req.farm }),
    ...(req.task && { task: req.task }),
    plots: req.plots,
    materials: req.materials,
    resources: req.resources,
    assets: req.assets,
  };
}
