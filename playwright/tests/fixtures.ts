import { test as base, expect } from '@playwright/test';
import { WorkOrdersPage } from './pages/work-orders.page';
import { HeaderPage } from './pages/header.page';
import { ListPage } from './pages/list.page';
import { TemplatesPage } from './pages/templates.page';
import { PlanningPage } from './pages/planning.page';
import { MessagingPage } from './pages/messaging.page';
import { MapsPage } from './pages/maps.page';
import { HarvestCentralPage } from './pages/harvest-central.page';
import { routeGoogleMapsViaNode } from './helpers/googleMaps';

/**
 * Extends the base Playwright test with page-object fixtures. Specs import `test`/`expect`
 * from here (not '@playwright/test') to get the page objects auto-constructed per test.
 *
 * `headerPage` and `listPage` are the shared surfaces — the header is the same on every
 * module, and one grid widget backs Work Orders, Harvest Central, Template Management,
 * Settings and User Management.
 *
 * `context` is overridden so every page serves Google Maps through Node — without it, a
 * machine where the in-browser Maps request stalls cannot load any page (see googleMaps.ts).
 */
export const test = base.extend<{
  workOrdersPage: WorkOrdersPage;
  headerPage: HeaderPage;
  listPage: ListPage;
  templatesPage: TemplatesPage;
  planningPage: PlanningPage;
  messagingPage: MessagingPage;
  mapsPage: MapsPage;
  harvestCentralPage: HarvestCentralPage;
}>({
  context: async ({ context }, use) => {
    await routeGoogleMapsViaNode(context);
    await use(context);
  },
  workOrdersPage: async ({ page }, use) => {
    await use(new WorkOrdersPage(page));
  },
  headerPage: async ({ page }, use) => {
    await use(new HeaderPage(page));
  },
  listPage: async ({ page }, use) => {
    await use(new ListPage(page));
  },
  templatesPage: async ({ page }, use) => {
    await use(new TemplatesPage(page));
  },
  planningPage: async ({ page }, use) => {
    await use(new PlanningPage(page));
  },
  messagingPage: async ({ page }, use) => {
    await use(new MessagingPage(page));
  },
  mapsPage: async ({ page }, use) => {
    await use(new MapsPage(page));
  },
  harvestCentralPage: async ({ page }, use) => {
    await use(new HarvestCentralPage(page));
  },
});

export { expect };
