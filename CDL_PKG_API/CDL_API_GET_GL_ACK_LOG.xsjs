(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-02                                         //
	// Description: REST service to be able to read entries     //
	// from the GL Ack Table.  Allowing filters                 //
	// on the document, fiscalYear and companyCode fields to be //
	// passed in as parameters.                                 //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_GL_ACK';
	var gvDocument = $.request.parameters.get('document');
	var gvFiscalYear = $.request.parameters.get('fiscalYear');
	var gvCompanyCode = $.request.parameters.get('companyCode');

	var gvErrorMessage;
	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method !== $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "Only GET Operation is supported, " +
				"with parameters document(SAP Document), fiscalYear(YYYY), " +
				" companyCode"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getLogEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery;

			//Build the Query
			lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';
			lvQuery = lvQuery + ' WHERE SAP_DOCUMENT = ' + "'" + gvDocument + "'";
			lvQuery = lvQuery + ' AND FISCAL_YEAR = ' + "'" + gvFiscalYear + "'";
			lvQuery = lvQuery + ' AND COMPANY_CODE = ' + "'" + gvCompanyCode + "'";

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
					Acknowledged: true
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
	// Main function to add entries to the logging table        //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method !== $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "Only GET Operation is supported, " +
					"with parameters document(SAP Document), fiscalYear(YYYY), " +
					" companyCode"
			}));
		} else if ($.request.method === $.net.http.GET) {
			//Read the Ack Table for Entry
			if (gvDocument && gvFiscalYear && gvCompanyCode) {
				try {
					_getLogEntries();
				} catch (errorObj) {
					$.response.status = 200;
					$.response.setBody(JSON.stringify({
						message: "API Called",
						result: gvErrorMessage
					}));
				}
			} else {
				$.response.status = 200;
				$.response.setBody(JSON.stringify({
					message: "API Called",
					result: "Only GET Operation is supported, " +
						"with parameters document(SAP Document), fiscalYear(YYYY), " +
						" companyCode"
				}));
			}
		}
	}

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();