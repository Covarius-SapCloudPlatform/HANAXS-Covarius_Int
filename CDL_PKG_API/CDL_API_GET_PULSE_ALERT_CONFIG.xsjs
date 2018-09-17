(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description: REST service to be able to read entries     //
	// from the Pulse Alert Configuration Table. Allowing       //
	// filters on recipientEmail.                               //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTable = 'CDL_PULSE_ALERT_CONFIG';
	var gvErrorMessage;

	var gvRecipientEmail = $.request.parameters.get('recipientEmail');

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method !== $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "Only GET Operation is supported, " +
				"with parameters recipientEmail, optionally"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTable + '"';

			//Check if RecipientEmail is used as restriction
			if (gvRecipientEmail) {
				lvQuery = lvQuery + ' WHERE "RECIPIENT_EMAIL" = ' + "'" + gvRecipientEmail + "'";
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
					ALERT_ID: oResultSet.getString(1),
					RECIPIENT_EMAIL: oResultSet.getString(2),
					INTERFACE: oResultSet.getString(3),
					EMAIL_HEADER: oResultSet.getString(4),
					DATA_ERROR_ALERT: oResultSet.getString(5),
					SAP_RESPONSE_ALERT: oResultSet.getString(6),
					SAP_DELIVERY_ALERT: oResultSet.getString(7)
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
					"with parameters recipientEmail, optionally"
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