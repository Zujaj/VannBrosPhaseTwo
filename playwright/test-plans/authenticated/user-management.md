# Test Plan — User Management (Settings)

- **Spec:** _none yet — manual only_
- **Automation status:** Manual
- **Source of truth:** `vannbrosphasetwo-knowledge/references/users-resources.md`
- **Last updated:** 2026-10-16
- **Scope note:** Attendance roster (`/attendance/users`) excluded — hidden feature set, not in scope. All Site/Farm-scoped test data limited to **Yolo** and **Colusa** only; skip other sites.

Nav: **Settings gear → User Management** tab. Left submenu: `Users`, `User Groups`, `User Role`, `User Enterprise`, `Mobile User Roles`.

Dependency order enforced by the app: **D365 Resource → User Enterprise → User Role → User Group → Users → assign Resource/Group**. Cases below follow that order.

---

## User Enterprise

| Field | Content |
|---|---|
| **ID** | UM-001 |
| **Title** | Create a User Enterprise |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P1 |
| **Preconditions** | Logged in as Admin; on `/settings/users/user-enterprise` |
| **Steps** | 1. **User Enterprise Management → Create**. 2. **Name\*** = `QA Enterprise Yolo`. 3. **Crops** multi-select = pick a crop scoped to Yolo. 4. **Save**. |
| **Test data** | Name: `QA Enterprise Yolo`; Crops: any crop mapped to Yolo |
| **Expected result** | New row appears in User Enterprise list with the entered name and crops. |
| **Type** | Functional / P1 |

| Field | Content |
|---|---|
| **ID** | UM-002 |
| **Title** | User Enterprise blocks save with empty Name |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Preconditions** | On Create User Enterprise form |
| **Steps** | 1. Leave **Name** empty. 2. Select Crops. 3. Click **Save**. |
| **Expected result** | Save blocked; required-field validation shown on **Name** ("Enter user enterprise name"). No new row created. |
| **Type** | Negative / P2 |

---

## User Role

| Field | Content |
|---|---|
| **ID** | UM-010 |
| **Title** | Create a User Role with Work Order permissions |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P1 |
| **Preconditions** | On `/settings/users/user-roles`, tab **All** |
| **Steps** | 1. **+ Add User Role**. 2. **Name** = `QA Field Worker Role`. 3. **Description** = `QA regression role`. 4. Check **Work Order**: View, Create, Update, Submit. 5. Check **Map**: View. 6. **Save**. |
| **Test data** | Name: `QA Field Worker Role` |
| **Expected result** | New role appears under **Active** tab with checked permissions persisted (re-open role to confirm checkboxes retained). |
| **Type** | Functional / P1 |

| Field | Content |
|---|---|
| **ID** | UM-011 |
| **Title** | User Role list tabs filter by status |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Steps** | 1. Open **User Roles Management**. 2. Click **All**, then **Active**, then **In Active**. |
| **Expected result** | Each tab shows only roles matching that status; counts/rows change accordingly. |
| **Type** | Functional / P2 |

| Field | Content |
|---|---|
| **ID** | UM-012 |
| **Title** | Inspection Template permission group gates template actions |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Steps** | 1. Create role with **Inspection Template**: View only (no Create/Update/Publish). 2. Assign role to a test user via a User Group (see UM-030+). 3. Log in as that user. 4. Navigate to **Template Management → Inspection Templates**. |
| **Expected result** | User can view inspection templates list but **Create/Publish** actions are hidden or disabled. |
| **Type** | Functional / P2 — permission boundary |

---

## User Group

| Field | Content |
|---|---|
| **ID** | UM-020 |
| **Title** | Create a User Group scoped to Yolo and Colusa |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P1 |
| **Preconditions** | UM-001 (Enterprise) and UM-010 (Role) exist |
| **Steps** | 1. **User Groups Management → Create User Group**. 2. **Enterprise** = `QA Enterprise Yolo`. 3. **Role** = `QA Field Worker Role`. 4. **Farms/Locations** = select **Yolo** and **Colusa** only. 5. **Name\*** = `QA Group Yolo-Colusa`. 6. **Badge Color** = leave default `#000000`. 7. **Bypass Attendance** = off. 8. **Save**. |
| **Test data** | Name: `QA Group Yolo-Colusa`; Farms: Yolo, Colusa |
| **Expected result** | New group row listed with correct Enterprise/Role and Farms = Yolo, Colusa. |
| **Type** | Functional / P1 |

| Field | Content |
|---|---|
| **ID** | UM-021 |
| **Title** | Bypass Attendance toggle on User Group |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Steps** | 1. Edit `QA Group Yolo-Colusa`. 2. Toggle **Bypass Attendance** ON. 3. Save. 4. Assign a user to this group (UM-030). |
| **Expected result** | Users in this group skip clock-in/out requirement (verify via that user's mobile session skipping attendance gate — out of web scope, note as precondition-only check if mobile unavailable). |
| **Type** | Functional / P2 |

| Field | Content |
|---|---|
| **ID** | UM-022 |
| **Title** | User Group required-field validation |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Steps** | 1. Open Create User Group. 2. Leave **Name** empty, pick Enterprise/Role/Farms. 3. Save. |
| **Expected result** | Blocked; helper text "Please enter the name for user group" shown. |
| **Type** | Negative / P2 |

---

## Users

| Field | Content |
|---|---|
| **ID** | UM-030 |
| **Title** | Add a user and assign Resource, Group, Admin rights |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P1 |
| **Preconditions** | A D365 Resource already exists (prerequisite — resource must exist before assignment); `QA Group Yolo-Colusa` exists (UM-020) |
| **Steps** | 1. **User Management → + Add**. 2. Fill user Name/Email. 3. Edit user → toggle **Rights to Admin** = on. 4. Select D365 **Resource** (e.g. `00600 (00600)`). 5. Set **Attendance Approver** toggle. 6. Set **Form App Manager** toggle. 7. Assign **User Groups** = `QA Group Yolo-Colusa`. 8. **Save**. |
| **Expected result** | Users list row shows correct Name, Email, User Roles (inherited from group's role), User Groups = `QA Group Yolo-Colusa`, Resource, Admin = Yes, Status = Active. |
| **Type** | Functional / P1 |

| Field | Content |
|---|---|
| **ID** | UM-031 |
| **Title** | Users list status filter (All/Active/Inactive) |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Steps** | 1. On Users list, click **All**. 2. Click **Active**. 3. Click **Inactive**. |
| **Expected result** | Row set changes to match filter; a user toggled to Inactive (see UM-033) appears only under **All**/**Inactive**. |
| **Type** | Functional / P2 |

| Field | Content |
|---|---|
| **ID** | UM-032 |
| **Title** | Users list columns render correctly |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Steps** | 1. Open Users list. 2. Verify columns present: `Name`, `Email Address`, `User Roles`, `User Groups`, `Resource`, `Admin`, `Form App Manager`, `Attendance Approver`, `Status`, `Actions`. |
| **Expected result** | All 10 columns present, populated per user created in UM-030. |
| **Type** | Functional / P2 |

| Field | Content |
|---|---|
| **ID** | UM-033 |
| **Title** | Change user status (Active → Inactive) |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P1 |
| **Preconditions** | UM-030 user exists, Active |
| **Steps** | 1. On Users list, locate test user row. 2. Click **Change status** action icon. 3. Confirm. |
| **Expected result** | Row **Status** flips to **Inactive**; row disappears from **Active** filter, appears under **Inactive**. |
| **Type** | Functional / P1 |

| Field | Content |
|---|---|
| **ID** | UM-034 |
| **Title** | Assigning a non-existent D365 Resource is blocked |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Steps** | 1. Edit a user. 2. Open **Resource** picker. |
| **Expected result** | Only Resources that already exist in D365 are selectable — a resource not yet created in D365 F&O does not appear in the picker. |
| **Type** | Negative / P2 — gotcha from knowledge skill |

| Field | Content |
|---|---|
| **ID** | UM-035 |
| **Title** | Import Users |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P3 |
| **Steps** | 1. On Users list, click **Import Users**. 2. Upload a valid import file scoped to Yolo/Colusa users. |
| **Expected result** | Imported users appear in list with correct fields; invalid rows (if any) are reported, not silently dropped. |
| **Type** | Functional / P3 |

---

## Mobile User Roles

| Field | Content |
|---|---|
| **ID** | UM-040 |
| **Title** | Mobile User Roles list loads and reflects mobile permission set |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Preconditions** | On `/settings/users/mobile-user-roles` |
| **Steps** | 1. Open **Mobile User Roles**. 2. Verify list of mobile-specific roles (Supervisor, Responsible Person, Machine Operator/Farm Hand, Team Lead). |
| **Expected result** | List loads without error; roles map to the five conceptual mobile roles per knowledge skill. |
| **Type** | Functional / P2 |

---

## Cross-entity / permission boundary

| Field | Content |
|---|---|
| **ID** | UM-050 |
| **Title** | Only one Responsible Person per work order (role boundary carried from User Role) |
| **Module** | Users & Roles | **Role** | Responsible Person | **Platform** | Mobile (precondition note — web-side role assignment only in scope here) | **Priority** | P2 |
| **Steps** | 1. Confirm via Users list that two QA users both have the `Responsible Person`-capable role in a Yolo/Colusa group. 2. (Mobile, out of web scope) Attempt to designate both as Responsible Person on the same WO. |
| **Expected result** | Web-side setup correct; enforcement of single Responsible Person is a mobile-side check — note as cross-reference to mobile test plan, not re-verified here. |
| **Type** | Functional / P2 — boundary documentation only |

| Field | Content |
|---|---|
| **ID** | UM-051 |
| **Title** | Deleting/deactivating a User Role in use does not silently break assigned Users |
| **Module** | Users & Roles | **Role** | Manager/Admin | **Platform** | Web | **Priority** | P2 |
| **Steps** | 1. Set `QA Field Worker Role` (UM-010) to **In Active**. 2. Reopen `QA Group Yolo-Colusa` (which references it). 3. Reopen a User assigned via that group. |
| **Expected result** | Group/User still display the role (no orphaned/blank reference); app either blocks deactivation while in use or clearly flags the dependency — confirm actual behavior and log as bug if it silently breaks. |
| **Type** | Negative / P2 |

---

## Coverage summary

Entities covered: User Enterprise, User Role (permission checkboxes), User Group (Enterprise+Role+Farms+Bypass Attendance+badge), Users (CRUD, Resource/Admin/Attendance Approver/Form App Manager assignment, status toggle, import), Mobile User Roles. Excluded by scope: Attendance roster screens (hidden feature, not tested); all farm/site data outside **Yolo** and **Colusa**.

Next: hand this file to `vannbrosphasetwo-playwright` to generate `playwright/tests/authenticated/user-management.spec.ts`, then flip Automation status above.
