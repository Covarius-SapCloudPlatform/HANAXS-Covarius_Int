(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-20                                         //
	// Description: REST service to be able to read entries     //
	// from the GL Item/Currency Tables.  Allowing filters      //
	// on the sapDocument, fiscalYear, companyCode, itemNo      //
	// and glAccount, postingDate fields to be passed in as     //
	// optional paramters.                                      //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvItemTable = 'CDL_GL_ITEM';
	var gvCurrencyTable = 'CDL_GL_CURRENCY';
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

			// SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J1."ITEM_NO",
			// J1."GL_ACCOUNT", J1."VALUE_DATE", J1."POSTING_DATE", J1."ITEM_TEXT", 
			// J1."ACCOUNT_TYPE", J1."ENTRY_DATE", J2."CURRENCY", J2."CURRENCY_ISO", J2."AMOUNT"
			// FROM "CDL_SCH_LOGGING"."CDL_GL_ITEM" as J1
			// INNER JOIN "CDL_SCH_LOGGING"."CDL_GL_CURRENCY" as J2 
			// ON J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT" 
			// AND J1."FISCAL_YEAR" = J2."FISCAL_YEAR" 
			// AND J1."COMPANY_CODE" = J2."COMPANY_CODE" 
			// AND J1."ITEM_NO" = J2."ITEM_NO"

			lvQuery = 'SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J1."ITEM_NO",';
			lvQuery = lvQuery + 'J1."GL_ACCOUNT", J1."VALUE_DATE", J1."POSTING_DATE", J1."ITEM_TEXT",';
			lvQuery = lvQuery + 'J1."ACCOUNT_TYPE", J1."ENTRY_DATE", J2."CURRENCY", J2."CURRENCY_ISO", J2."AMOUNT"';
			lvQuery = lvQuery + 'FROM "' + gvSchemaName + '"."' + gvItemTable + '" as J1 ';
			lvQuery = lvQuery + 'INNER JOIN "' + gvSchemaName + '"."' + gvCurrencyTable + '" as J2 ';
			lvQuery = lvQuery + 'ON J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT" ';
			lvQuery = lvQuery + 'AND J1."FISCAL_YEAR" = J2."FISCAL_YEAR" ';
			lvQuery = lvQuery + 'AND J1."COMPANY_CODE" = J2."COMPANY_CODE" ';
			lvQuery = lvQuery + 'AND J1."ITEM_NO" = J2."ITEM_NO" ';

				if (gvSapDocument) {
					lvQuery = lvQuery + ' WHERE J1."SAP_DOCUMENT" = ' + "'" + gvSapDocument + "'";
				}
				if (gvFiscalYear) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE J1."FISCAL_YEAR" = ' + "'" + gvFiscalYear + "'";
						} else {
							lvQuery = lvQuery + ' AND J1."FISCAL_YEAR" = ' + "'" + gvFiscalYear + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE J1."FISCAL_YEAR" = ' + "'" + gvFiscalYear + "'";
					}
				}
				if (gvCompanyCode) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE J1."COMPANY_CODE" = ' + "'" + gvCompanyCode + "'";
						} else {
							lvQuery = lvQuery + ' AND J1."COMPANY_CODE" = ' + "'" + gvCompanyCode + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE J1."COMPANY_CODE" = ' + "'" + gvCompanyCode + "'";
					}
				}
				if (gvPostingDate) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE J1."POSTING_DATE" = ' + "'" + gvPostingDate + "'";
						} else {
							lvQuery = lvQuery + ' AND J1."POSTING_DATE" = ' + "'" + gvPostingDate + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE J1."POSTING_DATE" = ' + "'" + gvPostingDate + "'";
					}
				}
				if (gvItemNo) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE J1."ITEM_NO" = ' + "'" + gvItemNo + "'";
						} else {
							lvQuery = lvQuery + ' AND J1."ITEM_NO" = ' + "'" + gvItemNo + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE J1."ITEM_NO" = ' + "'" + gvItemNo + "'";
					}
				}
				if (gvGlAccount) {
					if (lvQuery) {
						if (lvQuery.indexOf('WHERE') === -1) {
							lvQuery = lvQuery + ' WHERE J1."GL_ACCOUNT" = ' + "'" + gvGlAccount + "'";
						} else {
							lvQuery = lvQuery + ' AND J1."GL_ACCOUNT" = ' + "'" + gvGlAccount + "'";
						}
					} else {
						lvQuery = lvQuery + ' WHERE J1."GL_ACCOUNT" = ' + "'" + gvGlAccount + "'";
					}
				}
				if (gvOrderby) {
					if (lvQuery) {
						lvQuery = lvQuery + ' ORDER BY ' + '"' + gvOrderby + '"';
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
					ACCOUNT_TYPE: oResultSet.getString(9),
					ENTRY_DATE: oResultSet.getString(10),
					CURRENCY: oResultSet.getString(11),
					CURRENCY_ISO: oResultSet.getString(12),
					AMOUNT: oResultSet.getString(13)
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