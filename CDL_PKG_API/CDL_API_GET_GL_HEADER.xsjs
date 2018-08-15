(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-14                                         //
	// Description: REST service to be able to read entries     //
	// from the GL Header Table.  Allowing filters              //
	// on the sapDocument, fiscalYear, companyCode, postingDate //
	// and referenceDocument fields to be passed in as          //
	// optional paramters.                                      //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_GL_HEADER';
	var gvSapDocument = $.request.parameters.get('sapDocument');
	var gvFiscalYear = $.request.parameters.get('fiscalYear');
	var gvCompanyCode = $.request.parameters.get('companyCode');
	var gvPostingDate = $.request.parameters.get('postingDate');
	var gvReferenceDocument = $.request.parameters.get('referenceDocument');
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
				"with parameters sapDocument, fiscalYear(YYYY), " +
				"companyCode, postingDate(YYYYMMDD), optionally"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery;

			if (!gvSapDocument && !gvFiscalYear && !gvCompanyCode && !gvPostingDate && !gvReferenceDocument) {
				lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';
			} else {
				lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';
				if (gvSapDocument) {
					lvQuery = lvQuery + ' WHERE SAP_DOCUMENT = ' + "'" + gvSapDocument + "'";
				}
				if (gvFiscalYear) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE FISCAL_YEAR = ' + "'" + gvFiscalYear + "'";
						} else {
							lvQuery = lvQuery + ' AND FISCAL_YEAR = ' + "'" + gvFiscalYear + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE FISCAL_YEAR = ' + "'" + gvFiscalYear + "'";
					}
				}
				if (gvCompanyCode) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE COMPANY_CODE = ' + "'" + gvCompanyCode + "'";
						} else {
							lvQuery = lvQuery + ' AND COMPANY_CODE = ' + "'" + gvCompanyCode + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE COMPANY_CODE = ' + "'" + gvCompanyCode + "'";
					}
				}
				if (gvPostingDate) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE POSTING_DATE = ' + "'" + gvPostingDate + "'";
						} else {
							lvQuery = lvQuery + ' AND POSTING_DATE = ' + "'" + gvPostingDate + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE POSTING_DATE = ' + "'" + gvPostingDate + "'";
					}
				}
				if (gvReferenceDocument) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE REFERENCE_DOCUMENT = ' + "'" + gvReferenceDocument + "'";
						} else {
							lvQuery = lvQuery + ' AND REFERENCE_DOCUMENT = ' + "'" + gvReferenceDocument + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE REFERENCE_DOCUMENT = ' + "'" + gvReferenceDocument + "'";
					}
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
					SAP_DOCUMENT: oResultSet.getString(1),
					FISCAL_YEAR: oResultSet.getString(2),
					COMPANY_CODE: oResultSet.getString(3),
					MESSAGE_GUID: oResultSet.getString(4),
					REFERENCE_KEY: oResultSet.getString(5),
					BUSINESS_TRANSACTION: oResultSet.getString(6),
					HEADERTEXT: oResultSet.getString(7),
					DOCUMENT_DATE: oResultSet.getString(8),
					POSTING_DATE: oResultSet.getString(9),
					TRANSLATION_DATE: oResultSet.getString(10),
					FISCAL_PERIOD: oResultSet.getString(11),
					DOCUMENT_TYPE: oResultSet.getString(12),
					REFERENCE_DOCUMENT: oResultSet.getString(13),
					REFERENCE_DOC_NO_LONG: oResultSet.getString(14),
					ACCOUNTING_PRINCIPLE: oResultSet.getString(15),
					BILLING_CATEGORY: oResultSet.getString(16),
					STATUS_CODE: oResultSet.getString(17),
					STATUS_MESSAGE: oResultSet.getString(18),
					DOCUMENT_STATUS: oResultSet.getString(19),
					DOCUMENT_STATUS_DESCRIPTION: oResultSet.getString(20),
					POST_INDICATOR: oResultSet.getString(21),
					ACCOUNT_TYPE: oResultSet.getString(22),
					ENTRY_DATE: oResultSet.getString(23),
					UPDATE_GUID: oResultSet.getString(24)
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
	// Main function to read entries from table                 //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method !== $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "Only GET Operation is supported, " +
					"with parameters sapDocument, fiscalYear(YYYY), " +
					"companyCode, postingDate(YYYYMMDD), optionally"
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