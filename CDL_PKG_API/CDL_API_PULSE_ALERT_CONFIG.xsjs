(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description: REST service to be able to read entries     //
	// from the Pulse Alert Configuration Table, as well as post//
	// for creations/ deletions and updates                     //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate,
		gvStatus;
	//Variable to carry the conversion errors
	var gvConvError;
	//Alert Configuration ID
	var gvAlertId;

	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTable = 'CDL_PULSE_ALERT_CONFIG';
	var gvErrorMessage;

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

	// -------------------------------------------------------- // 
	// Main function to call methods as required                //
	// -------------------------------------------------------- //
	function main() {
		//Check the Method
		if ($.request.method === $.net.http.POST) {
			//Perform Table Entry to be updated
			try {
				_getLastAlertId();
				_updateEntry();
			} catch (errorObj) {
				gvTableUpdate = "Error during table update:" + errorObj.message;
			}

			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				TableUpdateMessage: gvTableUpdate,
				Status: gvStatus
			}));
		} else if ($.request.method === $.net.http.GET) {
			//Perform Read to get entries
			try {
				_getEntries();
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
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTable + '"';

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
					ID: oResultSet.getString(1),
					HUB_INTEGRATION: oResultSet.getString(2),
					ON_OFF: oResultSet.getString(3),
					ALERT_TYPE: oResultSet.getString(4),
					ALERT_RETENTION_DAYS: oResultSet.getString(5),
					PORTAL_NOTIFICATION: oResultSet.getString(6),
					PORTAL_NOTIFICATION_FREQUENCY: oResultSet.getString(7),
					HUB_INTEGRATION_API: oResultSet.getString(8)
				};

				oResult.records.push(record);
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
	// Function to get the latest Alert ID                     //
	// -------------------------------------------------------- //
	function _getLastAlertId() {
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT MAX(\"ID\") FROM \"" + gvSchemaName + "\".\"" + gvTable + "\""
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			gvAlertId = rs.getString(1);
			gvAlertId = parseInt(gvAlertId);
		}
		if (gvAlertId) {
			gvAlertId = gvAlertId + 1;
		} else {
			gvAlertId = parseInt(1);
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();
	}

	// ----------------------------------------------------------------// 
	// Function to insert entries into the table                       //
	// ----------------------------------------------------------------//
	function _updateEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			if (oBody.ID || gvAlertId) {
				//Build the Statement to update the entries
				var oStatement = oConnection.prepareStatement(
					"UPDATE \"" + gvSchemaName + "\".\"" + gvTable +
					"\" SET HUB_INTEGRATION = ?, ON_OFF = ?, ALERT_TYPE = ?, ALERT_RETENTION_DAYS = ?, PORTAL_NOTIFICATION = ?, PORTAL_NOTIFICATION_FREQUENCY = ?, HUB_INTEGRATION_API = ? WHERE ID = ?"
				);

				//Populate the fields with values from the incoming payload
				//Hub Integration
				oStatement.setString(1, oBody.HUB_INTEGRATION);
				//On/Off
				oStatement.setString(2, oBody.ON_OFF);
				//Alert Type
				oStatement.setString(3, oBody.ALERT_TYPE);
				//Alert Retention Days
				oStatement.setInt(4, parseFloat(oBody.ALERT_RETENTION_DAYS));
				//Portal Notification
				oStatement.setString(5, oBody.PORTAL_NOTIFICATION);
				//Portal Notification Frequency
				oStatement.setString(6, oBody.PORTAL_NOTIFICATION_FREQUENCY);
				//Hub Integration API
				oStatement.setString(7, oBody.HUB_INTEGRATION_API);
				//ID
				if (oBody.ID) {
					oStatement.setInt(8, parseFloat(oBody.ID));
				} else {
					oStatement.setInt(8, parseFloat(gvAlertId));
				}
			} else {
				//Build the Statement to insert the entries
				var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTable +
					'" VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

				//Populate the fields with values from the incoming payload
				//ID
				oStatement.setInt(1, 1);
				//Hub Integration
				oStatement.setString(2, oBody.HUB_INTEGRATION);
				//On/Off
				oStatement.setString(3, oBody.ON_OFF);
				//Alert Type
				oStatement.setString(4, oBody.ALERT_TYPE);
				//Alert Retention Days
				oStatement.setInt(5, parseFloat(oBody.ALERT_RETENTION_DAYS));
				//Portal Notification
				oStatement.setString(6, oBody.PORTAL_NOTIFICATION);
				//Portal Notification
				oStatement.setString(7, oBody.PORTAL_NOTIFICATION_FREQUENCY);
				//Hub Integration API
				oStatement.setString(8, oBody.HUB_INTEGRATION_API);
			}
			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries updated successfully in Pulse Alert Config Table;";
			gvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem updating entries in the Pulse Alert Config Table, Error: " + errorObj.message;
			gvStatus = "Error";
		}
	}

})();