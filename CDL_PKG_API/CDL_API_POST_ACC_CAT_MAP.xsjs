(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-13                                         //
	// Description: REST service to be able to create entries   //
	// in the Accounting Category Table. POST method is allowed //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service. method paramter should be passed in //
	// with either CREATE, DELETE, UPDATE to indicate if entry  //
	// is to be created, Deleted or Updated.                    //
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
	var gvTableName = 'CDL_ACC_CAT_MAP';
	//For Delete a method parameter with a value of 'DELETE' is passed in
	var gvFunction = $.request.parameters.get('method');

	//Variable for latest ID
	var gvId;

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "GET is not supported, perform a POST to add Account Category/Type Entry"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to get the latest ID                     //
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
			//ID
			oStatement.setInt(1, gvId);
			//Item Text
			oStatement.setString(2, oBody.ITEM_TEXT);
			//Account Type
			oStatement.setString(3, oBody.ACCOUNT_TYPE);
			//Account Category
			oStatement.setString(4, oBody.ACCOUNT_CATEGORY);

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully in Account Type/Category Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem inserting entries into the Account Type/Category Table, Error: " + errorObj.message;
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
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\" WHERE ID = ?");

			//Start Time
			oStatement.setString(1, oBody.ID);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entry deleted from Account Type/Category Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem deleting entry in the Account Type/Category Table, Error: " + errorObj.message;
		}
	}
	// ----------------------------------------------------------------// 
	// Function to update entries in the table                       //
	// ----------------------------------------------------------------//
	function _updateEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement(
				"UPDATE \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" SET ITEM_TEXT = ?, ACCOUNT_TYPE = ?, ACCOUNT_CATEGORY = ? WHERE ID = ?");

			//Populate the fields with values from the incoming payload
			//Item Text
			oStatement.setString(1, oBody.ITEM_TEXT);
			//Account Type
			oStatement.setString(2, oBody.ACCOUNT_TYPE);
			//Account Category
			oStatement.setString(3, oBody.ACCOUNT_CATEGORY);
			//ID
			oStatement.setInt(4, parseFloat(oBody.ID));

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries updated successfully in Account Type/Category Table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem updating entries into the Account Type/Category Table, Error: " + errorObj.message;
		}
	}

	// -------------------------------------------------------- // 
	// Main function to add entries                             //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method === $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "GET is not supported, perform a POST to add Account Type/Category Table"
			}));
		} else {
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
				//Perform Table Entry to be created in GL Routing Table
				try {
					_getLastId();
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