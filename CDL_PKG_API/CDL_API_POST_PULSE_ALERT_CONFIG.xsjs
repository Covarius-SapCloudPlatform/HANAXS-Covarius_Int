(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description: REST service to be able to create entries   //
	// in the Pulse Alert Config Table. POST method is allowed //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service. method paramter should be passed in //
	// with either CREATE, DELETE, to indicate if entry is to   //
	// be created or Deleted.                                   //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate;
	//Variable to carry the conversion errors
	var gvConvError;
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_PULSE_ALERT_CONFIG';

	//For Delete a method parameter with a value of 'DELETE' is passed in
	var gvFunction = $.request.parameters.get('method');

	//Variable for last Alert ID
	var gvAlertId;

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "GET is not supported, perform a POST to add/delete entries in Pulse Alter Config Entry"
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
			"SELECT MAX(\"ALERT_ID\") FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\""
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
	function _createEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//Alert ID
			oStatement.setInt(1, gvAlertId);
			//Recipient Email
			oStatement.setString(2, oBody.RECIPIENT_EMAIL);
			//Interface
			oStatement.setString(3, oBody.INTERFACE);
			//Email Header
			oStatement.setString(4, oBody.EMAIL_HEADER);
			//Data Error Alert
			oStatement.setString(5, oBody.DATA_ERROR_ALERT);
			//Sap Response Alert
			oStatement.setString(6, oBody.SAP_RESPONSE_ALERT);
			//Sap Delivery Alert
			oStatement.setString(7, oBody.SAP_DELIVERY_ALERT);

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully in Alert Config Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem inserting entries into the Alert Config Table, Error: " + errorObj.message;
		}
	}

	// ----------------------------------------------------------------// 
	// Function to delete entry from the table                         //
	// ----------------------------------------------------------------//
	function _deleteEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" WHERE ALERT_ID = ? AND RECIPIENT_EMAIL = ?");

			//Alert ID
			oStatement.setString(1, oBody.ALERT_ID);
			//Recipient Email
			oStatement.setString(2, oBody.RECIPIENT_EMAIL);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entry deleted from Alert Config Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem deleting entry in the Alert Config Table, Error: " + errorObj.message;
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
				result: "GET is not supported, perform a POST to add/delete entries in Pulse Alter Config Entry"
			}));
		} else {
			if (gvFunction === "DELETE") {
				//Perform Table Entry to be deleted
				try {
					_deleteEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table entry deletion:" + errorObj.message;
				}
			} else {
				//Perform Table Entry to be created
				try {
					_getLastAlertId();
					_createEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table insert:" + errorObj.message;
				}
			}

			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				TableUpdateStatus: gvTableUpdate
			}));
		}
	}

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();