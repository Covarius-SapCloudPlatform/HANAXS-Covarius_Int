(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-11-02                                         //
	// Description: REST service to be able to create/update/   //
	// delete/read entries from the Service Routing Table.      //
	// Allowing filters for the read on serviceName, companyCode//
	// to be passed in as parameters. As well as a method on    //
	// POST operations, to indicate, CREATE/DELETE/UPDATE       //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_PULSE_SERVICE_ROUTES';
	var gvServiceTable = 'CDL_PULSE_SERVICE';

	var gvErrorMessage;
	var gvTableUpdate;
	//Variable to carry the conversion errors
	var gvConvError;

	var gvCompanyCode = $.request.parameters.get('companyCode');
	var gvServiceName = $.request.parameters.get('serviceName');
	var gvMethod = $.request.parameters.get('method');
	var gvStatus;

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
			if (gvMethod === "DELETE") {
				//Perform Table Entry to be deleted from GL Routing Table
				try {
					_deleteRoutingEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table entry deletion:" + errorObj.message;
				}
			} else if (gvMethod === "UPDATE") {
				try {
					_updateEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table update:" + errorObj.message;
				}
			} else {
				//Perform Table Entry to be created in GL Routing Table
				try {
					_createRoutingEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table insert:" + errorObj.message;
				}
			}

			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				TableUpdateStatus: gvTableUpdate
			}));

		} else if ($.request.method === $.net.http.GET) {
			//Read Entries from the Table
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

			if (gvCompanyCode) {
				lvQuery = lvQuery + ' WHERE COMPANY_CODE =' + "'" + gvCompanyCode + "'";
			}
			if (gvServiceName) {
				if (lvQuery.contains("WHERE")) {
					lvQuery = lvQuery + ' AND SERVICE_NAME =' + "'" + gvServiceName + "'";
				} else {
					lvQuery = lvQuery + ' WHERE SERVICE_NAME =' + "'" + gvServiceName + "'";
				}
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
					SERVICE_ID: oResultSet.getString(1),
					SERVICE_NAME: oResultSet.getString(2),
					COMPANY_CODE: oResultSet.getString(3),
					SYSTEM: oResultSet.getString(4),
					CLIENT: oResultSet.getString(5),
					TARGET_ODATA_URL: oResultSet.getString(6),
					RESPONSE_URL: oResultSet.getString(7),
					FOUND: "TRUE"
				};

				oResult.records.push(record);
				record = "";
			}

			if (!oResult.records[0]) {
				var record = {
					FOUND: "FALSE"
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
	// ----------------------------------------------------------------// 
	// Function to insert entries into the table for routing address   //
	// ----------------------------------------------------------------//
	function _createRoutingEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Service ID
			var lvServiceId;
			if (!oBody.SERVICE_ID) {
				lvServiceId = _getServiceId(oBody.SERVICE_NAME);
			} else {
				lvServiceId = oBody.SERVICE_ID;
			}

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//Service ID
			oStatement.setInt(1, parseInt(lvServiceId));
			//Service Name
			oStatement.setString(2, oBody.SERVICE_NAME);
			//Company Code
			oStatement.setString(3, oBody.COMPANY_CODE);
			//System
			oStatement.setString(4, oBody.SYSTEM);
			//Client
			oStatement.setString(5, oBody.CLIENT);
			//Target OData URL
			oStatement.setString(6, oBody.TARGET_ODATA_URL);
			//Response URL
			oStatement.setString(7, oBody.RESPONSE_URL);

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully in Pulse Service Route Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem inserting entries into the Pulse Service Route Table, Error: " + errorObj.message;
		}
	}

	// ----------------------------------------------------------------// 
	// Function to update entry                                        //
	// ----------------------------------------------------------------//
	function _updateEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();
			var oStatement;

			//Build the Statement to update the entries
			var oStatement = oConnection.prepareStatement(
				"UPDATE \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" SET SYSTEM = ?, CLIENT = ?, TARGET_ODATA_URL = ?, RESPONSE_URL = ? WHERE SERVICE_ID = ? AND SERVICE_NAME = ? AND COMPANY_CODE = ?"
			);

			//Populate the fields with values from the incoming payload
			//System
			oStatement.setString(1, oBody.SYSTEM);
			//Client
			oStatement.setString(2, oBody.CLIENT);
			//Target ODATA Url
			oStatement.setString(3, oBody.TARGET_ODATA_URL);
			//Response URL 
			if (oBody.RESPONSE_URL) {
				oStatement.setString(4, oBody.RESPONSE_URL);
			} else {
				oStatement.setString(4, "");
			}
			//Service Id
			oStatement.setInt(5, parseInt(oBody.SERVICE_ID));
			//Service Name
			oStatement.setString(6, oBody.SERVICE_NAME);
			//Company Code
			oStatement.setString(7, oBody.COMPANY_CODE);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries updated successfully in Pulse Service Route Table;";
			gvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem updating entries in the Pulse Service Route Table, Error: " + errorObj.message;
			gvStatus = "Error";
		}
	}
	// ----------------------------------------------------------------// 
	// Function to delete entry from the table for routing address     //
	// ----------------------------------------------------------------//
	function _deleteRoutingEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" WHERE SERVICE_ID = ? AND SERVICE_NAME = ? AND COMPANY_CODE = ?");

			//Service ID
			oStatement.setInt(1, parseInt(oBody.SERVICE_ID));
			//Service Name
			oStatement.setString(2, oBody.SERVICE_NAME);
			//Company Code
			oStatement.setString(3, oBody.COMPANY_CODE);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entry deleted from Pulse Service Route Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem deleting entry in the Pulse Service Route Table, Error: " + errorObj.message;
		}
	}
	// ----------------------------------------------------------------// 
	// Function to read the Service Id for the Service Name            //
	// ----------------------------------------------------------------//	
	function _getServiceId(pServiceName) {
		try {
			//Connect to the Database and execute the query
			var oConnection = $.db.getConnection();
			var oStatement = oConnection.prepareStatement("SELECT SERVICE_ID FROM \"" + gvSchemaName + "\".\"" + gvServiceTable +
				"\" WHERE SERVICE_NAME = ?");

			//Service ID
			oStatement.setString(1, pServiceName);

			oStatement.execute();
			var oResultSet = oStatement.getResultSet();
			var lvServiceId;

			while (oResultSet.next()) {
				lvServiceId = oResultSet.getString(1);
			}

			oResultSet.close();
			oStatement.close();
			oConnection.close();

		} catch (errorObj) {
			gvErrorMessage = errorObj.message;
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
		}

		return lvServiceId;
	}

	// ----------------------------------------------------------------// 
	// END OF PROGRAM                                                  //
	// ----------------------------------------------------------------//
})();