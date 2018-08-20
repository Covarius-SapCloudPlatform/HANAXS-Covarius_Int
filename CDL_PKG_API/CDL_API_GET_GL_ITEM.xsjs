(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-20                                         //
	// Description: REST service to be able to read entries     //
	// from the GL Header Table.  Allowing filters              //
	// on the sapDocument, fiscalYear, companyCode, itemNo      //
	// and glAccount, postingDate fields to be passed in as     //
	// optional paramters.                                      //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_GL_ITEM';
	var gvSapDocument = $.request.parameters.get('sapDocument');
	var gvFiscalYear = $.request.parameters.get('fiscalYear');
	var gvCompanyCode = $.request.parameters.get('companyCode');
	var gvItemNo = $.request.parameters.get('itemNo');
	var gvGlAccount = $.request.parameters.get('glAccount');
	var gvPostingDate = $.request.parameters.get('postingDate');
	var gvOrderby = $.request.parameters.get('orderBy');
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
				"companyCode, itemNo, postingDate(YYYYMMDD), glAccount optionally"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery;

			if (!gvSapDocument && !gvFiscalYear && !gvCompanyCode && !gvPostingDate && !gvItemNo && !gvGlAccount) {
				lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';

				if (gvOrderby) {
					if (lvQuery) {
						lvQuery = lvQuery + ' ORDER BY ' + '"' + gvOrderby + '"';
					}
				}

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
				if (gvItemNo) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE ITEM_NO = ' + "'" + gvItemNo + "'";
						} else {
							lvQuery = lvQuery + ' AND ITEM_NO = ' + "'" + gvItemNo + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE ITEM_NO = ' + "'" + gvItemNo + "'";
					}
				}
				if (gvGlAccount) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE GL_ACCOUNT = ' + "'" + gvGlAccount + "'";
						} else {
							lvQuery = lvQuery + ' AND GL_ACCOUNT = ' + "'" + gvGlAccount + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE GL_ACCOUNT = ' + "'" + gvGlAccount + "'";
					}
				}
				if (gvOrderby) {
					if (lvQuery) {
						lvQuery = lvQuery + ' ORDER BY ' + '"' + gvOrderby + '"';
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
					ITEM_NO: oResultSet.getString(4),
					GL_ACCOUNT: oResultSet.getString(5),
					VALUE_DATE: oResultSet.getString(6),
					POSTING_DATE: oResultSet.getString(7),
					ITEM_TEXT: oResultSet.getString(8),
					REF_KEY1: oResultSet.getString(9),
					REF_KEY2: oResultSet.getString(10),
					REF_KEY3: oResultSet.getString(11),
					ACCOUNT_TYPE: oResultSet.getString(12),
					DOCUMENT_TYPE: oResultSet.getString(13),
					FISCAL_PERIOD: oResultSet.getString(14),
					PROFIT_CENTER: oResultSet.getString(15),
					ASSIGNMENT_NUMBER: oResultSet.getString(16),
					TRADING_PARTNER: oResultSet.getString(17),
					CUSTOMER: oResultSet.getString(18),
					VENDOR: oResultSet.getString(19),
					ENTRY_DATE: oResultSet.getString(20)
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
					"companyCode, itemNo, postingDate(YYYYMMDD), glAccount optionally"
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