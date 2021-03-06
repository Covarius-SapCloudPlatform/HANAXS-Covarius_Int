(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description: REST service to be able to create entries   //
	// in the Pulse Alert Config Table. POST method is allowed  //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service.                                     //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate,
		gvStatus;
	//Variable to carry the conversion errors
	var gvConvError;
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_PULSE_ALERT_CONFIG';

	//Alert Configuration ID
	var gvAlertId;

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "GET is not supported, perform a POST to update entry in Pulse Alert Config Table"
		}));
	}

	// -------------------------------------------------------- // 
	// Function to get the latest Alert ID                     //
	// -------------------------------------------------------- //
	function _getLastAlertId() {
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT MAX(\"ID\") FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\""
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
					"UPDATE \"" + gvSchemaName + "\".\"" + gvTableName +
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
				var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
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

	// -------------------------------------------------------- // 
	// Main function to add entries to the logging table        //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method === $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "GET is not supported, perform a POST to update entry in Pulse Alert Config Table"
			}));
		} else {
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
		}
	}

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();