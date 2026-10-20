I just gained additional knowledge regarding the harvest central flow

- We create the Harvest Central tickets using the AgriFarm web or iOS app. The tickets are created in the AgriFarm system and then synced to the WMS system for processing via Burq.

- From Burq, we monitor the successful transaction of the tickets by filtering against YHS_AGRIERP Workspace & YHS_HarvestTickets_AGRIERP Dataflow. For a quick glance we can click the Detail cell against the transaction that shows a message "The Harvest ticket HT-xxx-yyyyy-dd synced to WMS (entityId: 1111)"

- Visit https://vann-wms-qa.agrierp.com/ and log in with the Superadmin credentials (pin: already in .auth, configuration: YHS) to access the WMS system and append "/receiving/1111" to the URL to view the synced ticket details. The number "1111" corresponds to the entityId mentioned in the Burq transaction message.

- After accessing the ticket details in WMS, you can verify the information and ensure that the ticket has been processed correctly. This includes checking the status, items received, and any discrepancies that may have occurred during the sync process.

- Enter the Gross weight, Captured Tare Weight(always smaller than Gross weight) to get the Net weight. The system will automatically calculate the Net weight based on the provided Gross and Tare weights. This is the actual weight that will reflect in the AgriFarm Harvest Central system by replacing "Awaiting From YHS" .

- On the ticket page, hit the "Validate and Assign" button to proceed with stockpile location selection. Once done, the system will prompt you to select a stockpile location for the received items. Choose the appropriate stockpile location from the available options.

- Once the ticket is assigned from AgriWMS, visit the Harvest Central system to check the actual weight of the ticket. It should not display ""Awaiting From YHS" anymore, but instead show the calculated Net weight based on the Gross and Tare weights entered in the WMS system. This confirms that the ticket has been successfully processed and synced between the AgriFarm and WMS systems.

- Next select this Harvest ticket and hit the "Post" button to post the ticket. This action will finalize the ticket and update the inventory records in the AgriFarm system. After posting, the ticket status will change to "Posted" successfully. Check the sync console to ensure that the ticket has been successfully synced to FinOps. Note down the journal entry number that the "Harvest Central Ticket (FinOps Posting)" FinOps Sync service generates. The message looks something like "Harvest ticket 'HT-xxx-yyyyy-dd' posted to FinOps (journal VBS-000111)".

- On the Microsoft FinOps side, we need to verify the generated movement journal entry against this ticket by visiting Inventory management > Journal entries > Items. Enter the journal entry number noted from the FinOps sync message to view the details of the movement journal entry. This will allow us to confirm that the inventory records have been updated correctly in FinOps based on the posted Harvest Central ticket.

Side note: On the Microsoft FinOps side, the Varities data lies in Product information management > Released products. After this opens, filter the Item number column with 90000. Select it and from the Product ribbon, visit the Released product variants via the Product Master tab. This will show the list of all the varieties that are available in the system. The configuration column mostly displays the configured varieties.