# Template Management

Source manuals: *Create Inspection Template*, *Create Material Template*, *Creation of Attribute Template*, *Enabling and Cloning of Inspection template* — Vann Brothers / VBS, V1.0.

## Concepts & relationships

Three template types, all managed from the top-nav **Template Management** module, landing on the **Template Attribute Management** screen (tiles: **Inspection Template**, **Material Template**, **Attribute Template**).

- **Attribute Template** (a.k.a. attribute) = a single typed data-capture field. The reusable building block.
- **Inspection Template** = a named, reusable inspection form assembled from attributes (drag-and-drop) + a default-location count. When **Enabled + Published**, it appears in the Inspection Work Order's `Inspection Template` dropdown.
- **Material Template** = a task-linked, multi-tab spec for applying material(s): products, rates/mix methods, target problems, and spray application setup. Used by tank-mix work orders.

**Authoring role:** Manager (the demo user shown is "Crop Planner"). Field roles do not author templates. (Permission checkboxes that grant this: Material Template View/Create/Update; Inspection Template View/Create/Update/Publish; Attribute Inspection Template View/Create/Update — see `users-resources.md`.)

Breadcrumbs: `Home > Template Management > Inspection Templates` / `> Attribute Template` / `> Material Template`.

## Attribute Template

8 attribute **types** (label → subtype):
- Comment Box (CommentBox)
- Custom Slider (CustomSlider)
- Date Time Picker (DateTimePicker)
- List Picker (ListPicker)
- Number Pad (NumberPad)
- Number Slider (NumberSlider)
- Switch (Switch)
- Key Value (KeyValue)

**Flow:** Template Management → **Attribute Template** tile → **Attributes** screen (card grid, each card has an **Enable** toggle + `Normal` badge; `Search Attributes` box) → **Create** → **Add New Attribute** panel (wizard tabs **Select Attribute → Attribute Details**): pick type → **Next** → enter **Name\*** → **Save**. Buttons: `Next`, `Save`, `Save & Add New`, `Back`, `X`.

Fields: **Name\*** (text), **Attribute Status\*** (Enable toggle). Each attribute card can be independently Enabled/Disabled.
Success toast: **`Attribute created successfully`**.
Effect: the new attribute appears in **Available Attributes** when creating an inspection template.

Examples: "Add comments" (CommentBox); "Melon deceases" (ListPicker: Alternaria leafspot, Anthracnose, Cucumber…); "Fruit Size" (KeyValue: Small=2, Medium=4, Large=8); "date and picker" (DateTimePicker).

## Inspection Template

**Flow:** Template Management → **Inspection Template** tile → **Inspection Templates** list (tabs `All | Draft | Published`; `Filter`; refresh) → **Create** → side panel **Create New Template** (`Normal` badge, section **Enter Title & Select Attributes**):
1. **General**: enter **Name\***, **Default Locations\*** (numeric, defaults to 1).
2. **Select Attribute\***: drag attributes from **Available Attributes** → **Selected Attributes** (both searchable via "Type & Enter").
3. Save: **`Save & Publish`** (→ Published) or **`Save as Draft`** (→ Draft).

Required: Name, Default Locations, Template Status, Select Attribute. **Template Status\*** is an **Enable** toggle.
List columns: `Name`, `Status`, `Type`, `Attribute Count`, `Default Location`, `Created By`, `Created At`, `Modified By`, (`Modified At`, `Template Status`, `Action`).
Success toast: **`Template created successfully`**.

Two independent status dimensions:
- **Status** (lifecycle): `Draft` (Save as Draft) / `Published` (Save & Publish).
- **Template Status** (availability): `Enabled` / `Disabled` — gates whether the template appears in work orders.

### Enabling / Disabling

- **Enable**: toggle the **Template Status** switch On → reads **Enabled**. "Once enabled, the template will be visible in the workorder when creating the inspection workorder." (Work Orders → Inspection tab → Create → `Inspection Template` dropdown lists enabled templates, e.g. "DEMO INSPECTION".)
- **Disable**: toggle Off → confirmation dialog **`Disable Template Status`** / body **`Are you sure you want to change the Template Status`** → `Cancel` / `OK`. After OK → **Disabled**; the template no longer appears in the WO inspection-template dropdown.

### Cloning

On the Inspection Templates list, in the **Action** column click the **Clone template** icon:
- Name auto-generated as **`Copy of <name>`** (e.g. "Copy of testing inspection").
- Selected attributes copied automatically; add more via drag-and-drop.
- Click **`Save & Publish`** to finish. New template appears in the list; toast **`Template created successfully`**.

## Material Template

Wizard tabs across the top: **Basic Details → View Details → Problem Details → Application Details**.

**Flow:** Template Management → **Material Template** tile → **Material Templates** list (columns `Name`, `Task`, `Actions`; "No Record Found" when empty; `Filter`, refresh) → **Create New Material Template**.

1. **Basic Details**: **Material Title\*** (text), **Task\*** (dropdown), **Additional Comments** (optional). → next tab.
2. **View Details**: **Select Product** (searchable, e.g. "Allzcor Insecticide (279-9607) (00001)"); **Mix Method** (`Per Area` / `Per Volume`); **Rate** + **Rate Unit** (e.g. fl. oz); **Per** (e.g. acre); optional **Withholding Period** (collapsible) + **Re-entry (REI) Hours**. Buttons **Save & Add New** (repeat for multiple materials), **Delete**.
   - Rule (verbatim): "If the material rate is given per acre then this should be **Per Area**, if rate is per gal or per 100 gal then mix method should be **Per Volume**."
3. **Problem Details**: **Select Problem** (dropdown), **Infestation** (value), **Infestation Unit** (e.g. %), **Description**. **Save** (repeatable). Example: Cutworm, Infestation 10, Unit %.
4. **Application Details** (section **Liquid Application**): **Application Method**, **Nozzle Type**, **Droplet Size** (dropdowns); **Total Application Rate** (gal/ha), **Tank Size** (Gal), **Preharvest (PHI)** (days). **Save** → "The material template will be successfully saved." Example: Air-blast Sprayer, Total 70, Tank 500, Twin Flat, Fine.

Right **Summary** panel groups: `General` (Title, Location, Task), `Materials`, `Problems`, `Additional Information` (Application Type e.g. Liquid, Application Measurement Size e.g. Percentage, Application Method, Total Application Rate, Tank Size, Nozzle Type, Droplet Size).

Required: Material Title, Task. No Draft/Published or enable/clone behavior documented for material templates — single Save flow. Supports multiple materials and multiple problems per template.

## Quick reference

- Save buttons: **Save as Draft** (→ Draft) vs **Save & Publish** (→ Published); attribute wizard adds **Next** / **Save** / **Save & Add New**.
- Inspection/Attribute type badge = **Normal**.
- Material Template Mix Method: **Per Area** (rate per acre) vs **Per Volume** (rate per gal / 100 gal).
- Enabled inspection templates flow into: **Work Orders → Inspection tab → Create → Operation Type "Inspection" → Inspection Template dropdown**.
- Toasts: **`Template created successfully`**, **`Attribute created successfully`**.
- Disable dialog: **`Disable Template Status`** / **`Are you sure you want to change the Template Status`** → Cancel/OK.
