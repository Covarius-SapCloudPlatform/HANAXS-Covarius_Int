(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-13                                         //
	// Description: REST service to be able to read entries     //
	// from the Notification Routing Table.  Allowing filters   //
	// on the companyCode to be passed in as parameters.        //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_NOTIFICATION_ROUTING';
	var gvErrorMessage;
	
	var gvCompanyCode = $.request.parameters.get('companyCode');
	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method !== $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "Only GET Operation is supported, " +
				"with parameters companyCode or no restriction to return all entries"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery;
            
            if(gvCompanyCode)
            {
                lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"' + ' WHERE COMPANY_CODE =' + "'" + gvCompanyCode + "'";
            }
            else
            {
                lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';
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
					COMPANY_CODE: oResultSet.getString(1),
					ODATA_URL: oResultSet.getString(2)
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

	// -------------------------------------------------------- // 
	// Main function to read entries                            //
	// -------------------------------------------------------- //
	function main() {
		//Check the Method
		if ($.request.method !== $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
			    result: "Only GET Operation is supported, " +
				"with parameters companyCode or no restriction to return all entries"
			}));
		} else if ($.request.method === $.net.http.GET) {
			//Perform Table Entry to be created in Logging Table
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