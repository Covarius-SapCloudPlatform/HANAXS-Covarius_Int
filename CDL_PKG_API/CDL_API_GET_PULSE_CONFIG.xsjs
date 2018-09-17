(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description: REST service to be able to read entries     //
	// from the Pulse Configuration Table.                      //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTable = 'CDL_PULSE_CONFIG';
	var gvErrorMessage;

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method !== $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "Only GET Operation is supported"
		}));
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
					FREQ_PER_DAY: oResultSet.getString(2),
					ON_OFF: oResultSet.getString(3)
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
				result: "Only GET Operation is supported, "
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