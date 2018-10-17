(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description: REST service to be able to create entries   //
	// in the Pulse Error Codes Table. POST method is allowed   //
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
	var gvTableName = 'CDL_PULSE_ERROR_CODES';

	//Alert Configuration ID
	var gvId;

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "GET is not supported, perform a POST to update entry in Pulse Error Codes Table"
		}));
	}

	// -------------------------------------------------------- // 
	// Function to get the latest ID                            //
	// -------------------------------------------------------- //
	function _getLastId() {
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
			gvId = rs.getString(1);
			gvId = parseInt(gvId);
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

			if (oBody.ID || gvId) {
				//Build the Statement to update the entries
				var oStatement = oConnection.prepareStatement(
					"UPDATE \"" + gvSchemaName + "\".\"" + gvTableName +
					"\" SET CDLE001 = ?, CDLE002 = ?, CDLE003 = ?, CDLE004 = ?, CDLS000 = ? WHERE ID = ?");

				//Populate the fields with values from the incoming payload
				//Sap Creation Errors
				oStatement.setString(1, oBody.CDLE001);
				//Communication Errors to SAP
				oStatement.setString(2, oBody.CDLE002);
				//Communication Errors from SAP
				oStatement.setString(3, oBody.CDLE003);
				//Communication Errors to Third Party
				oStatement.setString(4, oBody.CDLE004);
				//Sap Creation Success
				oStatement.setString(5, oBody.CDLS000);

				//ID
				if (oBody.ID) {
					oStatement.setInt(6, parseFloat(oBody.ID));
				} else {
					oStatement.setInt(6, parseFloat(gvId));
				}
			} else {
				//Build the Statement to insert the entries
				var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
					'" VALUES (?, ?, ?, ?, ?, ?)');

				//Populate the fields with values from the incoming payload
				//ID
				oStatement.setInt(1, 1);
				//Sap Creation Errors
				oStatement.setString(2, oBody.CDLE001);
				//Communication Errors to SAP
				oStatement.setString(3, oBody.CDLE002);
				//Communication Errors from SAP
				oStatement.setString(4, oBody.CDLE003);
				//Communication Errors to Third Party
				oStatement.setString(5, oBody.CDLE004);
				//Sap Creation Success
				oStatement.setString(6, oBody.CDLS000);
			}
			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries updated successfully in Pulse Error Codes Table;";
			gvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem updating entries in the Pulse Error Codes Table, Error: " + errorObj.message;
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
				result: "GET is not supported, perform a POST to update entry in Pulse Error Codes Table"
			}));
		} else {
			//Perform Table Entry to be updated
			try {
				_getLastId();
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