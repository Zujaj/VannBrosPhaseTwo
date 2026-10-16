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

test.describe('Login', () => {
  test('should keep Login disabled until a well-formed email is entered', async ({ page }) => {
    // 1. Navigate to /login
    await page.goto(routes.login);
    await expect(page).toHaveURL(routes.login);

    const email = page.getByRole('textbox', { name: 'Email' });
    const loginButton = page.getByRole('button', { name: 'Login' });

    // 2. Observe Login with the Email field empty
    await expect(loginButton).toBeDisabled();

    // 3. Type a malformed value with no @/domain (e.g. notanemail) into Email, then move focus away (Tab)
    await email.fill('notanemail');
    await page.keyboard.press('Tab');
    await expect(loginButton).toBeDisabled();

    // 4. Clear the field and type a well-formed email (e.g. name@example.com)
    await email.fill('name@example.com');
    await expect(loginButton).toBeEnabled();
  });
});
