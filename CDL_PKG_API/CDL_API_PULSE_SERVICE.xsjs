(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description:REST service to be able to create entries    //
	// in the Pulse Service Table. POST method is allowed       //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service. if a GET is performed, entries are  //
	// read from the table
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
	var gvTableName = 'CDL_PULSE_SERVICE';

	//ID
	var gvId;

	//Indicate if Service is to be updated or Deleted
	var gvFunction = $.request.parameters.get('method');
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
			if (gvFunction === "DELETE") {
				//Perform Table Entry to be deleted from GL Routing Table
				try {
					_deleteEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table entry deletion:" + errorObj.message;
				}
			} else if (gvFunction === "UPDATE") {
				_updateEntry();
			} else {
				//Perform Table Entry to be updated
				try {
					_getLastId();
					var lvExist = _checkEntry();
					if (!lvExist) {
						_createEntry();
					}
				} catch (errorObj) {
					gvTableUpdate = "Error during table update:" + errorObj.message;
				}
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
			var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';

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
					SERVICE_ID: oResultSet.getString(1),
					SERVICE_NAME: oResultSet.getString(2),
					VIRTUAL_TRANSLATION: oResultSet.getString(3),
					AGGREGATION: oResultSet.getString(4)
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
	// Function to get the latest ID                            //
	// -------------------------------------------------------- //
	function _getLastId() {
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT MAX(\"SERVICE_ID\") FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\""
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			gvId = rs.getString(1);
			gvId = parseInt(gvId);
		}
		if (gvId) {
			gvId = gvId + 1;
		} else {
			gvId = parseInt(1);
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
				'" VALUES (?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//Service ID
			oStatement.setInt(1, gvId);
			//Service Name
			oStatement.setString(2, oBody.SERVICE_NAME);
			//Virtual Translation
			oStatement.setString(3, oBody.VIRTUAL_TRANSLATION.toString());
			//Aggregation
			oStatement.setString(4, oBody.AGGREGATION.toString());

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully in Pulse Service Table;";
			gvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem inserting entries into the Pulse Service Table, Error: " + errorObj.message;
		}
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

			//Build the Statement to update the entries
			var oStatement = oConnection.prepareStatement(
				"UPDATE \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" SET VIRTUAL_TRANSLATION = ?, AGGREGATION = ? WHERE SERVICE_ID = ?");

			//Populate the fields with values from the incoming payload
			//Virtual Translation
			oStatement.setString(1, oBody.VIRTUAL_TRANSLATION.toString());
			//Aggregation
			oStatement.setString(2, oBody.AGGREGATION.toString());
			//ID
			oStatement.setInt(3, parseFloat(oBody.SERVICE_ID));

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries updated successfully in Service Table;";
			gvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem updating entries in the Pulse Service Table, Error: " + errorObj.message;
			gvStatus = "Error";
		}
	}

	//-----------------------------------------------------------------//
	// Function to check if the service name already exists in the tab //
	//-----------------------------------------------------------------//
	function _checkEntry() {
		var lvExist;
		//Get the Request Body
		var oBody = JSON.parse($.request.body.asString());

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"' + ' WHERE SERVICE_NAME =' + "'" + oBody.SERVICE_NAME + "'";

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			lvExist = true;
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		gvTableUpdate = "Table entry for this Service Already Exists";
		gvStatus = "Duplicate";
		return lvExist;

	}

	// ----------------------------------------------------------------// 
	// Function to delete entry from the table for routing address     //
	// ----------------------------------------------------------------//
	function _deleteEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\" WHERE SERVICE_ID = ?");

			//ID
			oStatement.setInt(1, parseInt(oBody.SERVICE_ID));

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entry deleted from Pulse Service Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem deleting entry in the Pulse Service Table, Error: " + errorObj.message;
		}
	}

})();