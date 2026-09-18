import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

test.use({ storageState: { cookies: [], origins: [] } });

test('login page loads', async ({ page }) => {
  await page.goto(routes.login);
  await expect(page).toHaveURL(routes.login);
});

test('@TC-partial:GN-003 maps redirects unauthenticated users to login', async ({ page }) => {
  await page.goto(routes.maps.root);
  await expect(page).toHaveURL(/\/login/);
});

test('accessdenied loads without auth', async ({ page }) => {
  await page.goto(routes.accessDenied);
  await expect(page).not.toHaveURL(/\/login/);
});
