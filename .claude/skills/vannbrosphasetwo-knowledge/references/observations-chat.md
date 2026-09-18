# Observations / POI & Communication Center

Source manuals: *Observations / Point of Interest (Web)*, *Chat & Communications (Web)* — Vann Brothers / VBS, V1.0.

## Observations / Point of Interest (POI)

### Concept

An **Observation / Point of Interest (POI)** is a categorized field condition logged against a Farm and specific Plot(s) — e.g. pest/insect attack, water logging — with a category, color, icon, optional attachments (photos/PDFs), comments, and a map location.

**Created on mobile** (note, verbatim): "You can create work orders from observations. Observations are created on mobile, please refer Creating Observations (Mob)." Per the intro deck, observations/POI are only viewable by the **manager** on mobile. The **web** is used to (a) configure POI categories and (b) convert an existing observation into a work order.

### Create a POI Category (web)

**Settings** gear → **Map Toggle Config** (left bar) → the page has collapsible sections: `Stages`, `Crops`, `Task`, `Work Orders`, `Observation Categories`.

1. Click **`Create New POI Category`** (top-right) → panel **`Create Point of Interest Category`**.
2. **Enter Title\*** (e.g. "Spider Mite Attack"), **Select Color\*** (red/amber/green/blue swatches), **Select Icon\*** (info, shield/exclamation, list/bars, water-drop, leaf).
3. Turn **Active** toggle on → **Save**. (**Visible** toggle controls map visibility, on by default.)

New category appears under **Observation Categories**. Example categories: `water logging`, `Spider Mite Attack`, `POI Cat`.

### Create a Work Order from an Observation (web)

1. Top menu **Work Orders** → **Observations** tab.
2. Click an observation row → click the **eye icon** (View) → Summary side panel (`General`, `Plots`).
3. Click **`Create Work Order`** (top-right, has dropdown caret) → choose **`Planned`** or **`Inspection`**.
4. The matching WO creation form opens, carrying the observation's farm/plot/category context. (Planned → ad-hoc WO flow; Inspection → adhoc inspection WO flow — see `work-orders.md`.)

### Fields & columns

- **Observations tab** columns: `Title`, `Farm`, `Plots`, `Category`, `Created Date`, `Created By`, `Actions`.
- **Observation detail**: `Farm`, `Created Date`, `Created By`, `Attachment Detail` → **`View Attachment(s)`**, `Observation Category` (colored marker). **Plot Details** table (`Plot`, `Comments`). **Map** section (Map / Satellite toggle) highlighting the plot.
- POI category form required fields: **Enter Title\***, **Select Color\***, **Select Icon\***. Toggles: **Active**, **Visible**.

### Map linkage

POI categories appear as togglable layers in the Maps "Maps Control" panel, alongside: Stages, Crops, Task, Active/Draft/Completed Inspections, Active/Draft/Upcoming/Completed Work, and **Observations**.

## Communication Center (Chat)

### Concept

In-app messaging in the Farm App web (top nav **Communication Center**; older builds **Messaging**). Supports 1:1 and group conversations with text, photos, documents, and voice notes. No role restriction stated — any user with menu access can chat. Contacts shown as `Name | NNNNNN` (employee/user ID), e.g. "Jose Velasquez | 000015".

### Flows

**New 1:1 chat:** Communication Center → **`+`** icon (top-left, next to "Messages") → **`New Chat`** → select person (`Chat Now` dialog, "Search User") → type message → **send**.

**Group chat:** Communication Center → **`+`** → **`Group Chat`** → **`Create group chat`** dialog (enter group's name → **Create**) → **`Create New Group`** panel (search & select participants; "x" to remove) → **Next** (green next icon) → type → **send**. Group header shows name + **`View details`**.

**Attachments:** in the chat composer click the **camera** icon (photos) or **paperclip** (documents) → pick file → **Open** → **Send**.

**Voice notes:** click the **microphone** icon → speak (timer shows, e.g. "00:06") → **done** (blue check) or cancel (x).

### Fields / controls

- `Search` (Messages list filter), message text field ("Type a message").
- Composer icons: camera, microphone, paperclip, **Send**.
- Dialogs: `Chat Now` ("Search User"); `Create group chat` ("Enter group's name", Cancel/Create); `Create New Group` (participant multi-select).
- Messages list shows media-type labels (e.g. `AUDIO`) + timestamps.
- Empty state: "Welcome, <user>", "Here Are Some Quick Actions To Get You Started", "Search for someone to start chatting with", **New Conversation** button.

No required fields, statuses, or error messages documented for chat.
