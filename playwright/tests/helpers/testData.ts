import farms from '../../fixtures/farms.json';
import tasks from '../../fixtures/tasks.json';
import priorities from '../../fixtures/priorities.json';
import resources from '../../fixtures/resources.json';
import inspectionTemplates from '../../fixtures/inspectionTemplates.json';
import seasons from '../../fixtures/seasons.json';
import growers from '../../fixtures/growers.json';

/**
 * Typed access to the reference data captured under `playwright/fixtures/`.
 *
 * Those JSON files are read-only snapshots of live QA metadata endpoints (Farms, Tasks,
 * Priorities, Resources, Inspection Templates, ...). Their `label`/`name` strings are
 * verbatim UI text, so specs should look values up here instead of hardcoding tenant
 * strings inline — when QA data changes, update the fixture, not every spec.
 */
export const testData = {
  farms,
  tasks,
  priorities,
  resources,
  inspectionTemplates,
  seasons,
  growers,
};

/** Look up a fixture item by its `label` field (e.g. "Vann Farm (VBSF)"). Throws if missing. */
export function byLabel<T extends { label: string }>(items: T[], label: string): T {
  const found = items.find((item) => item.label === label);
  if (!found) throw new Error(`Fixture item not found for label "${label}"`);
  return found;
}

/** Look up a fixture item by its `name` field (e.g. inspection templates, which have no `label`). */
export function byName<T extends { name: string }>(items: T[], name: string): T {
  const found = items.find((item) => item.name === name);
  if (!found) throw new Error(`Fixture item not found for name "${name}"`);
  return found;
}
