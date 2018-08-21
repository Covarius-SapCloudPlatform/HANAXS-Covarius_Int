(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-16                                         //
	// Description: REST service to be able to retrieve the     //
	// Grouping Values for Account Type based on Company Code   //
	// with paramter to restrict this selection based on        //
	// companyCode, postingDate, glAccount, postingStatus       //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate;
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvHeaderTable = 'CDL_GL_HEADER';
	var gvItemTable = 'CDL_GL_ITEM';
	var gvCurrencyTable = "CDL_GL_CURRENCY";
	var gvAccCatMapTable = "CDL_ACC_CAT_MAP";

	//Variables for incoming paramters
	var gvPostingDate = $.request.parameters.get('postingDate'),
		gvPostingDates,
		gvCompanyCode = $.request.parameters.get('companyCode'),
		gvCompanyCodes,
		gvGlAccount = $.request.parameters.get('glAccount'),
		gvGlAccounts,
		gvPostingStatus = $.request.parameters.get('postingStatus'),
		gvPostingStatuses;

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
	if ($.request.method === $.net.http.POST) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "POST is not supported, perform a GET to read the Account Type Amounts by Company Code"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to get the list of documents from Header, Item
	// -------------------------------------------------------- //
	function getEntries() {
		//Variables
		var lvQuery,
			item,
			status,
			lvType,
			lvAmount = 0,
			lvBSAmount = 0,
			lvPLAmount = 0,
			lvCompanyCode,
			lvOBSAmount = 0,
			records = [];

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		// SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J2."ITEM_TEXT", J2."ITEM_NO"
		// from "CDL_SCH_LOGGING"."CDL_GL_HEADER" as J1
		// inner join "CDL_SCH_LOGGING"."CDL_GL_ITEM" as J2
		// on J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT"
		// and J1."FISCAL_YEAR" = J2."FISCAL_YEAR"
		// and J1."COMPANY_CODE" = J2."COMPANY_CODE"

		lvQuery = 'SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J2."ITEM_TEXT", J2."ITEM_NO"';
		lvQuery = lvQuery + 'FROM "' + gvSchemaName + '"."' + gvHeaderTable + '" as J1 ';
		lvQuery = lvQuery + 'INNER JOIN "' + gvSchemaName + '"."' + gvItemTable + '" as J2 ';
		lvQuery = lvQuery + 'ON J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT" ';
		lvQuery = lvQuery + 'AND J1."FISCAL_YEAR" = J2."FISCAL_YEAR" ';
		lvQuery = lvQuery + 'AND J1."COMPANY_CODE" = J2."COMPANY_CODE" ';

		//Posting Date Restriction
		if (!gvPostingDates && gvPostingDate) {
			lvQuery = lvQuery + ' WHERE J1."POSTING_DATE" = ' + "'" + gvPostingDate + "'";
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

		//Order by Company Code
		lvQuery = lvQuery + 'ORDER BY "COMPANY_CODE"';

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {

			lvAmount = getValues(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(5));
			lvType = getType(rs.getString(4));

			if (rs.getString(3) != lvCompanyCode && lvCompanyCode) {
				item = {
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvPLAmount,
					"BALANCE_SHEET": lvBSAmount,
					"OFF_BALANCE_SHEET": lvOBSAmount
				};

				records.push(item);
				//Initialize Variables
				lvPLAmount = 0;
				lvBSAmount = 0;
				lvOBSAmount = 0;
				lvCompanyCode = rs.getString(3);
				lvAmount = parseFloat(lvAmount);
			} else {
				lvCompanyCode = rs.getString(3);
				lvAmount = parseFloat(lvAmount);

//				if (lvAmount > 0) {
					if (lvType === "Profit_Loss") {
						lvPLAmount = parseFloat(lvPLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvBSAmount = parseFloat(lvBSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvOBSAmount = parseFloat(lvOBSAmount) + lvAmount;
					}
//				}
			}
		}

		//Get the Last Item
		item = {
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvPLAmount,
			"BALANCE_SHEET": lvBSAmount,
			"OFF_BALANCE_SHEET": lvOBSAmount
		};

		records.push(item);

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		return records;
	}

	// -------------------------------------------------------- // 
	// Function to get the Amount Value from Currency Table     //
	// -------------------------------------------------------- //
	function getValues(pSapDocument, pFiscalYear, pCompanyCode, pItem) {
		var lvAmount,
			lvQuery;

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//         SELECT "AMOUNT"
		// from "CDL_SCH_LOGGING"."CDL_GL_CURRENCY"
		// where "SAP_DOCUMENT" = "12345"
		// and "FISCAL_YEAR" = "2018"
		// and "COMPANY_CODE" = "UK01"
		// and "ITEM_NO" = "002"

		lvQuery = 'SELECT "AMOUNT" FROM "' + gvSchemaName + '"."' + gvCurrencyTable + '"';
		lvQuery = lvQuery + 'WHERE "SAP_DOCUMENT" = ' + "'" + pSapDocument + "'";
		lvQuery = lvQuery + 'AND "FISCAL_YEAR" = ' + "'" + pFiscalYear + "'";
		lvQuery = lvQuery + 'AND "COMPANY_CODE" = ' + "'" + pCompanyCode + "'";
		lvQuery = lvQuery + 'AND "ITEM_NO" = ' + "'" + pItem + "'";

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			lvAmount = rs.getString(1);
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		return lvAmount;
	}

	// -------------------------------------------------------- // 
	// Function to get the Account Type from Mapping Table      //
	// -------------------------------------------------------- //
	function getType(pItemText) {
		var lvQuery,
			lvAccountType;

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		// 		SELECT "ITEM_TEXT", "ACCOUNT_TYPE"
		// FROM "CDL_SCH_LOGGING"."CDL_ACC_CAT_MAP"
		// where "ITEM_TEXT" = 'a_prem_exp'

		lvQuery = 'SELECT "ITEM_TEXT", "ACCOUNT_TYPE" FROM "' + gvSchemaName + '"."' + gvAccCatMapTable + '"';
		lvQuery = lvQuery + 'WHERE "ITEM_TEXT" = ' + "'" + pItemText + "'";

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			lvAccountType = rs.getString(2);
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		return lvAccountType;
	}

	// -------------------------------------------------------- // 
	// Main function to get the Statisctic Values               //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method === $.net.http.POST) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "POST is not supported, perform a GET to read the Account Type Amounts by Company Code"
			}));
		} else {
			try {
				//Calculate Values
				var records = getEntries();

				$.response.status = 200;
				$.response.setBody(JSON.stringify({
					message: "API Called",
					data: records
				}));

			} catch (err) {
				$.trace.error(JSON.stringify({
					message: err.message
				}));
				$.response.status = 200;
				$.response.setBody(JSON.stringify({
					message: "API Called",
					error: err.message
				}));
			}
		}
	}
	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();