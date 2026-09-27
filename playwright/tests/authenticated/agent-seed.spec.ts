import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Seed for the Playwright planner / generator agents (`.claude/prompts/`): their setup tools
 * run this to get a logged-in page on the Farm App. Non-mutating; also runs in the normal suite.
 */
test('agent seed: logged-in session lands on maps', async ({ page }) => {
  await page.goto(routes.maps.root);
  await expect(page).toHaveURL(routes.maps.root);
});
