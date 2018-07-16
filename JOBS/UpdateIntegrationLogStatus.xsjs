	// -------------------------------------------------------- // 
	// Function to get all the Entries to be updated            //
	// -------------------------------------------------------- //
	function getAllDBEntries() {
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT \"MESSAGE_GUID\", \"STATUS\" from \"COVARIUS_INT_LOGGING\".\"LOGGING_MASTER\" WHERE \"STATUS\" NOT IN (\'COMPLETED\',\'FAILED\',\'RETRY\' ,\'ERROR\')"
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		var oDBRecords = {
			valueSet: [],
			valueMap: {}
		};
		while (rs.next()) {
			var oEntry = {
				MESSAGE_GUID: rs.getString(1),
				STATUS: rs.getString(2)
			};
			oDBRecords.valueSet.push(oEntry);
			oDBRecords.valueMap[oEntry.MESSAGE_GUID] = oEntry;
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		//Return the records
		return oDBRecords;
	}

	var dest = $.net.http.readDestination("Covarius_Int.JOBS", "HCI");
	var client = new $.net.http.Client();
	// ------------------------------------------------------------- // 
	// Function to retrieve single Entry from Cloud Integration      //
	// ------------------------------------------------------------- //
	function retrieveSingleRecordFromHCI(guid) {
		//Instantiate the Connection Details to Cloud Integration
		dest = $.net.http.readDestination("Covarius_Int.JOBS", "HCI");
		client = new $.net.http.Client();

		//Creating Request Path
		var Path = "(" + '\'' + guid + '\'' + ")";
		var req = new $.web.WebRequest($.net.http.GET, Path);

		//Perform the Request
		req.headers.set("Accept", "application/json");
		//req.parameters.set('filter', 'MessageGuid eq ' + '\'' + guid + '\'');
		client.request(req, dest);

		//Get the Response
		var response = client.getResponse();
		if (response.body) {
			var oData = JSON.parse(response.body.asString());
			//var oResource = oData.d[0];
			var sStatus = oData.d.Status;
			return {
				MESSAGE_GUID: guid,
				STATUS: sStatus
			};
		} else {
			throw new Error("failed to query HCI for MessageGuid " + guid);
		}
	}

	// ------------------------------------------------------------- // 
	// Function to retrieve all Entries                              //
	// ------------------------------------------------------------- //
	function retrieveRecordsFromHCI(aDBRecords) {
		var oHCIRecords = {
			retrievedValues: [],
			failedRetrievals: []
		};

		//Loop through the entries and call the Cloud Integration API
		for (var i = 0; i < aDBRecords.length; i++) {
			try {
				var oHCIRecord = retrieveSingleRecordFromHCI(aDBRecords[i].MESSAGE_GUID);
				oHCIRecords.retrievedValues.push(oHCIRecord);
			} catch (err) {
				oHCIRecords.failedRetrievals.push({
					MESSAGE_GUID: aDBRecords[i].MESSAGE_GUID,
					failure: err.message
				});
			}
		}
		return oHCIRecords;
	}

	// ------------------------------------------------------------- // 
	// Function to update DB Entries
	// ------------------------------------------------------------- /
	function updateDBEntries(aRecordsToUpdate) {
		try {
			//Get Database Connection
			var conn = $.db.getConnection();

			//Prepare SQL Statement to be executed
			var pstmt = conn.prepareStatement(
				"UPDATE \"COVARIUS_INT_LOGGING\".\"LOGGING_MASTER\" SET STATUS = ? WHERE MESSAGE_GUID = ?");

			//Prepare the batch of statements	
			pstmt.setBatchSize(aRecordsToUpdate.length);
			for (var i = 0; i < aRecordsToUpdate.length; i++) {
				var oRecord = aRecordsToUpdate[i];
				pstmt.setString(1, oRecord.STATUS);
				pstmt.setString(2, oRecord.MESSAGE_GUID);
				pstmt.addBatch();
			}

			//Execute the Statement and Close the connection
			pstmt.executeBatch();
			pstmt.close();
			conn.commit();
			conn.close();

			//Return Results
			return aRecordsToUpdate.length;
		} catch (err) {
			if (pstmt !== null) {
				pstmt.close();
			}
			if (conn !== null) {
				conn.close();
			}
			throw new Error(err.message);
		}
	}

	// -------------------------------------------------------- // 
	// Function to map the updates to be performed              //
	// -------------------------------------------------------- //
	function mapUpdates(aHCIRecordsRetrieved, oDBRecordsMap) {
		var oUpdateResults = {
			iUpdatesRequested: 0,
			iUpdatesProcessed: 0
		};

		//Loop through the records to see which ones are valid for update
		var aRecordsToUpdate = [];
		for (var i = 0; i < aHCIRecordsRetrieved.length; i++) {
			var oHCIRecord = aHCIRecordsRetrieved[i];
			var oDBRecord = oDBRecordsMap[oHCIRecord.MESSAGE_GUID];
			if (oHCIRecord.MESSAGE_GUID === oDBRecord.MESSAGE_GUID) {
				var bRequiresUpdate = false;
				var sFormattedStatus = oHCIRecord.STATUS;
				if (oDBRecord.STATUS !== null) {
					var sFormattedDBRecord = oDBRecord.STATUS;
					if (sFormattedStatus !== sFormattedDBRecord) {
							bRequiresUpdate = true;
					}
				} else {
					bRequiresUpdate = true;
				}
				if (bRequiresUpdate === true) {
					var oUpdateEntry = {
						MESSAGE_GUID: oHCIRecord.MESSAGE_GUID,
						STATUS: oHCIRecord.STATUS
					};
					aRecordsToUpdate.push(oUpdateEntry);
				}
			}
		}
		oUpdateResults.iUpdatesRequested = aRecordsToUpdate.length;
		if (oUpdateResults.iUpdatesRequested > 0) {
			oUpdateResults.iUpdatesProcessed = updateDBEntries(aRecordsToUpdate);
		}
		return oUpdateResults;
	}

	function execute() {
		try {
			var oDBRecords = getAllDBEntries();
			var oHCIRecords = retrieveRecordsFromHCI(oDBRecords.valueSet);
			var oUpdateResults = mapUpdates(oHCIRecords.retrievedValues, oDBRecords.valueMap);
			$.trace.info(JSON.stringify({
				totalDBRecords: oDBRecords.valueSet.length,
				totalHCIRecordsRetrieved: oHCIRecords.retrievedValues.length,
				totalHCIFailedRetrievals: oHCIRecords.failedRetrievals.length,
				HCIFailedRetrievalDetails: oHCIRecords.failedRetrievals,
				updatesRequested: oUpdateResults.iUpdatesRequested,
				updatesProcessed: oUpdateResults.iUpdatesProcessed
			}));
		} catch (err) {
			$.trace.error(JSON.stringify({
				message: err.message
			}));
		}
	}