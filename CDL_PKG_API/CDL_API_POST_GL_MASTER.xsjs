(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-08                                         //
	// Description: REST service to be able to create entries   //
	// in the GL Master Table.POST method is allowed            //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service.                                     //
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
	var gvTableName = 'CDL_GL_MASTER';

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "GET is not supported, perform a POST to add GL Master Entries"
		}));
	}
	// ----------------------------------------------------------------// 
	// Function to insert entries into the table for integration event //
	// ----------------------------------------------------------------//
	function _createMasterEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());
            
			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//Message GUID
			oStatement.setString(1, oBody.MESSAGE_GUID);
			//Status
			oStatement.setString(2, oBody.STATUS);
			//Direction
			oStatement.setString(3, oBody.DIRECTION);
			//Date
			var lvDate = new Date();
			var lvDateString = lvDate.toISOString().substring(0, 10);
			oStatement.setString(4, lvDateString);
			//SAP Document
			oStatement.setString(5, oBody.SAP_DOCUMENT);
			//Fiscal Year
			oStatement.setString(6, oBody.FISCAL_YEAR);
			//Company Code
			oStatement.setString(7, oBody.COMPANY_CODE);
			//Reference Document
			oStatement.setString(8, oBody.REFERENCE_DOCUMENT);

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully in GL Master Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem inserting entries into the GL Master Table, Error: " + errorObj.message;
		}
	}
	// ------------------------------------------------------------- // 
	// Function to delete entries in GL Master older than 90 days    //
	// ------------------------------------------------------------- //
	function _deleteHistoricEntries() {

		try {
			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Get date 90 days back
			var lvDate = new Date();
			lvDate.setDate(lvDate.getDate() - 90);
			var lvDateString = lvDate.toISOString().split('T')[0];

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\" WHERE DATE <= ?");

			//Start Time
			oStatement.setString(1, lvDateString);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate += "Table entries deleted for historic entries older than 90 days;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate += ",There was a problem deleting entries in the GL Master Table, Error: " + errorObj.message;
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
				result: "GET is not supported, perform a POST to add GL Master Entries"
			}));
		} else {
			//Perform Table Entry to be created in GL Master Table
			try {
				_createMasterEntry();
			} catch (errorObj) {
				gvTableUpdate = "Error during table insert:" + errorObj.message;
			}
			//Delete all entries older than 90 days
			try {
				//GL Master Table
				_deleteHistoricEntries();
			} catch (errorObj) {
				gvTableUpdate += "Error during deletion of historic entries:" + errorObj.message;
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