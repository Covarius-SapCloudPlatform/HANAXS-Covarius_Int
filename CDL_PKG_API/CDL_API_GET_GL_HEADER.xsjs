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
	var gvHeaderTable = 'CDL_GL_HEADER';
	var gvItemTable = 'CDL_GL_ITEM';

	var gvSapDocument = $.request.parameters.get('sapDocument');
	var gvFiscalYear = $.request.parameters.get('fiscalYear');
	var gvCompanyCode = $.request.parameters.get('companyCode'),
		gvCompanyCodes;
	var gvPostingDate = $.request.parameters.get('postingDate'),
		gvPostingDates;
	var gvReferenceDocument = $.request.parameters.get('referenceDocument');
	var gvGlAccount = $.request.parameters.get('glAccount'),
		gvGlAccounts;
	var gvPostingStatus = $.request.parameters.get('postingStatus'),
		gvPostingStatuses;
	var gvErrorMessage;

	//Check if there are multiple Posting Date Restrictions
	if (gvPostingDate) {
		if (gvPostingDate.indexOf(',') !== -1) {
			gvPostingDates = gvPostingDate.split(',');
		}
	}

	//Check if there are multiple Company Code Restrictions
	if (gvCompanyCode) {
		if (gvCompanyCode.indexOf(',') !== -1) {
			gvCompanyCodes = gvCompanyCode.split(',');
		}
	}

	//Check if there are multiple GL Account Restrictions
	if (gvGlAccount) {
		if (gvGlAccount.indexOf(',') !== -1) {
			gvGlAccounts = gvGlAccount.split(',');
		}
	}

	//Check if there are multiple Posting Status Restrictions
	if (gvPostingStatus) {
		if (gvPostingStatus.indexOf(',') !== -1) {
			gvPostingStatuses = gvPostingStatus.split(',');
		}
	}

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
		var status,
			lvSapDocument,
			lvCompanyCode,
			lvFiscalYear;

		try {
			//Variable to keep query statement 
			var lvQuery =
				'SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J1."MESSAGE_GUID", J1."REFERENCE_KEY", J1."BUSINESS_TRANSACTION", J1."HEADERTEXT", J1."DOCUMENT_DATE",';
			lvQuery = lvQuery +
				'J1."POSTING_DATE", J1."TRANSLATION_DATE", J1."FISCAL_PERIOD", J1."DOCUMENT_TYPE", J1."REFERENCE_DOCUMENT", J1."REFERENCE_DOC_NO_LONG", J1."ACCOUNTING_PRINCIPLE",';
			lvQuery = lvQuery +
				'J1."BILLING_CATEGORY", J1."STATUS_CODE", J1."STATUS_MESSAGE", J1."DOCUMENT_STATUS", J1."DOCUMENT_STATUS_DESCRIPTION", J1."POST_INDICATOR", J1."ACCOUNT_TYPE", ';
			lvQuery = lvQuery +
				'J1."ENTRY_DATE", J1."UPDATE_GUID", J1."DOCUMENT_STATUS_DESCRIPTION", J1."POST_INDICATOR", J1."ACCOUNT_TYPE", J1."ENTRY_DATE", J1."UPDATE_GUID"';
			lvQuery = lvQuery + 'FROM "' + gvSchemaName + '"."' + gvHeaderTable + '" as J1 ';

			//Check if GL Account is used as restriction, then add the join
			if (gvGlAccount) {
				lvQuery = lvQuery + 'FULL OUTER JOIN "' + gvSchemaName + '"."' + gvItemTable + '" as J2 ';
				lvQuery = lvQuery + 'ON J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT" ';
				lvQuery = lvQuery + 'AND J1."FISCAL_YEAR" = J2."FISCAL_YEAR" ';
				lvQuery = lvQuery + 'AND J1."COMPANY_CODE" = J2."COMPANY_CODE" ';
			}

			//GL Account Restriction
			if (!gvGlAccounts && gvGlAccount) {
				if (lvQuery.indexOf('WHERE') === -1) {
					lvQuery = lvQuery + ' WHERE J2."GL_ACCOUNT" = ' + "'" + gvGlAccount + "'";
				} else {
					lvQuery = lvQuery + ' AND J2."GL_ACCOUNT" = ' + "'" + gvGlAccount + "'";
				}
			} else if (gvGlAccounts) {
				for (var j = 0; j <= gvGlAccounts.length; j++) {
					if (gvGlAccounts[j]) {
						if (j === 0) {
							if (lvQuery.indexOf('WHERE') === -1) {
								lvQuery = lvQuery + ' WHERE ( J2."GL_ACCOUNT" = ' + "'" + gvGlAccounts[j] + "'";
							} else {
								lvQuery = lvQuery + ' AND ( J2."GL_ACCOUNT" = ' + "'" + gvGlAccounts[j] + "'";
							}

						} else {
							lvQuery = lvQuery + ' OR J2."GL_ACCOUNT" = ' + "'" + gvGlAccounts[j] + "' )";
						}
					}
				}
			}

			//SAP Document Restrictions
			if (gvSapDocument) {
				lvQuery = lvQuery + ' WHERE J1."SAP_DOCUMENT" = ' + "'" + gvSapDocument + "'";
			}

			//Fiscal Year
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

			//Company Code Restriction
			if (!gvCompanyCodes && gvCompanyCode) {
				if (lvQuery.indexOf('WHERE') === -1) {
					lvQuery = lvQuery + ' WHERE J1."COMPANY_CODE" = ' + "'" + gvCompanyCode + "'";
				} else {
					lvQuery = lvQuery + ' AND J1."COMPANY_CODE" = ' + "'" + gvCompanyCode + "'";
				}
			} else if (gvCompanyCodes) {
				for (var j = 0; j <= gvCompanyCodes.length; j++) {
					if (gvCompanyCodes[j]) {
						if (j === 0) {
							if (lvQuery.indexOf('WHERE') === -1) {
								lvQuery = lvQuery + ' WHERE ( J1."COMPANY_CODE" = ' + "'" + gvCompanyCodes[j] + "'";
							} else {
								lvQuery = lvQuery + ' AND ( J1."COMPANY_CODE" = ' + "'" + gvCompanyCodes[j] + "'";
							}

						} else {
							lvQuery = lvQuery + ' OR J1."COMPANY_CODE" = ' + "'" + gvCompanyCodes[j] + "' )";
						}
					}
				}
			}

			//Posting Date Restriction
			if (!gvPostingDates && gvPostingDate) {
				if (lvQuery.indexOf('WHERE') === -1) {
					lvQuery = lvQuery + ' WHERE J1."POSTING_DATE" = ' + "'" + gvPostingDate + "'";
				} else {
					lvQuery = lvQuery + ' AND J1."POSTING_DATE" = ' + "'" + gvPostingDate + "'";
				}
			} else if (gvPostingDates) {
				for (var j = 0; j <= gvPostingDates.length; j++) {
					if (gvPostingDates[j]) {
						if (j === 0) {
							if (lvQuery.indexOf('WHERE') === -1) {
								lvQuery = lvQuery + ' WHERE ( J1."POSTING_DATE" = ' + "'" + gvPostingDates[j] + "'";
							} else {
								lvQuery = lvQuery + ' AND ( J1."POSTING_DATE" = ' + "'" + gvPostingDates[j] + "'";
							}

						} else {
							lvQuery = lvQuery + ' OR J1."POSTING_DATE" = ' + "'" + gvPostingDates[j] + "' )";
						}
					}
				}
			}

			if (gvReferenceDocument) {
				if (lvQuery) {
					if (lvQuery.indexOf('WHERE') === -1) {
						lvQuery = lvQuery + ' WHERE J1."REFERENCE_DOCUMENT" = ' + "'" + gvReferenceDocument + "'";
					} else {
						lvQuery = lvQuery + ' AND J1."REFERENCE_DOCUMENT" = ' + "'" + gvReferenceDocument + "'";
					}
				} else {
					lvQuery = lvQuery + ' WHERE J1."REFERENCE_DOCUMENT" = ' + "'" + gvReferenceDocument + "'";
				}
			}

			//Posting Status Restriction
			if (!gvPostingStatus && gvPostingStatuses) {
				if (gvPostingStatus === "Parked") {
					status = "V";
				} else {
					status = "";
				}
				if (lvQuery.indexOf('WHERE') === -1) {
					lvQuery = lvQuery + ' WHERE J1."DOCUMENT_STATUS" = ' + "'" + status + "'";
				} else {
					lvQuery = lvQuery + ' AND J1."DOCUMENT_STATUS" = ' + "'" + status + "'";
				}
			} else if (gvPostingStatuses) {
				for (var j = 0; j <= gvPostingStatuses.length; j++) {
					if (gvPostingStatuses[j]) {
						if (gvPostingStatuses[j] === "Parked") {
							status = "V";
						} else {
							status = "";
						}
						if (j === 0) {
							if (lvQuery.indexOf('WHERE') === -1) {
								lvQuery = lvQuery + ' WHERE ( J1."DOCUMENT_STATUS" = ' + "'" + status + "'";
							} else {
								lvQuery = lvQuery + ' AND ( J1."DOCUMENT_STATUS" = ' + "'" + status + "'";
							}

						} else {
							lvQuery = lvQuery + ' OR J1."DOCUMENT_STATUS" = ' + "'" + status + "' )";
						}
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

				if (lvSapDocument !== oResultSet.getString(1)) {
					oResult.records.push(record);
					lvSapDocument = oResultSet.getString(1);
					lvCompanyCode = oResultSet.getString(3);
					lvFiscalYear = oResultSet.getString(2);
				} else {
					lvSapDocument = oResultSet.getString(1);
					lvCompanyCode = oResultSet.getString(3);
					lvFiscalYear = oResultSet.getString(2);
				}
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