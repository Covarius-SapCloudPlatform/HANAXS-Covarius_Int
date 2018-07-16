(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-06-19                                         //
	// Description: REST service to be able to read entries     //
	// from the Integration Logging Table.  Allowing filters    //
	// on the fromDate, toDate and status fields to be passed   //
	// in as parameters.                                        //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'COVARIUS_INT_LOGGING';
	var gvTableName = 'LOGGING_MASTER';
	var gvfromDate = $.request.parameters.get('fromDate');
	var gvtoDate = $.request.parameters.get('toDate');
	var gvStatus = $.request.parameters.get('status');
	var gvStatuses;
	var gvDirection = $.request.parameters.get('direction');
	var gvGuid = $.request.parameters.get('guid');
	var gvErrorMessage;

	//Check if there are multiple status restrictions
	if (gvStatus) {
		if (gvStatus.indexOf(',') !== -1) {
			gvStatuses = gvStatus.split(',');
		}
	}
	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method !== $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "Only GET Operation is supported, " +
				"with parameters fromDate(YYYY-MM-DD), toDate(YYYY-MM-DD), " +
				"status(COMPLETED, FAILED, ERROR, RETRY, PROCESSING, ESCALATED)"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getLogEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery;

			//Build the query to be exectued based on parameters
			if (!gvGuid) {
				if (!gvfromDate && !gvtoDate) {
					lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';
					if (!gvStatuses && gvStatus) {
						lvQuery = lvQuery + ' WHERE STATUS = ' + "'" + gvStatus + "'";
					}

				} else if (gvfromDate && !gvtoDate) {
					lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"' + ' WHERE START_TIME >=' + "'" + gvfromDate + "'";
				} else if (!gvfromDate && gvtoDate) {
					lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"' + ' WHERE END_TIME <=' + "'" + gvtoDate + "'";
				} else {
					lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"' + ' WHERE START_TIME >=' + "'" + gvfromDate + "'" +
						' AND END_TIME <=' +
						"'" + gvtoDate + "'";
				}

				if (!gvStatuses && gvStatus) {
					lvQuery = lvQuery + ' AND STATUS = ' + "'" + gvStatus + "'";
				}

				if (gvStatuses) {
					for (var j = 0; j <= gvStatuses.length; j++) {
						if (gvStatuses[j]) {
							if (j === 0) {
								if (lvQuery.indexOf('WHERE') === -1) {
									lvQuery = lvQuery + ' WHERE STATUS = ' + "'" + gvStatuses[j] + "'";
								} else {
									lvQuery = lvQuery + ' AND STATUS = ' + "'" + gvStatuses[j] + "'";
								}

							} else {
								lvQuery = lvQuery + ' OR STATUS = ' + "'" + gvStatuses[j] + "'";
							}
						}
					}
				}

				if (gvDirection) {
					lvQuery = lvQuery + ' AND DIRECTION = ' + "'" + gvDirection + "'";
				}
			} else {
				lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';
				lvQuery = lvQuery + ' WHERE MESSAGE_GUID = ' + "'" + gvGuid + "'";
			}

			//Connect to the Database and execute the query
			var oConnection = $.db.getConnection();
			var oStatement = oConnection.prepareStatement(lvQuery);
			oStatement.execute();
			var oResultSet = oStatement.getResultSet();
			var oResult = {
				records: []
			};
			while (oResultSet.next()) {

				var record = {
					MESSAGE_GUID: oResultSet.getString(1),
					START_TIME: oResultSet.getString(2),
					END_TIME: oResultSet.getString(3),
					STATUS: oResultSet.getString(4),
					PAYLOAD_REQUEST: oResultSet.getString(5),
					PAYLOAD_RESPONSE: oResultSet.getString(6),
					OBJECT_KEY: oResultSet.getString(7),
					METHOD: oResultSet.getString(8),
					DIRECTION: oResultSet.getString(9),
					SOURCE_SYS_ID: oResultSet.getString(10),
					SOURCE_SYS_AREA: oResultSet.getString(11),
					TARGET_SYS_ID: oResultSet.getString(12),
					TARGET_SYS_AREA: oResultSet.getString(13),
					INTERFACE: oResultSet.getString(14)
				};

				oResult.records.push(record);
				record = "";
			}
			oResultSet.close();
			oStatement.close();
			oConnection.close();
			
			//Return the result
			$.response.contentType = "application/json; charset=UTF-8";
			$.response.setBody(JSON.stringify(oResult));
			$.response.status = $.net.http.OK;

		} catch (errorObj) {
			gvErrorMessage = errorObj.message;
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
		}
	}

	// -------------------------------------------------------- // 
	// Main function to add entries to the logging table        //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method !== $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "Only GET Operation is supported, " +
					"with parameters fromDate(YYYY-MM-DD), toDate(YYYY-MM-DD), " +
					"status(COMPLETED, FAILED, ERROR, RETRY, PROCESSING, ESCALATED)"
			}));
		} else if ($.request.method === $.net.http.GET) {
			//Perform Table Entry to be created in Logging Table
			try {
				_getLogEntries();
			} catch (errorObj) {
				$.response.status = 200;
				$.response.setBody(JSON.stringify({
					message: "API Called",
					result: gvErrorMessage
				}));
			}
		}
	}

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();