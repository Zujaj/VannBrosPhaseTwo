# AgriERP System Implementation - Training Notes

## Session Overview

**Date:** Training Session (First Overview)
**Topic:** End-to-End Process Flow & Master Data Setup
**Purpose:** Familiarize all participants with the complete AgriERP implementation process

---

## Session Objectives

- Understand the complete end-to-end flow of the AgriERP client implementation
- Learn what master data setup is required in the system
- Understand who is responsible for setup (implementation team vs. client)
- Learn the process flow for running the system
- Document time requirements for each process

---

## Key Topics Covered

### 1. Process Overview

#### Starting Point

- The process begins with **ERP** (Enterprise Resource Planning)
- Master data flows through the system
- Then the process officially starts
- Multiple departments in the client organization will need to run the process

#### Process Flow Components

1. **ERP Integration** - Where market data flows
2. **Resource Planning (RP)** - Multiple activities occur
3. **Financial Effects Review** - Birth and closing process
4. **Multi-Department Execution** - Entire process needs to run across departments

#### Purpose of Overview Session

- Ensure all participants understand the complete end-to-end process
- Help with CRP (Capacity Requirements Planning) planning in later phases
- Identify what needs to be covered vs. what to skip
- Determine start and end points of implementation

---

## 2. Master Data Setup & Configuration

### 2.1 AgriERP Module Setup

**Location:** Product Information Management → AgriERP Management

This new module contains setup for AgriERP integration.

#### 2.1.1 Crop Item Groups

- **Purpose:** Define which item groups sync with the crop
- **Configuration:** Specify which item groups are included/excluded from syncing
- **Note:** Only defined item groups will sync; others will not

#### 2.1.2 Material Atom Groups

- **Purpose:** Define material atom groups for syncing
- **Configuration:** Only specified atom groups sync for material processes
- Other atom groups will not sync for material processes

#### 2.1.3 Project Sync Stage

- **Purpose:** Define which project stage triggers the sync
- **Configuration:** Use dropdown to select the exact stage where projects sync
- **Note:** Different stages are available for different scenarios

#### 2.1.4 Work Order Management

- **General Definition:** Define which generals apply to work orders
- **Configuration:** Specify which generals are generated for the module
- **Example:** Generics for Inventory Application
  - Inventory Issue generics
  - Inventory Return generics
  - Staging location/warehouse configuration

#### 2.1.5 Farm Stage & Staging Location

- **Staging Warehouse:** Define the staging warehouse location
- **Staging Location:** Define where inventory is received

### 2.1.6 Irrigation Method

- **Status:** Maintained in AgriERP
- **Sync Process:** Syncs from AgriERP to system
- **Note:** Currently disabled; buttons will be disabled when integration is complete

#### 2.1.7 Farm Operations

- **Purpose:** Maintain farm operations in the system
- **Process:**
  1. Maintain in system
  2. Sync through WBS (Work Breakdown Structure)
  3. Sync to AgriERP
- **Master Data:** Operation list includes:
  - Operation ID
  - Status
  - Operation Name
  - Operation Type (only Certified type syncs)
- **Non-Certified Operations:** Open operations do not sync

#### 2.1.8 Farming Activity & Dimensions

- **Purpose:** Each operation has its own farming activity
- **Dimension Requirements:** Define dimensions within each farming activity
- **Example:** Commodity-based dimensions

#### 2.1.9 Plot Management

- **Plot Setup:** Opens in AgriERP (maintained upstream)
- **New Field:** Irrigation Source (new field in system)
- **Field Disable Option:** Can disable fields if not needed
- **Dimensions:** Three dimensions defined for plots:
  1. **Area/Size** - What is the plot area?
  2. **Cost Center** - What is the cost center?
  3. **Field Dimensions** - What field dimensions apply?

#### 2.1.10 Crop Area

- **Configuration:**
  - Crop Area code
  - Description
  - Forecast Model (future implementation, not currently used)
  - Start Date & End Date
  - Dimensions for crop area
- **Dimension Flow:** When a plot is selected for a project, all plot-defined dimensions automatically populate in the project

#### 2.1.11 Plot Dimension Creation Process

- **Step 1:** Create dimension (separate from plot creation)
- **Step 2:** Create crop with dimensions
- **Step 3:** Sync dimension to crop area
- **Automation:** When crop is created, dimensions don't auto-create; must be created separately

#### 2.1.12 Main Account

- **Status:** Related to WIP (Work in Progress)
- **Note:** Set aside for now

---

### 2.2 Resource Management

**Location:** Organization Administration → Resources Tab

#### 2.2.1 Resources Setup

**Prerequisite:** Worker must exist in HR Module

**Resource Creation Process:**

1. **Worker Requirement:**
   - Resource must have a corresponding worker in HR Module
   - Worker must be open/active to assign resource

2. **Resource Creation:**
   - New resource creation
   - Resource number (system-generated or manual)
   - Name/Description
   - Resource Type definition:
     - Human Resource
     - Machinery Resource
     - Other types (Tool, Resource Group - not currently used)

3. **Resource Type Configuration:**
   - Currently using: Human Resource & Machinery only
   - **Human Resource Type:** Enables Worker button
     - Dropdown shows all workers from HR Module
     - Workers must be synced from HR

   - **Machine Type:** Different configuration
     - Usage Unit Measure (UOM) field
     - Cost per Unit definition
     - Cost per hour/per acre based on resource type

#### 2.2.2 Usage Unit Measure & Cost Configuration

**For Human Resources:**

- **Base Unit:** Hour
- **Cost per Hour:** Define hourly rate (e.g., per hour basis cost)

**For Machinery:**

- **Unit:** Depends on use case
  - Could be per hour
  - Could be per acre
- **Cost:** Multiplied by unit (e.g., $10 per acre = 10 × acres)

**System Consideration:**

- Current setup uses Expense category
- Future enhancement needed: Support for Hour-based journaling in addition to Expense

**Custom Field:** Usage Unit Measure field customized for syncing with AgriERP

#### 2.2.3 Resource Group

**Purpose:** Organize multiple resources working together (e.g., harvesting group)

**Configuration:**

- Define resource group type
- Configure standard calendar (8-hour calendar)
- Resource auto-population (when resource is linked to group, automatically appears)
- Multiple resources can be linked to one group

**Custom Field - Resource Group Type:**

- AgriERP-defined types mapped here
- Used for syncing appropriate type to AgriERP

**Example Resource Groups:**

- **Farm Hands (HR):** Used for human resources
- **Machine Operator:** Used for machinery resources (note: name indicates HR but represents machines)

**Calendar:** Standard 8-hour calendar configured (required for syncing)

---

## 3. Product & Item Management

### 3.1 Product Creation Process

**Location:** Product Information Management → Released Products

#### Step 1: Create Product

1. Navigate to **Product**
2. **New Product** creation
3. **Define:**
   - Product Name
   - Product Number
4. **Item Model Group:** Select existing group
5. **FIFO Method:** Define cost calculation method
6. **Units:**
   - Define different unit measurements
   - Example: LB (Pound)
   - Configure for Inventory, Sales, and Purchase

#### Step 2: Configure Item Dimensions

**Storage Dimension:**

- **Site/Warehouse Location Tracking:** Mandatory for all usage
- When selecting item in PO, Sales Order, or Inventory Movement, Site/Warehouse/Location must be defined
- Mandatory for all transactions

**Tracking Dimension Group:**

- **Lot Tracking vs. Non-Lot:**
  - **Lot Track:** Required batch number definition
  - **Non-Lot:** No batch number required

#### Step 3: Release Product

1. Select entity (e.g., VBS)
2. Complete release process
3. Product now available in system

### 3.2 Batch/Lot Management

#### Lot vs. Non-Lot Items

**Non-Lot Items:**

- No batch number required
- Used for general materials without batch tracking
- Simpler inventory management

**Lot-Tracked Items:**

- Batch number is mandatory
- Required for tracking specific batches/lots
- Supports batch-specific inventory management

#### Batch Creation Process

**Batch Creation Form:**

- New batch creation
- Link to specific item
- Once created, batch only shows for that item
- Other items cannot use this batch

**Batch Usage:**

- When receiving inventory:
  - Non-lot items: No batch selection required
  - Lot-tracked items: Must select appropriate batch
  - System enforces batch selection (error if missing)

**Initial Inventory Setup:**

- For opening inventory already in customer's possession:
  - Manually create batch numbers for existing inventory
  - Map batches to items in system
  - Use these batches for initial inventory input (not through PO)

**Batch Numbering:**

- Manual creation and assignment
- Client typically provides existing batch numbers
- New batches created as needed during operations
- Same batch used for multiple In/Out movements (not per transaction)

#### Batch Synchronization

**Automatic Generation (via Inventory App):**

- When receiving through Inventory App
- Different lot numbers may generate automatically
- Both lot-tracked and non-lot items in single PO possible
- Non-lot items: No batch selection shown
- Lot-tracked items: Batch mandatory (system blocks without batch)

---

## 4. Customer Master Setup

### 4.1 Customer Creation

**Location:** Customer Master Form

**Basic Steps:**

1. **New Customer** creation
2. **Organization/Individual Type:** Select organization type (not individual)
3. **Auto-Number Generation:** System auto-generates account number on save
4. **Manual Option:** Can override with custom account number if needed

### 4.2 Customer Configuration

#### 4.2.1 Customer Group Assignment

- **Purpose:** Categorize customers
- **Available Groups:**
  - Domestic
  - Foreign
  - Related Parties
  - Miscellaneous
  - Wallet/Other types
- **Benefits:** Auto-populates currency and payment terms based on group

#### 4.2.2 Currency & Payment Terms

- **Auto-Population:** When customer group selected, relevant currency and terms auto-fill
- **Override Option:** Can modify if needed
- **Not Mandatory:** Can customize per customer

#### 4.2.3 Additional Information Setup

**Address Information:**

- Can define multiple addresses
- Include city, state, country
- For billing/shipping purposes

**Contact Information:**

- Phone numbers
- Emails
- Multiple contact methods supported
- Add via Edit Contact Details

**Payment Method:**

- Cash
- Check
- Electronic Fund Transfer
- Other methods
- **Note:** For downstream usage (not mandatory for basic setup)

#### 4.2.4 Dimension Configuration

- **Auto-Population:** Dimensions can auto-populate when customer selected in documents
- **Purpose:** Ensures consistent dimension assignment across transactions

---

## 5. Work Breakdown Structure (WBS)

### 5.1 Overview

- **Next Topic:** To be covered in next session
- **Integration:** WBS creation before project creation
- **Operations Integration:** Farm operations integrated through WBS

---

## 6. Implementation Timeline & Next Steps

### Session 1 (Completed)

✅ Process Overview  
✅ Master Data Setup  
✅ AgriERP Configuration  
✅ Resource Management  
✅ Product & Item Creation  
✅ Batch Management  
✅ Customer Setup  

### Session 2 (Tomorrow - After Friday Prayer)

- [ ] Work Breakdown Structure (WBS) Creation
- [ ] Project Master Setup
- [ ] Project Integration with Master Data

### Key Considerations

- **Friday Prayer:** Session timing adjusted for Friday schedule
- **Recording:** Sessions recorded for reference
- **Process Time:** Documenting how long each process takes
- **Flexibility:** Can adjust documented times if different from actual

---

## 7. Important Notes & Best Practices

### Resource & Dimension Management

- Dimensions must be created separately before linking to parent entities
- Automation handles syncing for pre-defined dimensions
- Each farming activity has its own dimensions

### Batch Management Strategy

- For existing inventory: Create batches manually first, then use in transactions
- For new receipts: Can auto-generate or manually assign
- Consistent batch numbering important for tracking

### Syncing Considerations

- Only configured items/operations sync
- Status must be "Certified" for AgriERP sync
- Calendar setup required for resource groups
- Dimension flow: Plot → Project (automatic population)

### Master Data Prerequisites

- HR Module workers must exist before resource creation
- Products must be released before use
- Item dimensions must be configured before transactions
- Customer groups impact auto-filled fields

---

## 8. Questions for Next Session

1. **Batch Auto-Generation:** Clarify automatic vs. manual batch number generation process in Inventory App
2. **Hour vs. Expense Journaling:** Confirm support for hour-based journal entries for resources
3. **Opening Inventory:** Process for transferring existing customer inventory into system
4. **Dimension Inheritance:** Confirm all dimension flows from plot → project

---

## Contact & Support

- **CRP Planning Session:** Scheduled separately with relevant team members
- **App Overview:** Detailed Inventory App walkthrough in future sessions
- **Batch Processing:** To be demonstrated in actual transaction scenarios

**Session Ended:** Ready for WBS training in next session

---

**Notes Prepared By:** Training Documentation  
**Format:** Markdown Training Notes  
**Status:** Complete Overview Session 1
