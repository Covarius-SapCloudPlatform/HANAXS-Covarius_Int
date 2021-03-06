(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-13                                         //
	// Description: REST service to be able to create entries   //
	// in the Notification Routing Table. POST method is allowed//
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
	var gvStatus;
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_NOTIFICATION_ROUTING';
	//For Delete a method parameter with a value of 'DELETE' is passed in
	var gvFunction = $.request.parameters.get('method');

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "GET is not supported, perform a POST to add GL Routing Entry"
		}));
	}
	// ----------------------------------------------------------------// 
	// Function to insert entries into the table for routing address   //
	// ----------------------------------------------------------------//
	function _createRoutingEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//CompanyCode
			oStatement.setString(1, oBody.COMPANY_CODE);
			//OData URL
			oStatement.setString(2, oBody.ODATA_URL);
			//System
			oStatement.setString(3, oBody.SYSTEM);
			//Client
			oStatement.setString(4, oBody.CLIENT);

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully in Notification Routing Table;";
			gvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem inserting entries into the Notification Routing Table, Error: " + errorObj.message;
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
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\" WHERE COMPANY_CODE = ?");

			//Start Time
			oStatement.setString(1, oBody.COMPANY_CODE);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entry deleted from Notification Routing Table;";
			gvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem deleting entry in the Notification Routing Table, Error: " + errorObj.message;
			gvStatus = "Error";
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
				"\" SET SYSTEM = ?, CLIENT = ?, ODATA_URL = ? WHERE COMPANY_CODE = ?"
			);

			//Populate the fields with values from the incoming payload
			//System
			oStatement.setString(1, oBody.SYSTEM);
			//Client
			oStatement.setString(2, oBody.CLIENT);
			//Target ODATA Url
			oStatement.setString(3, oBody.ODATA_URL);
			//Company Code
			oStatement.setString(4, oBody.COMPANY_CODE);

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
	// -------------------------------------------------------- // 
	// Main function to add entries to the logging table        //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method === $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "GET is not supported, perform a POST to add Notification Routing Entries"
			}));
		} else {
			if (gvFunction === "DELETE") {
				//Perform Table Entry to be deleted from GL Routing Table
				try {
					_deleteRoutingEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table entry deletion:" + errorObj.message;
				}
			} else if (gvFunction === "UPDATE") {
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
				TableUpdateStatus: gvTableUpdate,
				Status: gvStatus
			}));
		}
	}

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();