export const QA_BASE_URL = 'https://agrierp-vann-qa.folio3.site';
export const QA_HOST = 'agrierp-vann-qa.folio3.site';

/**
 * The tenant/environment to pick in the auth gateway's "Choose Environment" dialog, which
 * appears after the email on `/login` and gates the hand-off to Azure AD.
 *
 * It offers three (verified live 2026-08-31): `Vann Brothers - QA`, `Vann Brothers - Dev`
 * and `AgriERP D365 Internal - Demo`. Picking is NOT optional and the default is not safe to
 * assume — choosing wrongly would authenticate the suite against Dev or an internal demo
 * tenant, which `assertQaOnly` would not catch: that guard checks the *host*, and all three
 * environments are reached through the same one.
 */
export const QA_ENVIRONMENT_LABEL = 'Vann Brothers - QA';

/**
 * Full route map, extracted from the compiled Angular bundles of
 * agrierp-vann-qa.folio3.site. Paths are absolute (leading slash).
 */
export const routes = {
  root: '/',
  login: '/login',

  maps: {
    root: '/maps',
    verticalFarming: '/maps/vertical-farming',
  },

  cropMgmt: '/crop-mgmt',
  myActivities: '/my-activities',

  templateMgmt: {
    root: '/template-mgmt',
    inspectionTemplates: '/template-mgmt/inspection-templates',
    inspectionTemplateDetail: '/template-mgmt/inspection-templates/:id',
    activityDetails: '/template-mgmt/activity-details',
    activityDetail: '/template-mgmt/activity-details/:id',
    templateAttribute: '/template-mgmt/template-attribute',
  },

  // The list's four sub-tabs (Work Orders | Inspection Work Orders | Harvest Work
  // Orders | Point Of Interests) are in-page buttons, NOT routes - they all live at
  // /workorders. Switch tabs by clicking, not by navigating.
  workorders: {
    root: '/workorders',
    detail: '/workorders/:id',
    pointOfInterest: '/workorders/point-of-interests/:id',
  },
  printWorkorder: '/print/workorder',

  // Harvest *tickets* (top-nav "Harvest Central"), distinct from Harvest work
  // orders, which live under the /workorders Harvest Work Orders sub-tab.
  // `detail` is reached via the list row's "View details." chevron.
  harvestCentral: {
    root: '/harvest-central',
    detail: '/harvest-central/:id',
  },

  attendance: {
    root: '/attendance', // redirects -> /attendance/users
    users: '/attendance/users',
    user: '/attendance/users/:userID',
    userStats: '/attendance/users/:userID/stats',
  },

  messaging: '/messaging',
  productDetail: '/product-detail/:id',
  updates: '/updates',
  report: '/report',

  syncConsole: {
    root: '/sync-console', // redirects -> user-app-version
    connections: '/sync-console/connections',
    messages: '/sync-console/messages',
    serviceStatus: '/sync-console/service-status',
    syncHistory: '/sync-console/sync-history',
    syncHistoryV2: '/sync-console/sync-history-v2',
    apiLogs: '/sync-console/api-logs',
    stats: '/sync-console/stats',
    logs: '/sync-console/log',
    userAppVersion: '/sync-console/user-app-version',
  },

  settings: {
    root: '/settings',
    userSettings: '/settings/user',

    users: {
      root: '/settings/users', // redirects -> user-list
      userList: '/settings/users/user-list',
      userGroups: '/settings/users/user-groups',
      userRoles: '/settings/users/user-roles',
      userEnterprise: '/settings/users/user-enterprise',
      mobileUserRoles: '/settings/users/mobile-user-roles',
    },

    masterDataLibrary: {
      root: '/settings/master-data-library', // redirects -> products
      products: '/settings/master-data-library/products',
      activeIngredients: '/settings/master-data-library/active-ingredients',
      crops: '/settings/master-data-library/crops',
      pests: '/settings/master-data-library/pests',
    },

    notification: {
      root: '/settings/Notication', // sic - spelled "Notication" in source
      template: '/settings/Notication/Template',
      event: '/settings/Notication/Event',
      placeholder: '/settings/Notication/Placeholder',
    },

    dynamicsSystemSetting: '/settings/dynamics-system-setting',
    cloudFunction: '/settings/cloud-function',
    crop: '/settings/crop',
    machineAndImplement: '/settings/machine-and-implement',
    location: '/settings/location',
    season: '/settings/season',
    cultivation: '/settings/cultivation',
    resources: '/settings/resources',
    teams: '/settings/teams',
    task: '/settings/task',
    materials: '/settings/materials',
    templateManagement: '/settings/template-management',
    materialGroupMapping: '/settings/material-group-mapping',
    sequenceNumberConfig: '/settings/sequence-number-config',
    mapsToggleConfig: '/settings/maps-toggle-config',
  },

  // Error pages render without a session (no login redirect).
  accessDenied: '/accessdenied',
  forbidden: '/forbidden',
  unauthorized: '/unauthorized',
  unknownError: '/unknownerror',
  notFound: '/**',
} as const;

/** Resolve a route to an absolute URL - needed for waitForURL/comparison against page.url().
 * 
 * ```ts
 * routeUrl(routes.maps.root) -> `https://agrierp-vann-qa.folio3.site/maps`
 * ```
 */
export function routeUrl(path: string): string {
  return new URL(path, QA_BASE_URL).href;
}
