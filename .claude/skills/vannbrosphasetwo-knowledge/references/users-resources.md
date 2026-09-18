# Users, Roles, Resources

Source manuals: *Primary VannBrosPhaseTwo User Roles*, *Users, User Roles & User Groups setup*, *Creation of Resources*, *Creation of Resource groups* — Vann Brothers / VBS, V1.0.

Two systems are involved: **D365 F&O** (resources & resource groups) and the **VannBrosPhaseTwo Farm Web App** (users, user roles, user groups, user enterprise). A user mapping links them.

## Concepts

| Entity | System | What it is |
|---|---|---|
| **Resource** | D365 F&O | A single human or machinery unit (own worker, cost/unit, calendar, project category). Records actual labor/machinery cost. |
| **Resource Group** | D365 F&O | A grouping of resources tied to a Site, with group-level cost categories/capacity/calendar. Used to track operations. Examples: Implement, Cult, FH (Farm Hand), MO (Machine Operator), tractor, Tractors. |
| **User** | Farm App | An account; mapped to a D365 Resource, optionally Admin / attendance approver / Farm App Manager, placed in a User Group. |
| **User Role** | Farm App | A named set of web + mobile permissions (permission template). |
| **User Group** | Farm App | Binds a Role + Enterprise + Farms/Locations + attendance setting + badge color; users belong to groups. |
| **User Enterprise** | Farm App | Top-level grouping tied to a set of Crops; chosen when creating a User Group. |

## Primary user roles (conceptual model)

Five primary roles (overview also names Team Lead). Full permission lists:

**Manager** — Web + Mobile, Administrative
- Create/manage work orders
- Review & approve/reject user attendance (if enabled)
- Adjust attendance & break hours (if enabled)
- Assign responsible persons to WOs
- Create material & inspection templates
- Modify farm planning (crop, resources, material updates)
- Generate/manage harvest work orders (if harvesting enabled)
- Assign & review machine operators and field hands
- Approve field-progress adjustments
- Manage role-based user permissions & access control
- Create & modify attributes
- Toggle the responsible-person designation (one per WO at a time)
- Retain edit rights on progress in the Farm App

**Supervisor** — Mobile, Field Leadership
- Start/end WOs for self and others
- Clock in/out other users (if attendance enabled)
- Assign & adjust machine operators and farmhands
- Review & update field progress
- Generate & assign harvest tickets (if harvesting enabled)
- Approve/modify task completions
- Switch/select other users or machines from mobile
- Adjust/modify users' progress
- Participate in multiple active WOs simultaneously
- Remove & assign a new responsible person

**Responsible Person** — Mobile, Field Coordinator
- Single designated person per work order
- Enter progress updates & task completions
- Clock in/out assigned resources (if attendance enabled)
- Add/remove team members or machinery from WOs
- Can start a WO even if not clocked in
- Maintain task accountability
- Add/remove team leads

**Machine Operator / Farm Hand** — Mobile, Field Worker
- Clock in/out for daily attendance
- Start assigned jobs/tasks
- Add progress updates
- Record material consumption
- Pause/resume jobs
- Mark daily progress & completion
- Chat with field staff & management
- Create observations & points of interest

Feature gates appear throughout: "(if attendance is enabled)", "(if attendance and break hours is enabled)", "(if harvesting is enabled)".

## D365: create a Resource

Org path: **Organization administration > Resources > Resources** (Resources node also holds Gantt charts, Resource capabilities, Resource groups).

1. Type **Resource number**. 2. **Description**. 3. **Resource type** (Human resources / machinery). 4. Select **worker**. 5. **Cost per unit** + unit. 6. **Project category**. 7. Assign **Calendar**. 8. Select relevant **resource group**.

Key fields: header `Resource`, `Description`, `Type`; General/Resource (`Vendor`, `Worker`, `Worker name`); Operation → Cost (`Cost per unit`, `Usage UOM` e.g. hr), `Project Category` (e.g. CONTRACT LABOR); Calendars sub-grid (`Calendar` e.g. STD 8H, `Expiration` Never); Resource groups sub-grid. Toolbar: `Save`, `+ New`, `Delete`, `Resource`, `Options`.

**Prerequisite:** the Worker must already exist in the system before creating the resource.

## D365: create a Resource Group

Org path: **Organization administration > Resources > Resource groups**.

1. **Resource group name**. 2. **Description**. 3. Select **Site**. 4. **Resource Group type** (e.g. Implement). 5. **Project category** (e.g. DIRECT LABOR). 6. Select **Calendar**.

Key fields: header `Resource group`, `Description`, `Site` (e.g. 01), `Resource Type`; Operation → Cost categories (`Setup category`, `Run time category`), `Project Category`; Capacity (`Capacity unit`, `Capacity`, `Batch capacity`); Calendars sub-grid. Toolbar: `Save`, `+ New`, `Delete`, `Resource group`, `Options`.

**Prerequisite:** the Site must be defined in the system first.

## Farm App: user mapping process

Order is enforced by dependency: **Resource (D365) → User Enterprise → User Role → User Group → Users → assign Resource/Group**.

Navigation: **Settings** gear → **User Management** tab. Left submenu: `Users`, `User Groups`, `User Role`, `User Enterprise`, `Mobile User Roles`.

1. **Create User Enterprise** (User Enterprise Management → Create): **Name\*** ("Enter user enterprise name"), **Crops** (multi-select). Save.
2. **Create User Role** (User Roles Management; tabs `All / Active / In Active` → **+ Add User Role**): **Name**, **Description**, then **Web App Permission** groups (checkboxes):
   - **Map**: View
   - **Planning**: View, Critical Activity
   - **Work Order**: View, Create, Update, Print, Recall, Submit, Mark As Done, Manage Harvest Ticket, Manage Harvest ID
   - **Material Template**: View, Create, Update
   - **Inspection Template**: View, Create, Update, Publish
   - **Attribute Inspection Template**: View, Create, Update
   Save.
3. **Create User Group** (User Groups Management → Create User Group): select **Enterprise** (from step 1), select **Role** (from step 2), choose **Farms** and **Locations**, enter **Name\*** ("Enter user group's name"; helper "Please enter the name for user group"), **Badge Color** (default `#000000`), **Description**, **Bypass Attendance** toggle (on = users skip clock-in/out). Save.
4. **Add Users** (User Management → **+ Add**): import users as required.
5. **Assign Resources** (Edit a user): toggle **`Rights to Admin`** (on for admins), select the D365 **Resource** (e.g. "00600 (00600)"), set **Attendance Approver** toggle/dropdown + **Location Tracking Interval** (e.g. "0h:30m"), **Form App Manager** toggle, assign **User Groups**. Save.

Users list columns: `Name`, `Email Address`, `User Roles`, `User Groups`, `Resource`, `Admin`, `Form App Manager`, `Attendance Approver`, `Status`, `Actions`. Filters: `All / Active / Inactive`.

Example User Roles in system: Admin, Admin Manager, CFO, Farm Operations Manager, Field Workers, Folio3 Testing, Full Planner, General Manager – Permanent Plantings, General Manager – Rowcrop North/South.
Example User Groups: Admin Users Full Access, Folio3 Testing, Manager Group, Permanent Plantings Field Workers, Permanent Plantings Managers, Plan Material Group.
Example User Enterprises: Folio3 Enterprise, User enterprise.

## Gotchas

- The **D365 Resource must exist before** you can assign it to a Farm App user.
- The five conceptual roles are the model; concrete access is realized via configurable **User Roles** (permission checkboxes).
- **Bypass Attendance** is set at the **User Group** level.
- Admin status is set per user via **Rights to Admin**.
