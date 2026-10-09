import type { Page } from '@playwright/test';
import { API_HOSTS } from '../constants/routes';

/**
 * Cleanup for `@mutating` template specs: find what a test created by its name prefix and
 * delete it through the same API the app uses (`DELETE /api/Form/{id}` for inspection
 * templates, `DELETE /api/Form/inputfields/{id}` for attributes).
 *
 * No token from a person is needed: the app sends its own Firebase bearer on every API call, so
 * `ApiSession.watch()` copies the `Authorization` header and API origin off the first one it
 * sees. The API host differs from the web host (`agrierp-authgateway-qa-api...`), which is why
 * the origin is captured rather than configured.
 *
 * Records are found by listing (`GET /api/Form`, `GET /api/Form/inputfields`) rather than read
 * from the create response: reading that response body hung a run on 2026-09-27, and a lookup
 * by name also works from `afterEach`, which Playwright still runs after a test times out.
 *
 * Known QA backend bug (2026-09-27): `DELETE /api/Form/inputfields/{id}` and
 * `PUT /api/form/inputfields/{id}/toggleStatus` both return 500 "Object reference not set to an
 * instance of an object", so created attributes cannot be removed — see SMOKE-NOTES
 * TA-DELETE-500.
 */
export type TemplateKind = 'template' | 'attribute';

const LIST_PATH: Record<TemplateKind, string> = {
  template: '/api/Form?page=1&limit=1000',
  attribute: '/api/Form/inputfields?page=1&limit=1000',
};
const DELETE_PATH: Record<TemplateKind, (id: number) => string> = {
  template: (id) => `/api/Form/${id}`,
  attribute: (id) => `/api/Form/inputfields/${id}`,
};

export class ApiSession {
  private authorization?: string;
  private origin?: string;

  private constructor(private readonly page: Page) {}

  /** Start watching before the first navigation so the header is captured on page load. */
  static watch(page: Page): ApiSession {
    const session = new ApiSession(page);
    page.on('request', (request) => {
      const auth = request.headers()['authorization'];
      const url = new URL(request.url());
      if (auth && url.pathname.startsWith('/api/') && API_HOSTS.includes(url.host)) {
        session.authorization = auth;
        session.origin = url.origin;
      }
    });
    return session;
  }

  private url(apiPath: string): string {
    if (!this.authorization || !this.origin) throw new Error('no API call seen yet to copy auth from');
    const url = `${this.origin}${apiPath}`;
    // `assertQaOnly` only admits the web host; the API lives on its own gateway host
    // (agrierp-authgateway-qa-api / agrierp-vann-api-qa, or UAT's gateway under TARGET_ENV=uat),
    // so require one of the targeted environment's API hosts here.
    const host = new URL(url).host;
    if (!API_HOSTS.includes(host)) throw new Error(`Refusing API host outside the target env: ${host}`);
    return url;
  }

  /** Records of `kind` whose name (templates) or label (attributes) starts with `prefix`. */
  async findByPrefix(kind: TemplateKind, prefix: string): Promise<{ id: number; name: string }[]> {
    const response = await this.page.request.get(this.url(LIST_PATH[kind]), {
      headers: { authorization: this.authorization! },
    });
    if (!response.ok()) throw new Error(`GET ${LIST_PATH[kind]} -> ${response.status()}`);
    const body: unknown = await response.json();
    const rows = (Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])) as Record<string, unknown>[];
    return rows
      .map((row) => ({ id: row.id as number, name: String(row.name ?? row.label ?? '') }))
      .filter((row) => typeof row.id === 'number' && row.name.startsWith(prefix));
  }

  /** Delete every record of `kind` whose name starts with `prefix`; returns "name (id) -> status" lines. */
  async deleteByPrefix(kind: TemplateKind, prefix: string): Promise<string[]> {
    const results: string[] = [];
    for (const { id, name } of await this.findByPrefix(kind, prefix)) {
      const response = await this.page.request.delete(this.url(DELETE_PATH[kind](id)), {
        headers: { authorization: this.authorization! },
      });
      results.push(`${name} (${id}) -> ${response.status()}`);
    }
    return results;
  }
}
