#

# **Functional Requirement Document**

#

VANN BROS.


Yolo Hulling and Shelling Company

Date: 12/19/2025

## Table of Contents

[**Receiving Process** 5](#receiving-process)

[As-Is Process and To-Be Requirements 6](#as-is-process-and-to-be-requirements)

[**Internal Quality on Stockpiles** 8](#internal-quality-on-stockpiles)

[As-Is Process and To-Be Requirements 9](#as-is-process-and-to-be-requirements-1)

[Picking for Processing 10](#picking-for-processing)

[As-Is Process and To-Be Requirements 10](#as-is-process-and-to-be-requirements-2)

[Pre-Cleaning: 11](#pre-cleaning)

[As-Is Process and To-Be Requirements 12](#as-is-process-and-to-be-requirements-3)

[Hulling: 14](#hulling)

[As-Is Process and To-Be Requirements 14](#as-is-process-and-to-be-requirements-4)

[Shelling: 16](#shelling)

[As-Is Process and To-Be Requirements 16](#as-is-process-and-to-be-requirements-5)

[Label printing: 18](#label-printing)

[As-Is Process and To-Be Requirements 18](#as-is-process-and-to-be-requirements-6)

[USDA 20](#usda)

[As-Is Process and To-Be Requirements 20](#as-is-process-and-to-be-requirements-7)

[Storage: 22](#heading=h.hzshdbgnkn2o)

[As-Is Process and To-Be Requirements 22](#heading=h.ywy42ohi3bpw)

[Fumigation 24](#heading=h.hugpddr7k79c)

[As-Is Process and To-Be Requirements 24](#heading=h.7l4ybwbrhf7v)

[Shipment - Kernels 25](#shipment---kernels)

[As-Is Process Flow 26](#as-is-process-flow)

[As-Is Process and To-Be Requirements 26](#as-is-process-and-to-be-requirements-8)

[Shipment - Inshells: 29](#shipment---inshells:)

[As-Is Process Flow 30](#as-is-process-flow-1)

[As-Is Process and To-Be Requirements 30](#as-is-process-and-to-be-requirements-9)

[Acceptance / Sign Off 34](#acceptance-/-sign-off)

# **Introduction**

This Functional Requirements Document (FRD) outlines the critical requirements for the implementation of D365 F&SC at Vann Brothers. This document sets the foundation for the solution blueprint, guiding the configuration, integration, and eventual deployment of D365 F&SC. It also defines the expectations and deliverables necessary to ensure a successful implementation, aligning system functionalities with Vann's operational and strategic imperatives.

This FRD focuses on the functional requirements collected specifically for Yolo Hulling and Shelling Co. (YHS). The requirements are gathered and put together after detailed discovery sessions conducted Onsite and Online by Folio3 team with the designated POC's from Vann's side.

# **Receiving Process** {#receiving-process}

When a truck carrying a load arrives at the YHS facility, the gross weight of the truck is first measured at the entrance scale. The truck driver arrives with three pre-printed field receipt tags along with a transport sheet that accompanies the load throughout the delivery process.

Upon arrival at the yard, the driver hands over the field receipt tag to the office staff. Using this information, the office staff generates a Stockpile Location Ticket, which includes the assigned dumping location along with key details such as Grower, Field, and Variety. This ticket is issued to the driver and is used to guide the unloading process.

The user evaluates whether the incoming load is the first load for a specific Grower-Field-Variety combination. If it is the first load, a new stockpile location is assigned. If the load is a continuation for the same Grower-Field-Variety, the existing stockpile location is reused, ensuring that all related loads are consistently directed to the same pile.

Each Stockpile Location Ticket includes a barcode, which the driver scans using the YHS mobile app. Upon scanning, the app displays a map-based view of the designated stockpile area, providing accurate navigation to the assigned unloading location. In the yard, each stockpile (lot) is clearly identified with a stick attached to it, displaying the stockpile location, field number, and variety. If any attached paperwork is lost or damaged, it is reprinted using the office copy and reattached to the stockpile stick.

If the driver arrives at the assigned stockpile location and finds it already occupied, the Yard Leader coordinates with the reception to resolve the issue. The Receptionist then voids or discards the original Stockpile Location Ticket and assigns a new available location in the system. An updated ticket is issued to the driver, who then proceeds to unload the load at the newly assigned location.

After unloading is completed, the truck proceeds to the exit gate, where it is weighed again to determine the tare weight. Using the entrance and exit weights, the net weight of the load is calculated. Finally, the driver receives a weight certificate displaying the gross weight, tare weight, and net weight before leaving the facility.

As-Is Process Flow

Attached below is the link to the As-Is process flow for Receiving process.
[YHS Receiving As-Is process flow](https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-3127&t=4iRAFkP2QBYfinuD-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 130 - YHS - Receive Field run from growers | BP-130-01 | The Gross weight of truck is measured at the entrance scale.    | RQ-REC-001 | The system should be linked with the weight scale at the entrance so that it can keep records of the weight measured at the entrance. |
| 130 - YHS - Receive Field run from growers  | BP-130-02  | The Truck driver brings three pre-printed field receipt tags along with him. White for office, yellow for yard & pink for driver. | N/A | N/A |
| 130 - YHS - Receive Field run from growers | BP-130-03  | The truck driver carries a Transport sheet along with him when delivering the load at YHS. | N/A | N/A  |
| 130 - YHS - Receive Field run from growers | BP-130-04  | When a driver arrives at the client's yard with a load from a grower, he first hands over the field receipt tag to the office staff. The office staff then generates a Stockpile Location Ticket for the load, which includes the specific dumping location (for example, "West-A:02") along with the details of Grower, field & variety. Using this ticket, the driver proceeds to unload the truck at the designated stockpile location. | RQ-REC-002  | The system must generate a Stockpile Location Ticket upon receiving the field receipt tag from the driver. The ticket must display all essential operational and traceability details, including Grower, Field, Variety, Handler, Driver Name, Truck and Trailer Plate Numbers, Product, Run Type, and the assigned stockpile dumping location (e.g., "West-A:02"). The driver must use this ticket to unload the load at the specified stockpile location. |
| 130 - YHS - Receive Field run from growers | BP-130-05  | Upon submitting the field receipt tag, the driver receives a Stockpile Location Ticket. The system checks whether the load is the first one for the specific grower-field-variety combination. If it is the first load, a new stockpile location is assigned; if it is a continued load for the same grower-field-variety, the existing stockpile location is reused. This ensures that all loads from the same source are consistently directed to the same storage location. | RQ-REC-003  | D365 F&SC is required to generate a Stockpile Location Ticket that assigns a stockpile location based on the grower, field, and variety. For the first load of a grower, field, & variety combination, a new location shall be assigned by the user. For subsequent loads, the system shall assign the existing location. |
| 130 - YHS - Receive Field run from growers | BP-130-06  | Truck weight details, gross weight of the load & all the information related to Grower, field & variety of the lot is recorded in Almond Logic. | RQ-REC-004  | The system shall capture and record all relevant load information, including gross truck weight from the integrated scale and tare weight, which may also be entered manually by staff when required. The system shall also record the associated grower, field, and variety of details for each load. |
| 130 - YHS - Receive Field run from growers | BP-130-07  | After the driver receives the Stockpile Location Ticket, which includes a barcode, he scans the barcode using the YHS mobile app. The app then displays the designated stockpile area on a map, providing the driver with precise navigation to the correct unloading location. | RQ-REC-005  | The system shall enable drivers to scan the Stockpile Location Ticket barcode using the YHS mobile app. After the barcode is scanned, the app must display the mapped location of the assigned stockpile area to guide the driver accurately for unloading. |
| 130 - YHS - Receive Field run from growers | BP-130-08  | Each lot (pile) in the yard has a stick attached to it displaying its location, field number and variety. | N/A | N/A |
| 130 - YHS - Receive Field run from growers | BP-130-09  | If the attached paperwork is lost or damaged, it is reprinted and attached to the stick using the office copy. | N/A | N/A  |
| 130 - YHS - Receive Field run from growers | BP-130-010  | If, upon arrival, the assigned stockpile location is found to be already occupied, the Yard Leader coordinates with the reception to resolve the issue. The Receptionist voids or discards the original Stockpile Location Ticket and assigns a new, available location for the load in the system. The driver is then provided with the updated ticket to proceed with unloading at the newly assigned stockpile. | RQ-REC-006 | The system shall allow reassignment of stockpile locations when the originally assigned location is unavailable. The receptionist must be able to void the previous ticket and generate a new ticket with an available location. All updates, including the original and new location must be recorded in D365 F&SC. |
| 130 - YHS - Receive Field run from growers | BP-130-011  | At the exit stage, the truck is weighed again to determine the tare and net weight. | RQ-REC-007  | The system shall capture a second weighing of each truck at the exit gate through integration with the scale system, recording the tare (empty) weight and calculating the net weight of the load. Option to enter the tare weight manually should also be available to the user. |
| 130 - YHS - Receive Field run from growers | BP-130-012  | The driver receives a weight certificate showing the gross, tare, and net weights | RQ-REC-008  | D365 F&SC is required to print a weight certificate that shows the gross, tare & net weight of the load. |
| 130 - YHS - Receive Field run from growers | BP-130-013  | Currently, pre-printed labels are provided by VFO to the growers at the time of the grower agreement. | N/A | N/A |
| 130 - YHS - Receive Field run from growers | BP-130-014  | Currently, all transportation costs incurred for delivering produce from growers to YHS are fully borne by the growers. | RQ-REC-009  | The system shall record and identify that transportation costs from growers to YHS are the responsibility of the growers. No freight charges shall be calculated or posted to YHS within the system for inbound grower deliveries. |

# **Fumigation**

When trucks unload almonds at the site, they form piles. The need for fumigation is identified either by the grower or the incoming QC team, typically when pest risk is observed or if a field run remains in a pile for 10 days or more. Once the need is confirmed, growers are informed that fumigation will be carried out.

AFS (Advance fumigation services) performs the fumigation using chemicals sourced from YHS inventory. This inventory is not tracked or managed in any system. The fumigation process is considered part of YHS's overhead expenses, so growers are not billed for this service. All costs related to fumigation are absorbed by the YHS.

As-Is Process Flow

Attached below is the link to the As-Is process flow for the Storage process.
[YHS Fumigation As-Is process flow](https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-3262&t=HgUESRjljSg82Us9-4)

## As-Is Process and To-Be Requirements

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 134 - YHS - Fumigation after Receiving Field run from growers | BP-134-01 | Trucks unload their loads at the site, forming Piles. | RQ-REC-010  |  The system should begin time tracking once the stockpile is fully created. |
| 134 - YHS - Fumigation after Receiving Field run from growers  | BP-134-02 | Grower or the incoming QC can tell that fumigation is needed. Also, if the field run is out there in the pile for 10 days or more. | RQ-REC-011  | The system should identify which stockpiles require fumigation based on QC's decision and also automatically flag any stockpile that has spent 10 or more days on the that location. Generate notification or task assignment to fumigation team when required. Provide status indicator for fumigation (e.g., Required, Scheduled, Completed). |
| 134 - YHS - Fumigation after Receiving Field run from growers  | BP-134-03  | Growers are informed that fumigation will be done. | N/A | N/A |
| 134 - YHS - Fumigation after Receiving Field run from growers  | BP-134-04  | AFS uses the chemical/perfume from YHS inventory. Inventory is not managed in the system. | RQ-REC-012  | The system should support fumigation chemical and other equipments inventory management. Expense of inventory used in the fumigation. |
| 134 - YHS - Fumigation after Receiving Field run from growers  | BP-134-05  | Growers do not receive any bills. YHS takes care of this as part of head expenses. | RQ-REC-013  | System should have the ability to record fumigation cost allocation under YHS head expenses. Maintain expense tracking for fumigation activities (chemicals, labor, equipment).  |

# **Internal Quality on Stockpiles** {#internal-quality-on-stockpiles}

Internal quality inspections are performed on stockpiles once the product is received from growers. These inspections are conducted to assess key quality parameters, including moisture levels, kernel size, presence of insects, gums, twins, and other relevant quality attributes. Sampling is carried out systematically, with samples taken from the first and last loads received for each stockpile. For larger stockpiles, additional samples are collected at regular intervals, specifically after every five loads, to ensure consistent quality monitoring across the entire pile.

Following completion of the internal quality assessments, YHS records and maintains all sample results and observations in an Excel-based internal report. This report serves as a consolidated reference, capturing detailed quality metrics for each stockpile. In cases where growers request access to their quality results, the Grower Representative reviews the internal report, identifies the relevant sample records and corresponding results, and shares the required information directly with the grower.

As-Is Process Flow

Attached below is the link to the As-Is process flow for Internal Quality on Stockpile process.
[Internal Quality on Stockpile As-Is process flow](https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-3084&t=4iRAFkP2QBYfinuD-4)

##

##

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-1}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 132- YHS - Internal Quality on Stockpiles | BP-132-01 | Internal quality is done on the Stockpiles once it is received from growers to check things like Moisture, size, insects, Gums, and Twins, etc. Samples are taken from the first and last loads.For large piles, a sample is collected after every five loads.  | RQ-QLT-001 | D365 F&SC is required to record the internal quality assessments performed on each stockpile, including parameters such as moisture, size, insect presence, and defect types. It must allow users to log samples taken from the first and last loads, and automatically track additional samples required for large stockpiles (e.g., every five loads). |
| 132- YHS - Internal Quality on Stockpiles  | BP-132-02  | After internal quality assessments are completed, YHS maintains the results in an Excel-based internal report. This report consolidates all sample values and quality observations for each stockpile. When growers request visibility into these sample results, the Grower Representative can review the internal Excel sheet, highlight the relevant sample entries along with their corresponding results, and share this information directly with the grower.  | RQ-QLT-002  | The system shall provide functionality to record, store, and view all internal quality sample results within D365 F&SC, eliminating reliance on Excel-based tracking. The Grower Representative must be able to easily retrieve sample data for any grower, highlight or select relevant results, and share them in a system-generated report or exportable format for communication with growers. |

# **Picking for Processing** {#picking-for-processing}

The selection and handling of field lots in Almond Logic is a structured process guided by inventory availability, demand forecasts, and the weekly production plan. Once a lot is chosen, it is loaded onto a YHS trailer, and the field receipt tag is scanned in Almond Logic to transfer the inventory to the staging location. This process ensures that the lot is properly tracked and prepared for production, with the trailer positioned in the plant's staging area for further processing.

As-Is Process Flow

Attached below is the link to the As-Is process flow for Picking for Processing process.

[YHS Picking for Processing As-Is process flow](https://www.figma.com/board/vpAukW2CX7K2Bo1mR6QgRm/Vann-Phase3?node-id=2186-3319&t=PNo0EEhQnkSKHAYC-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-2}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 155 - YHS - Picking for processing | BP-155-01 | The selection of a lot is driven by multiple criteria such as available field run inventory, VFO demand forecasts, and the weekly production plan. | N/A | N/A |
| 155 - YHS - Picking for processing | BP-155-02 | The selected field lot is loaded into a YHS trailer, and the field receipt tag is scanned in 'send load to plants' in almond logic to transfer the inventory to staging location in Almond Logic, indicating that the lot has been selected for processing. | RQ-PRC-001  | System should have the functionality of scanning the field receipt tag |
| 155 - YHS - Picking for processing | BP-155-03 | The selected field lot is loaded into a YHS trailer, and the field receipt tag is scanned in 'send load to plants' in almond logic to transfer the inventory to staging location in Almond Logic, indicating that the lot has been selected for processing. | RQ-PRC-002  | The system must support transferring loads to the plant and automatically update the stockpile location to staging upon scanning the field receipt tag. |
| 155 - YHS - Picking for processing | BP-155-04 | The trailer is then parked in the plant staging area of the production. | RQ-PRC-003  | The system shall display real-time trailer counts in the staging area and provide the field, variety, and grower details for each trailer, captured when the field receipt ticket was scanned for load transfer. |

# **Pre-Cleaning** {#pre-cleaning}

Once a staged trailer reaches the plant, the operator verifies tank availability in Almond Logic and scans (or manually enters) the field receipt ticket in the Plant Status module to retrieve grower, field, and variety of details. The trailer is then positioned over the pit, and the load is dumped for pre-cleaning before being directed into a selected tank. Upon tank selection, Almond Logic generates a tank ticket, which is scanned on the production floor to mark the tank as running.

As-Is Process Flow

Attached below is the link to the As-Is process flow for Precleaning process.

[YHS Pre-cleaning As-Is process flow](https://www.figma.com/board/vpAukW2CX7K2Bo1mR6QgRm/Vann-Phase3?node-id=2186-3386&t=PNo0EEhQnkSKHAYC-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-3}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 180 - YHS - Pre cleaning | BP-180-01 | The operator visually checks in the system which tank is empty and available for processing the load | RQ-PRC-004  | System must show the real time information of load inside the tank |
| 180 - YHS - Pre cleaning | BP-180-02 | The operator scans the field ticket barcode or manually enters the barcode number in the Plant Status module of Almond Logic. | RQ-PRC-005  | System must have the functionality of scanning the tag |
| 180 - YHS - Pre cleaning | BP-180-03 | Upon scanning the field receipt ticket, the system retrieves all information related to the grower, field, and variety. | RQ-PRC-006  | Upon scanning field receipt ticket, the system must fetch all information related to the grower, field, and variety. |
| 180 - YHS - Pre cleaning | BP-180-04 | The staged trailer is positioned above the pit, where the load is dumped for pre-cleaning. | RQ-PRC-007  | The system must display the pre-cleaner's status along with a start/stop button. |
| 180 - YHS - Pre cleaning | BP-180-05 | operator selects the tank for filling | RQ-PRC-008  | The system must allow users to select which tank will be used for filling. |
| 180 - YHS - Pre cleaning | BP-180-06 | After selecting the tank for filling, Almond Logic generates a tank ticket, which is scanned in the Almond logic on the production floor to update the tank status to 'Running Scanned Tank'. | RQ-PRC-009  | System must be able to generate and print out tank ticket with following information:<br>Plant<br>Tank #<br>Tank Assignment ID<br>Load tag<br>Creation date<br>Print date<br>Grower<br>Field<br>Variety<br>Product type<br>Handler<br>Contract<br>Run type<br>|
| 180 - YHS - Pre cleaning | BP-180-07 | After pre-cleaning is complete, the cleaned almonds are transferred to the tank for hulling and shelling. The Almond logic visually indicates the tank status as follows:<br><br>Green indicates that the tank is currently in use for production.<br>Blue indicates that the load in the tank belongs to the same production run.<br>Brown indicates that the tank is being filled or that the load belongs to a different production run (for example, a different grower or lot) | RQ-PRC-010  | Once the tank ticket is scanned in the system, the system must update the tank status. |

# **Hulling** {#hulling}

Once the cleaned almonds are transferred to the tank for hulling and shelling, the tank gates are manually opened to route the load to the processing line. During hulling, in-shell almonds are separated from the hulls, with hulls collected and classified as either high-fiber or low-fiber. High-fiber hulls are stored and sold as a byproduct, while low-fiber hulls are disposed of. Due to weak shells, approximately 30% almond meats are generated during hulling and removed through vacuum separation. The resulting in-shell almonds are loaded directly into bins or trailers, weighed at the scale, and issued a bulk load tag. The in-shell product is then shipped to VFO or another handler through the shipment process.

As-Is Process Flow

Attached below is the link to the As-Is process flow for the Hulling process.

[YHS Hulling As-Is process flow.](https://www.figma.com/board/vpAukW2CX7K2Bo1mR6QgRm/Vann-Phase3?node-id=2186-3433&t=PNo0EEhQnkSKHAYC-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-4}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 190 - YHS - Hulling | BP-190-01 | Once the cleaned almonds are transferred to the tank for hulling and shelling, the tanks are manually opened and the load is routed to the processing line. | RQ-PRC-011 | The system should update the status of the tank to indicate that it is opened for processing. |
| 190 - YHS - Hulling | BP-190-02 | As the load is transferred to the processing line, it passes through different processing stages to produce in-shell almonds. | RQ-PRC-012  | The system shall support the complete production cycle of field-run almonds, from input to conversion into inshells, |
| 190 - YHS - Hulling | BP-190-03 | During hulling, in-shells are separated from the hulls, and hulls are also stored separately.<br>The stripped-off almond hulls can be classified into two types: high fiber and low fiber.<br>High fiber hulls are stored in piles and sold as a byproduct, while low fiber hulls are disposed | RQ-PRC-013  | The system should support recording the inventory of high fibre hulls as a by-product. |
| 190 - YHS - Hulling | BP-190-04 | During Hulling, 30% meats are generated anyway due to weak shells breaking off and getting sucked by vacuum. | RQ-PRC-014  | The system should support recording the inventory of meats/kernels as a by-product for the process of hulling. |
| 190 - YHS - Hulling | BP-190-05 | In-shells are directly loaded into the trailers or in the bins. | RQ-PRC-015  | The system should be able to assign trailers to inshell inventory or in case of bins, bin ID should be printed and attached to each bin. |
| 190 - YHS - Hulling | BP-190-06 | Inshell filled trailers are brought up to the scale for weighing. | RQ-PRC-016  | System should support scale integration to record the trailer's weight or provide option to manually record the weight |
| 190 - YHS - Hulling | BP-190-07 | After the trailer is weighed, the operator issues a bulk load tag. | RQ-PRC-017  | System must be able to generate bulk load tag with following information:<br>-Run Number<br>-Tag ID<br>-Truck<br>-Front Trailer<br>-Rear Trailer<br>-Status<br>-Created date and time<br>-Print date and Time<br>-Handler<br>-Run<br>-Grower<br>-Variety<br>-Gross weight<br>-Tare weight<br>-Net weight<br>-Barcode<br>-Barcode number |
| 190 - YHS - Hulling | BP-190-08 | Inshells are then transported to VFO or another handler via shipment process. | N/A | N/A |

# **Shelling** {#shelling}

Following the hulling process, in-shell almonds are separated from the hulls and then shelled to produce kernels. Quality assurance is performed throughout shelling to ensure minimal damage, with all results recorded in a detailed report including information on the grower, field, variety, trailer, kernel weights, defects, and moisture content. Empty shells are collected and stored outside the plant, while the finished kernels are loaded into bins, each labeled for accurate identification and tracking.

As-Is Process Flow

Attached below is the link to the As-Is process flow for the shelling process.

[YHS Shelling As-Is process flow.](https://www.figma.com/board/vpAukW2CX7K2Bo1mR6QgRm/Vann-Phase3?node-id=2186-3531&t=PNo0EEhQnkSKHAYC-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-5}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 200 - YHS - Shelling | BP-200-01 | After hulling, the hulls and in-shells are separated, and In-shells are shelled to produce kernels. | N/A | N/A |
| 200 - YHS - Shelling | BP-200-02 | During the shelling process, QA tests are performed, and necessary adjustments are made to prevent any damage to the kernels. Report is maintained in the excel sheet with following information Date<br>Time<br>Run<br>Grower<br>Field<br>Variety<br>Trailer<br>Tester<br>Foreign material in Pcs<br>Shell out weight in Grams<br>Loose meat weight in grams<br>Loose meat %<br>Inshell meat weight in grams<br>Inshell meat %<br>Total meat weight in grams<br>Total meat C/O %<br>Insect in grams<br>Insect %<br>Twins in gram<br>Twins %<br>Size (56.8gms)<br>Other %<br>Moisture % | RQ-PRC-018  | System should be able to generate quality test reports with following information<br>Date<br>Time<br>Run<br>Grower<br>Field<br>Variety<br>Trailer<br>Tester<br>Foreign material in Pcs<br>Shell out weight in Grams<br>Loose meat weight in grams<br>Loose meat %<br>Inshell meat weight in grams<br>Inshell meat %<br>Total meat weight in grams<br>Total meat C/O %<br>Insect in grams<br>Insect %<br>Twins in gram<br>Twins %<br>Size (56.8gms)<br>Other %<br>Moisture % |
| 200 - YHS - Shelling | BP-200-03 | Empty shells that are collected throught shelling process are also stored outside the plant. | RQ-PRC-019  | System should support recording of empty shell inventory. |
| 200 - YHS - Shelling | BP-200-04 | Kernels are then loaded into the bins. | RQ-PRC-020  | system should be capable of capturing bin weight via scale integration or provide option to manually record weight information |
| 200 - YHS - Shelling | BP-200-05 | The operator prints the bin label tag and attaches it to the bin. | RQ-PRC-021  | system must be able to print out bin labels with following information: Bin ID <br> Run<br>Bin #<br>Date<br>Grower<br>Field<br>Variety<br>Product<br>Handler<br>Handler Bin #<br>Weight record number<br>Gross<br>Tare<br>Net<br>Almonds are not processed to adequately reduce the presence of microorganisms of public health significance.<br>Copy - Printed<br>Date and time<br>Comments |

# **Label printing** {#label-printing}

After the kernels are loaded into bins, the operator records the weight displayed on the scale in Almond Logic and prints bin labels using the printer. In addition, the operator maintains a manual log sheet, noting details such as the date, time, bin tag, and measured weight for proper tracking and documentation.

As-Is Process Flow

Attached below is the link to the As-Is process flow for the shelling process.

[YHS Label Printing As-Is process flow.](https://www.figma.com/board/vpAukW2CX7K2Bo1mR6QgRm/Vann-Phase3?node-id=2186-3598&t=PNo0EEhQnkSKHAYC-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-6}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 220 - YHS - Label printing | BP-220-01 | kernels are loaded in the bins. | N/A | N/A |
| 220 - YHS - Label printing | BP-220-02 | The weight displayed on the scale is recorded by the operator in Almond Logic. | RQ-PRC-022  | system should be capable of capturing bin weight via scale integration or provide option to manually record weight information. |
| 220 - YHS - Label printing | BP-220-03 | Labels are printed from Almond Logic using a printer. | RQ-PRC-023  | system should be able to print out bin labels with following information:<br>Bin ID<br>Run<br>Bin #<br>Date<br>Grower<br>Field<br>Variety<br>Product<br>Handler<br>Handler Bin #<br>Weight record number<br>Gross<br>Tare<br>Net<br>Almonds are not processed to adequately reduce the presence of microorganisms of public health significance.<br>Copy - Printed<br>Date and time<br>Comments |
| 220 - YHS - Label printing | BP-220-04 | **Log sheet maintenance:**<br>The operator manually records the weight on a log sheet, noting references such as date, time, bin tag, and measured weight. | N/A | N/A |

# **Storage**

Kernels are temporarily stored outside the factory before being loaded onto trucks and transported to VFO. Inshell are placed directly in containers near the factory, and these containers are dispatched to VFO. Hulls are moved to a separate yard, covered with tarpaulin for protection, and sold as cow feed at a premium price. Hull inventory is estimated visually using pile dimensions rather than precise measurements, and growers do not receive payment for hulls. Shells are dropped by crane at the site, piled as needed, and given away for free to purchasers who collect them from the site. Dirt and stone are stored near the factory and removed by a third party at YHS's expense. Inventory tracking for these by-products is maintained in Excel, not in Almond Logic, and no payment is made to growers for these items.

As-Is Process Flow

Attached below is the link to the As-Is process flow for the Storage process.
[YHS Storage As-Is process flow](https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-2908&t=HgUESRjljSg82Us9-4)

As-Is Process and To-Be Requirements

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 140 - YHS - Storage | BP-140-01 | Kernel bins are stored temporarily outside the factory, then loaded onto Truck and transported to VFO. | N/A  | N/A  |
| 140 - YHS - Storage  | BP-140-02  | Inshells are stored directly in containers parked near the factory, and these containers are dispatched to VFO. | N/A | N/A |
| 140 - YHS - Storage | BP-140-03 | Hulls are loaded into trucks, transported to a separate yard, covered with tarpaulin for protection, and sold at a premium price as cow feed. hull Inventory is currently estimated rather than precisely measured. At site locations, inventory counts are based on visual assessments using the length and breadth of the sides of the pile to calculate the area of piles and determine the inventory level.no payment to Grower for this by product. | RQ-PRC-024   | The system should record sales and payment against the Hull. |
| 140 - YHS - Storage  | BP-140-04  | Shells are dropped by a crane at the site, then moved and piled as needed. They are given away for free, and purchasers simply collect them from the site. | N/A  | N/A  |
| 140 - YHS - Storage | BP-140-05 | Dirt and stone Stored at the same site near the factory. Removed from the site by third party cost bears by YHS. | N/A | N/A |
| 140 - YHS - Storage  | BP-140-06  | Hash is not maintained in almond logic but in excel and no payment is made to grower. | N/A | N/A |

# **USDA** {#usda}

USDA sampling is a critical step in determining product quality and value determination. For kernels, 3 lbs of sample are collected for every 30,000 lbs produced, while for inshell almonds, 3 lbs are sampled every half hour. USDA merges all samples for a run or pile before testing. A manual USDA handover sheet is completed, but these details are not recorded in Almond Logic.

If the product is destined for VFO, samples are collected at YHS but reported as VFO inventory to streamline USDA reporting. For external huller products, samples are physically taken at VFO. USDA updates field notes in its portal, and results are accessible through Almond Logic via linked certificates, though not stored directly. These results automatically generate consolidated reports in Almond Logic.

If incorrect weights are reported, field notes are withheld until corrected. Missed samples at YHS can be collected later at VFO and sent to USDA.

As-Is Process Flow

Attached below is the link to the As-Is process flow for USDA process.
[YHS USDA As-Is process flow](https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-3046&t=HgUESRjljSg82Us9-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-7}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 230 - YHS - USDA | BP-230-01 | On every 30,000 lbs production of Kernels 3 lbs of sample is colleted and for Inshell everyhalf hour 3lbs sample is collected. USDA merges all the samples for a run/pile before testing.  | RQ-USD-001 | The system should generate and print tags that include the following details for each sample record: Grower Field (linked to stockpile) Variety Total Weight  Type (Inshell or Kernel) Date Time |
| 230 - YHS - USDA  | BP-230-02  | A USDA handover sheet is manually filled with sample details but those are not recorded in Almond logic. | N/A | N/A |
| 230 - YHS - USDA | BP-230-03  | If the product is destined for VFO, samples are collected at YHS but reported as VFO inventory (virtually considered collected at VFO) to save time and streamline USDA reporting. | N/A | N/A  |
| 230 - YHS - USDA | BP-230-04  | If product comes from an external huller, samples are taken physically at VFO. | N/A  | N/A  |
| 230 - YHS - USDA | BP-230-05  | USDA updates the field notes in USDA portal. | N/A | N/A  |
| 230 - YHS - USDA | BP-230-06  | USDA results are accessible through Almond Logic but not stored directly. Users log into the USDA portal via Almond Logic to view certificates, which are linked to VFO's USDA ID. These results are then Automatically entered into Almond Logic to generate a consolidated report of all certificates. | RQ-USD-002  | System should support user login to USDA portal, should Automatically capture data from field notes of the certificates to generate the Consolidated reports of all certificates. |
| 230 - YHS - USDA | BP-230-07  | If an incorrect weight is reported to USDA, the field note is withheld from Almond Logic until the correction is made. | N/A | N/A |
| 230 - YHS - USDA | BP-230-08  | If a sample is missed at YHS, it can be taken at VFO and sent to USDA. | N/A | N/A |

# **Shipment - Kernels** {#shipment---kernels}

At YHS, office staff begin the process by scanning the available bin tags and grouping 20 bins to create a shipment in Almond Logic. Once the shipment is created, the system automatically prints a bin load sheet that includes key details such as grower information, variety, and manifest data.

Next, the office staff enter the truck details in the system, including the carrier, driver, truck, and front and back trailer information. If any of these records do not already exist, they are created in the system. The truck's tare weight is fetched automatically from the system or the scale; if it is not available, the driver brings the empty truck to the scale and the weight is entered manually.

After confirming that the shipment exists in the system, the office staff assign the shipment to the truck and select the **Receive Truck** option to generate a shipping manifest. It is important to note that multiple manifests can be created for a single shipment.

The office staff then load the truck in the system by selecting and confirming all the bins. Once confirmed, the system generates a shipment summary report and a manifest, which are handed over to the driver.

Finally, after the truck is fully loaded, the driver takes it to the weighing scale to capture the gross weight, and the system records the shipment departure.

## As-Is Process Flow {#as-is-process-flow}

[Shipment Kernels As-Is Flow](https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-2686&t=uRMXZ7NJvh0C9oxV-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-8}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 260 - YHS - Shipment - Kernel | BP-260-01 | Office staff at YHS scans the bin tags which are available to them to add it to a shipment. Once they scan 20 bins, they associate it with a shipment in Almond logic. | RQ-SHP-001 | The system should allow scanning and capturing bin tag IDs using handheld scanners or manual entry. The system should validate bin availability and prevent duplicate bin assignments. The system should automatically group bins into a shipment once the required quantity (e.g., 20 bins) is reached. |
| 260 - YHS - Shipment - Kernel  | BP-260-02 | As soon as the office staff creates a shipment, a bin load sheet is printed from the system and it shows all the details about the grower, manifest, variety etc. | RQ-SHP-002  | Upon shipment creation, the systeem should allow user to generate and print a Bin Load Sheet.<br>The Bin Load Sheet should include grower details,variety, manifest details, bin list, and shipment ID.<br>All shipment documents should be stored and retrievable in D365. |
| 260 - YHS - Shipment - Kernel  | BP-260-03 | Office staff will add the truck info to the system like: Carrier, driver, truck, front and back trailer. In system, if the tare weight is already added it will be fetched otherwise it will have to be added manually. If truck, driver or trailer information is not added to the system, then office staff will have to create information as well as, license plate, truck number, front back trailer in the system.  | RQ-SHP-003  | The system should maintain master data for carriers, trucks, drivers, and trailers.<br>The system should fetch existing data automatically during shipment assignments.<br>If master data is missing, the system should allow users to create new truck/driver/trailer records on the fly.<br>Tare weight should be stored in truck master data and auto-fetched when selected. |
| 260 - YHS - Shipment - Kernel  | BP-260-04 | Driver brings the empty truck to scale for weigheing and tare weight is fetched from the scale to system, if not then office staff will add the weight manually   | RQ-SHP-004  | The system should integrate with the weighing scale to fetch tare and gross weights automatically.<br>If integration fails, users must have the ability to manually enter weights. |
| 260 - YHS - Shipment - Kernel  | BP-260-05 | If the shipment is already created in the system, then office staff will go to the next step, otherwise they will have to create the shipment first in the system.  | RQ-SHP-005  | The system should allow the user to create a shipment if it's not already created and to get the weight of the truck. System should allow the user to assign the shipment to a truck which is already created in system or a new shipment which is created on ad hoc basis |
| 260 - YHS - Shipment - Kernel  | BP-260-06 | Office staff assign the shipment to the truck and click on receive truck in Almond Logic to create a shipping manifest. There can be multiple Manifests for one shipment. | RQ-SHP-006  | Users should be able to assign a shipment to a selected truck and driver.<br>The system should generate a shipping manifest when the user assigns a shipment to a truck.<br>There can be multiple manifests in a single shipment, and manifest must include bin count, shipment details, driver details, and truck details.<br><br>[https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-2662&t=uRMXZ7NJvh0C9oxV-4](https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-2662&t=uRMXZ7NJvh0C9oxV-4)                                                                                |
| 260 - YHS - Shipment - Kernel  | BP-260-07 | Office staff clicks on load truck in Almond Logic and selects all the bins and then confirm the load. After that the system creates a shipment reports summary and a manifest which will be handed over to the driver. | RQ-SHP-007  | Users should be able to add/remove multiple bins and confirm the truck load.<br>The system should generate a shipment report summary after confirming the load.<br>D365 should flag bins as "Loaded" |
| 260 - YHS - Shipment - Kernel  | BP-260-08 | Once the load is added to a truck then the driver brings the truck to a weighing scale to capture the gross weight and record the shipment departure in the system. | RQ-SHP-008  | The system should capture gross weight through scale integration or manual entry.<br>Shipment status must automatically update "Departed" after recording gross weight.<br>The system should store tare, gross, and net weight for reporting and compliance. |

# **Shipment - Inshells:** {#shipment---inshells:}

Office staff start the process by creating a bulk load in the Scale Logistics module to generate a bulk tare tag ID. While doing this, they enter required information such as truck details, trailer information, and handler details. The trailer's tare weight is captured automatically through scale integration. If the driver or truck master data does not already exist in Almond Logic, the office staff first create the required master records and then capture the tare weight.

Once the bulk load is created, the office staff assign it to a production run and generate a bulk load tag for the driver. The driver then hands over this bulk load tag to the production run manager. Using this tag, the user scans it in the system and assigns the production run to a specific truck.

After the production run is assigned, the truck and trailers are loaded with inshells. Once loading is completed, the loaded trailers are moved to a designated staging location to await further processing.

If the truck's tare weight has not already been captured, the empty truck is brought to the weighing scale and the tare weight is recorded in the system. The shipment is then assigned to the truck if it already exists; otherwise, the office staff create a new shipment in the system and assign it accordingly.

Finally, after the shipment is assigned to the truck, the truck with trailers is weighed out before shipment. The system records the final weight and issues a weight certificate for the truck and trailers.

## As-Is Process Flow {#as-is-process-flow-1}

[Shipment Inshells As-Is Flow](https://www.figma.com/board/uLk10wVnQDFNkncF6TDcI1/Vann-Phase3-Internal?node-id=2186-2815&t=uRMXZ7NJvh0C9oxV-4)

## As-Is Process and To-Be Requirements {#as-is-process-and-to-be-requirements-9}

| Area | BP # | As-is Process | REQ # | Functional Requirement |
| :---- | :---- | :---- | :---- | :---- |
| 270 - YHS - Shipment - Inshells | BP-270-01 | Office staff creates bulk load to generate bulk tare tag id in the scale logistics module in the system by adding information like; truck, trailer info, handler, etc. The tare weight of the trailer is captured manually.  | RQ-SHP-009 | The system should generate a unique bulk load tare tag ID upon creation which is unassigned to any run. The system must integrate with the weighing scale to automatically capture tare weight, with manual entry allowed.<br>The system should allow creation of a bulk load record with mandatory fields (truck, trailer, handler, driver, etc.).  |
| 270 - YHS - Shipment - Inshells  | BP-270-02 | If driver or truck details are not stored in Almond logic and then user creates the master data. capture tare weight | RQ-SHP-010  | The system should allow user to create master data for truck and trailer before load creation if the truck or trailer information is missing in the system. |
| 270 - YHS - Shipment - Inshells  | BP-270-03 | Office staff assign the bulk load to a production run | RQ-SHP-011  | The system should allow linking the bulk load to a production run.  |
| 270 - YHS - Shipment - Inshells  | BP-270-04 | User creates a bulk load tag for the driver. | RQ-SHP-012  | The system should generate and print a bulk load tag for the driver and then driver gives this bulk load tag to production run manager to assign it to a run |
| 270 - YHS - Shipment - Inshells  | BP-270-05 | Truck driver hands over the bulk load tag to the production run manager  | RQ-SHP-013  | The system should support scanning of the bulk load tag to retrieve bulk load information.   |
| 270 - YHS - Shipment - Inshells  | BP-270-06 | User will scan the bulk load tag and assign a production run to a truck | RQ-SHP-014  | The system should allow assignment of a production run to a truck/trailer. |
| 270 - YHS - Shipment - Inshells  | BP-270-07 | Truck with trailers is loaded with inshells as soon as the run is assigned to a truck | RQ-SHP-015  | The system should update status to 'Ready for Loading' and allow tracking of loading progress against the run and truck. |
| 270 - YHS - Shipment - Inshells  | BP-270-08 | Loaded trailers are then sent to a staging location | RQ-SHP-016  | System should allow the user to transfer/move the inventory from production run to staging location |
| 270 - YHS - Shipment - Inshells  | BP-270-09 | Empty truck will be brought to the weighing scale and tare weight is captured  | RQ-SHP-017  | The system should fetch or capture the tare weight for the empty truck. |
| 270 - YHS - Shipment - Inshells  | BP-270-10 | If trailer or truck information is not already added in the almond logic, then the data is created in the system. | RQ-SHP-018  | The system should allow user to capture the trailers front and back numbers in the system when creating a shipment |
| 270 - YHS - Shipment - Inshells  | BP-270-11 | if the shipment is not created, then office staff creates the shipment in the system and then assigns it to a truck. | RQ-SHP-019  | The system should allow users to validate if a shipment already exists and either assign or allow creation of a new shipment. |
| 270 - YHS - Shipment - Inshells  | BP-270-12  | After the shipment is assigned to the truck, it will be weighed out before the shipment, and a weight certificate is issued for truck with trailers. | RQ-SHP-020  | The system should allow the weight-out of loaded trucks to capture gross weight. The system should generate a weight certificate (tare, gross, net weight, truck/trailer details, shipment ID, date & time). The system should update shipment status to 'Completed / Ready for Dispatch'. |

# **Acceptance / Sign Off** {#acceptance-/-sign-off}

| Acceptance / Sign Off |  |
| :---- | :---- |
|  __________________________________________ Vann Bros. (Client) Dec 19, 2025 |  __________________________________________ Folio3 Dec 19, 2025 |
