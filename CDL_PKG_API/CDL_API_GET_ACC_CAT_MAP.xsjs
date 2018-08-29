(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-28                                         //
	// Description: REST service to be able to read entries     //
	// from the Account Category/Type Mapping Table. Allowing   //
	// filters on itemText.                                     //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTable = 'CDL_ACC_CAT_MAP';
	var gvErrorMessage;

	var gvItemText = $.request.parameters.get('itemText');

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method !== $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "Only GET Operation is supported, " +
				"with parameters itemText, optionally"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTable + '"';

			//Check if Item Text is used as restriction
			if (gvItemText) {
				lvQuery = lvQuery + ' WHERE "ITEM_TEXT" = ' + "'" + gvItemText + "'";
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
					ITEM_TEXT: oResultSet.getString(1),
					ACCOUNT_TYPE: oResultSet.getString(2),
					ACCOUNT_CATEGORY: oResultSet.getString(3)
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
	// Main function to read entries from table                 //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method !== $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "Only GET Operation is supported, " +
					"with parameters itemText, optionally"
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
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();