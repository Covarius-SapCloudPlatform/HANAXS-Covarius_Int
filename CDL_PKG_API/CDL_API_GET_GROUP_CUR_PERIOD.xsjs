(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-16                                         //
	// Description: REST service to be able to retrieve the     //
	// Grouping Values for Account Type based on Company Code   //
	// with parameter to also group by period of month, quarter //
	// and year.
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
	var gvPeriod = $.request.parameters.get('period');
	//Get the Currency Type Variable
	var gvCurrencyType = $.request.parameters.get('currencyType');

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.POST) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "POST is not supported, perform a GET to read the Account Type Amounts by Company Code based on Period"
		}));
	}

	// -------------------------------------------------------- // 
	// Function to get the grouped amounts per quarter
	// -------------------------------------------------------- //
	function getEntriesPerQuarter() {
		//Variables
		var lvQuery,
			item,
			lvType,
			lvAmount = 0,
			lvPostingDate = "",
			lvQuarter = "",
			lvQ1BSAmount = 0,
			lvQ1PLAmount = 0,
			lvCompanyCode,
			lvQ1OBSAmount = 0,
			lvQ2BSAmount = 0,
			lvQ2PLAmount = 0,
			lvQ2OBSAmount = 0,
			lvQ3BSAmount = 0,
			lvQ3PLAmount = 0,
			lvQ3OBSAmount = 0,
			lvQ4BSAmount = 0,
			lvQ4PLAmount = 0,
			lvQ4OBSAmount = 0,
			records = [];

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		// SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J2."ITEM_TEXT", J2."ITEM_NO"
		// from "CDL_SCH_LOGGING"."CDL_GL_HEADER" as J1
		// inner join "CDL_SCH_LOGGING"."CDL_GL_ITEM" as J2
		// on J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT"
		// and J1."FISCAL_YEAR" = J2."FISCAL_YEAR"
		// and J1."COMPANY_CODE" = J2."COMPANY_CODE"

		lvQuery = 'SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J1."POSTING_DATE", J2."ITEM_TEXT", J2."ITEM_NO"';
		lvQuery = lvQuery + 'FROM "' + gvSchemaName + '"."' + gvHeaderTable + '" as J1 ';
		lvQuery = lvQuery + 'INNER JOIN "' + gvSchemaName + '"."' + gvItemTable + '" as J2 ';
		lvQuery = lvQuery + 'ON J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT" ';
		lvQuery = lvQuery + 'AND J1."FISCAL_YEAR" = J2."FISCAL_YEAR" ';
		lvQuery = lvQuery + 'AND J1."COMPANY_CODE" = J2."COMPANY_CODE" ';

		//Order by Company Code
		lvQuery = lvQuery + 'ORDER BY "COMPANY_CODE"';

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {

			lvPostingDate = rs.getString(4);
			lvAmount = getValues(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(6));
			lvType = getType(rs.getString(5));

			if (rs.getString(3) != lvCompanyCode && lvCompanyCode) {
				//Quarter 1
				item = {
					"QUARTER": "Q1",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvQ1PLAmount,
					"BALANCE_SHEET": lvQ1BSAmount,
					"OFF_BALANCE_SHEET": lvQ1OBSAmount
				};

				records.push(item);

				//Quarter 2
				item = {
					"QUARTER": "Q2",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvQ2PLAmount,
					"BALANCE_SHEET": lvQ2BSAmount,
					"OFF_BALANCE_SHEET": lvQ2OBSAmount
				};

				records.push(item);

				//Quarter 3
				item = {
					"QUARTER": "Q3",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvQ3PLAmount,
					"BALANCE_SHEET": lvQ3BSAmount,
					"OFF_BALANCE_SHEET": lvQ3OBSAmount
				};

				records.push(item);

				//Quarter 4					
				item = {
					"QUARTER": "Q4",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvQ4PLAmount,
					"BALANCE_SHEET": lvQ4BSAmount,
					"OFF_BALANCE_SHEET": lvQ4OBSAmount
				};

				records.push(item);

				//Initialize Variables
				lvQ1PLAmount = 0;
				lvQ1BSAmount = 0;
				lvQ1OBSAmount = 0;
				lvQ2PLAmount = 0;
				lvQ2BSAmount = 0;
				lvQ2OBSAmount = 0;
				lvQ3PLAmount = 0;
				lvQ3BSAmount = 0;
				lvQ3OBSAmount = 0;
				lvQ4PLAmount = 0;
				lvQ4BSAmount = 0;
				lvQ4OBSAmount = 0;
				lvCompanyCode = rs.getString(3);
				lvQuarter = 0;
				lvAmount = parseFloat(lvAmount);

			} else {
				lvCompanyCode = rs.getString(3);
				lvAmount = parseFloat(lvAmount);

				//Determine Quarter
				if (lvPostingDate) {
					var lvMonth = parseInt(lvPostingDate.substring(4, 6));
					if (lvMonth < 4) {
						lvQuarter = 1;
					} else if (lvMonth < 7) {
						lvQuarter = 2;
					} else if (lvMonth) {
						lvQuarter = 3;
					} else if (lvMonth < 13) {
						lvQuarter = 4;
					}
				}

				if (lvQuarter === 1) {
					if (lvType === "Profit_Loss") {
						lvQ1PLAmount = parseFloat(lvQ1PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvQ1BSAmount = parseFloat(lvQ1BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvQ1OBSAmount = parseFloat(lvQ1OBSAmount) + lvAmount;
					}
				} else if (lvQuarter === 2) {
					if (lvType === "Profit_Loss") {
						lvQ2PLAmount = parseFloat(lvQ2PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvQ2BSAmount = parseFloat(lvQ2BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvQ2OBSAmount = parseFloat(lvQ2OBSAmount) + lvAmount;
					}
				} else if (lvQuarter === 3) {
					if (lvType === "Profit_Loss") {
						lvQ3PLAmount = parseFloat(lvQ3PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvQ3BSAmount = parseFloat(lvQ3BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvQ3OBSAmount = parseFloat(lvQ3OBSAmount) + lvAmount;
					}
				} else if (lvQuarter === 4) {
					if (lvType === "Profit_Loss") {
						lvQ4PLAmount = parseFloat(lvQ4PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvQ4BSAmount = parseFloat(lvQ4BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvQ4OBSAmount = parseFloat(lvQ4OBSAmount) + lvAmount;
					}
				}
			}
		}

		//Quarter 1
		item = {
			"QUARTER": "Q1",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvQ1PLAmount,
			"BALANCE_SHEET": lvQ1BSAmount,
			"OFF_BALANCE_SHEET": lvQ1OBSAmount
		};

		records.push(item);

		//Quarter 2
		item = {
			"QUARTER": "Q2",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvQ2PLAmount,
			"BALANCE_SHEET": lvQ2BSAmount,
			"OFF_BALANCE_SHEET": lvQ2OBSAmount
		};

		records.push(item);

		//Quarter 3
		item = {
			"QUARTER": "Q3",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvQ3PLAmount,
			"BALANCE_SHEET": lvQ3BSAmount,
			"OFF_BALANCE_SHEET": lvQ3OBSAmount
		};

		records.push(item);

		//Quarter 4					
		item = {
			"QUARTER": "Q4",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvQ4PLAmount,
			"BALANCE_SHEET": lvQ4BSAmount,
			"OFF_BALANCE_SHEET": lvQ4OBSAmount
		};

		records.push(item);

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		//Return the Records
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
	// Function to get the grouped amounts per Month
	// -------------------------------------------------------- //
	function getEntriesPerMonth() {
		//Variables
		var lvQuery, item, lvType, lvAmount = 0,
			lvPostingDate = "",
			lvQuarter = "",
			lvM1BSAmount = 0,
			lvM1PLAmount = 0,
			lvCompanyCode, lvM1OBSAmount = 0,
			lvM2BSAmount = 0,
			lvM2PLAmount = 0,
			lvM2OBSAmount = 0,
			lvM3BSAmount = 0,
			lvM3PLAmount = 0,
			lvM3OBSAmount = 0,
			lvM4BSAmount = 0,
			lvM4PLAmount = 0,
			lvM4OBSAmount = 0,
			records = [],
			lvM5BSAmount = 0,
			lvM5PLAmount = 0,
			lvM5OBSAmount = 0,
			lvM5BSAmount = 0,
			lvM5PLAmount = 0,
			lvM5OBSAmount = 0,
			lvM6BSAmount = 0,
			lvM6PLAmount = 0,
			lvM6OBSAmount = 0,
			lvM7BSAmount = 0,
			lvM7PLAmount = 0,
			lvM7OBSAmount = 0,
			lvM8BSAmount = 0,
			lvM8PLAmount = 0,
			lvM8OBSAmount = 0,
			lvM9BSAmount = 0,
			lvM9PLAmount = 0,
			lvM9OBSAmount = 0,
			lvM10BSAmount = 0,
			lvM10PLAmount = 0,
			lvM10OBSAmount = 0,
			lvM11BSAmount = 0,
			lvM11PLAmount = 0,
			lvM11OBSAmount = 0,
			lvM12BSAmount = 0,
			lvM12PLAmount = 0,
			lvM12OBSAmount = 0;

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		// SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J2."ITEM_TEXT", J2."ITEM_NO"
		// from "CDL_SCH_LOGGING"."CDL_GL_HEADER" as J1
		// inner join "CDL_SCH_LOGGING"."CDL_GL_ITEM" as J2
		// on J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT"
		// and J1."FISCAL_YEAR" = J2."FISCAL_YEAR"
		// and J1."COMPANY_CODE" = J2."COMPANY_CODE"

		lvQuery = 'SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J1."POSTING_DATE", J2."ITEM_TEXT", J2."ITEM_NO"';
		lvQuery = lvQuery + 'FROM "' + gvSchemaName + '"."' + gvHeaderTable + '" as J1 ';
		lvQuery = lvQuery + 'INNER JOIN "' + gvSchemaName + '"."' + gvItemTable + '" as J2 ';
		lvQuery = lvQuery + 'ON J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT" ';
		lvQuery = lvQuery + 'AND J1."FISCAL_YEAR" = J2."FISCAL_YEAR" ';
		lvQuery = lvQuery + 'AND J1."COMPANY_CODE" = J2."COMPANY_CODE" ';

		//Order by Company Code
		lvQuery = lvQuery + 'ORDER BY "COMPANY_CODE"';

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {

			lvPostingDate = rs.getString(4);
			lvAmount = getValues(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(6));
			lvType = getType(rs.getString(5));

			if (rs.getString(3) != lvCompanyCode && lvCompanyCode) {
				//Month 1
				item = {
					"MONTH": "January",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM1PLAmount,
					"BALANCE_SHEET": lvM1BSAmount,
					"OFF_BALANCE_SHEET": lvM1OBSAmount
				};

				records.push(item);

				//Month 2
				item = {
					"MONTH": "February",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM2PLAmount,
					"BALANCE_SHEET": lvM2BSAmount,
					"OFF_BALANCE_SHEET": lvM2OBSAmount
				};

				records.push(item);

				//Month 3
				item = {
					"MONTH": "March",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM3PLAmount,
					"BALANCE_SHEET": lvM3BSAmount,
					"OFF_BALANCE_SHEET": lvM3OBSAmount
				};

				records.push(item);

				//Month 4
				item = {
					"MONTH": "April",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM4PLAmount,
					"BALANCE_SHEET": lvM4BSAmount,
					"OFF_BALANCE_SHEET": lvM4OBSAmount
				};

				records.push(item);

				//Month 5
				item = {
					"MONTH": "May",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM5PLAmount,
					"BALANCE_SHEET": lvM5BSAmount,
					"OFF_BALANCE_SHEET": lvM5OBSAmount
				};

				records.push(item);

				//Month 6
				item = {
					"MONTH": "June",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM6PLAmount,
					"BALANCE_SHEET": lvM6BSAmount,
					"OFF_BALANCE_SHEET": lvM6OBSAmount
				};

				records.push(item);

				//Month 7
				item = {
					"MONTH": "July",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM7PLAmount,
					"BALANCE_SHEET": lvM7BSAmount,
					"OFF_BALANCE_SHEET": lvM7OBSAmount
				};

				records.push(item);

				//Month 8
				item = {
					"MONTH": "August",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM8PLAmount,
					"BALANCE_SHEET": lvM8BSAmount,
					"OFF_BALANCE_SHEET": lvM8OBSAmount
				};

				records.push(item);

				//Month 9
				item = {
					"MONTH": "September",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM9PLAmount,
					"BALANCE_SHEET": lvM9BSAmount,
					"OFF_BALANCE_SHEET": lvM9OBSAmount
				};

				records.push(item);

				//Month 10
				item = {
					"MONTH": "October",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM10PLAmount,
					"BALANCE_SHEET": lvM10BSAmount,
					"OFF_BALANCE_SHEET": lvM10OBSAmount
				};

				records.push(item);

				//Month 11
				item = {
					"MONTH": "November",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM11PLAmount,
					"BALANCE_SHEET": lvM11BSAmount,
					"OFF_BALANCE_SHEET": lvM11OBSAmount
				};

				records.push(item);

				//Month 12
				item = {
					"MONTH": "December",
					"COMPANY_CODE": lvCompanyCode,
					"PROFIT_LOSS": lvM12PLAmount,
					"BALANCE_SHEET": lvM12BSAmount,
					"OFF_BALANCE_SHEET": lvM12OBSAmount
				};

				records.push(item);

				//Initialize Variables
				lvM1PLAmount = 0;
				lvM1BSAmount = 0;
				lvM1OBSAmount = 0;
				lvM2PLAmount = 0;
				lvM2BSAmount = 0;
				lvM2OBSAmount = 0;
				lvM3PLAmount = 0;
				lvM3BSAmount = 0;
				lvM3OBSAmount = 0;
				lvM4PLAmount = 0;
				lvM4BSAmount = 0;
				lvM4OBSAmount = 0;
				lvM5PLAmount = 0;
				lvM5BSAmount = 0;
				lvM5OBSAmount = 0;
				lvM6PLAmount = 0;
				lvM6BSAmount = 0;
				lvM6OBSAmount = 0;
				lvM7PLAmount = 0;
				lvM7BSAmount = 0;
				lvM7OBSAmount = 0;
				lvM8PLAmount = 0;
				lvM8BSAmount = 0;
				lvM8OBSAmount = 0;
				lvM9PLAmount = 0;
				lvM9BSAmount = 0;
				lvM9OBSAmount = 0;
				lvM10PLAmount = 0;
				lvM10BSAmount = 0;
				lvM10OBSAmount = 0;
				lvM11PLAmount = 0;
				lvM11BSAmount = 0;
				lvM11OBSAmount = 0;
				lvM12PLAmount = 0;
				lvM12BSAmount = 0;
				lvM12OBSAmount = 0;
				lvCompanyCode = rs.getString(3);
				lvMonth = 0;
				lvAmount = parseFloat(lvAmount);

			} else {
				lvCompanyCode = rs.getString(3);
				lvAmount = parseFloat(lvAmount);

				//Determine Quarter
				if (lvPostingDate) {
					var lvMonth = parseInt(lvPostingDate.substring(4, 6));
				}

				if (lvMonth === 1) {
					if (lvType === "Profit_Loss") {
						lvM1PLAmount = parseFloat(lvM1PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM1BSAmount = parseFloat(lvM1BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM1OBSAmount = parseFloat(lvM1OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 2) {
					if (lvType === "Profit_Loss") {
						lvM2PLAmount = parseFloat(lvM2PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM2BSAmount = parseFloat(lvM2BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM2OBSAmount = parseFloat(lvM2OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 3) {
					if (lvType === "Profit_Loss") {
						lvM3PLAmount = parseFloat(lvM3PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM3BSAmount = parseFloat(lvM3BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM3OBSAmount = parseFloat(lvM3OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 4) {
					if (lvType === "Profit_Loss") {
						lvM4PLAmount = parseFloat(lvM4PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM4BSAmount = parseFloat(lvM4BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM4OBSAmount = parseFloat(lvM4OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 5) {
					if (lvType === "Profit_Loss") {
						lvM5PLAmount = parseFloat(lvM5PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM5BSAmount = parseFloat(lvM5BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM5OBSAmount = parseFloat(lvM5OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 6) {
					if (lvType === "Profit_Loss") {
						lvM6PLAmount = parseFloat(lvM6PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM6BSAmount = parseFloat(lvM6BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM6OBSAmount = parseFloat(lvM6OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 7) {
					if (lvType === "Profit_Loss") {
						lvM7PLAmount = parseFloat(lvM7PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM7BSAmount = parseFloat(lvM7BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM7OBSAmount = parseFloat(lvM7OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 8) {
					if (lvType === "Profit_Loss") {
						lvM8PLAmount = parseFloat(lvM8PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM8BSAmount = parseFloat(lvM8BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM8OBSAmount = parseFloat(lvM8OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 9) {
					if (lvType === "Profit_Loss") {
						lvM9PLAmount = parseFloat(lvM9PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM9BSAmount = parseFloat(lvM9BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM9OBSAmount = parseFloat(lvM9OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 10) {
					if (lvType === "Profit_Loss") {
						lvM10PLAmount = parseFloat(lvM10PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM10BSAmount = parseFloat(lvM10BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM10OBSAmount = parseFloat(lvM10OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 11) {
					if (lvType === "Profit_Loss") {
						lvM11PLAmount = parseFloat(lvM11PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM11BSAmount = parseFloat(lvM11BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM11OBSAmount = parseFloat(lvM11OBSAmount) + lvAmount;
					}
				} else if (lvMonth === 12) {
					if (lvType === "Profit_Loss") {
						lvM12PLAmount = parseFloat(lvM12PLAmount) + lvAmount;
					} else if (lvType === "Balance_Sheet") {
						lvM12BSAmount = parseFloat(lvM12BSAmount) + lvAmount;
					} else if (lvType === "Off_Balance_Sheet") {
						lvM12OBSAmount = parseFloat(lvM12OBSAmount) + lvAmount;
					}
				}
			}
		}

		//Month 1
		item = {
			"MONTH": "January",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM1PLAmount,
			"BALANCE_SHEET": lvM1BSAmount,
			"OFF_BALANCE_SHEET": lvM1OBSAmount
		};

		records.push(item);

		//Month 2
		item = {
			"MONTH": "February",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM2PLAmount,
			"BALANCE_SHEET": lvM2BSAmount,
			"OFF_BALANCE_SHEET": lvM2OBSAmount
		};

		records.push(item);

		//Month 3
		item = {
			"MONTH": "March",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM3PLAmount,
			"BALANCE_SHEET": lvM3BSAmount,
			"OFF_BALANCE_SHEET": lvM3OBSAmount
		};

		records.push(item);

		//Month 4
		item = {
			"MONTH": "April",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM4PLAmount,
			"BALANCE_SHEET": lvM4BSAmount,
			"OFF_BALANCE_SHEET": lvM4OBSAmount
		};

		records.push(item);

		//Month 5
		item = {
			"MONTH": "May",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM5PLAmount,
			"BALANCE_SHEET": lvM5BSAmount,
			"OFF_BALANCE_SHEET": lvM5OBSAmount
		};

		records.push(item);

		//Month 6
		item = {
			"MONTH": "June",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM6PLAmount,
			"BALANCE_SHEET": lvM6BSAmount,
			"OFF_BALANCE_SHEET": lvM6OBSAmount
		};

		records.push(item);

		//Month 7
		item = {
			"MONTH": "July",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM7PLAmount,
			"BALANCE_SHEET": lvM7BSAmount,
			"OFF_BALANCE_SHEET": lvM7OBSAmount
		};

		records.push(item);

		//Month 8
		item = {
			"MONTH": "August",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM8PLAmount,
			"BALANCE_SHEET": lvM8BSAmount,
			"OFF_BALANCE_SHEET": lvM8OBSAmount
		};

		records.push(item);

		//Month 9
		item = {
			"MONTH": "September",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM9PLAmount,
			"BALANCE_SHEET": lvM9BSAmount,
			"OFF_BALANCE_SHEET": lvM9OBSAmount
		};

		records.push(item);

		//Month 10
		item = {
			"MONTH": "October",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM10PLAmount,
			"BALANCE_SHEET": lvM10BSAmount,
			"OFF_BALANCE_SHEET": lvM10OBSAmount
		};

		records.push(item);

		//Month 11
		item = {
			"MONTH": "November",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM11PLAmount,
			"BALANCE_SHEET": lvM11BSAmount,
			"OFF_BALANCE_SHEET": lvM11OBSAmount
		};

		records.push(item);

		//Month 12
		item = {
			"MONTH": "December",
			"COMPANY_CODE": lvCompanyCode,
			"PROFIT_LOSS": lvM12PLAmount,
			"BALANCE_SHEET": lvM12BSAmount,
			"OFF_BALANCE_SHEET": lvM12OBSAmount
		};

		records.push(item);

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		return records;
	}

	// -------------------------------------------------------- // 
	// Function to get the grouped amounts per quarter
	// -------------------------------------------------------- //
	function getEntriesPerYear() {
		//Variables
		var lvQuery,
			item,
			lvType,
			lvAmount = 0,
			lvPostingDate = "",
			lvYear = "",
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

		lvQuery = 'SELECT J1."SAP_DOCUMENT", J1."FISCAL_YEAR", J1."COMPANY_CODE", J1."POSTING_DATE", J2."ITEM_TEXT", J2."ITEM_NO"';
		lvQuery = lvQuery + 'FROM "' + gvSchemaName + '"."' + gvHeaderTable + '" as J1 ';
		lvQuery = lvQuery + 'INNER JOIN "' + gvSchemaName + '"."' + gvItemTable + '" as J2 ';
		lvQuery = lvQuery + 'ON J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT" ';
		lvQuery = lvQuery + 'AND J1."FISCAL_YEAR" = J2."FISCAL_YEAR" ';
		lvQuery = lvQuery + 'AND J1."COMPANY_CODE" = J2."COMPANY_CODE" ';

		//Order by Company Code
		lvQuery = lvQuery + 'ORDER BY J1."COMPANY_CODE", J1."POSTING_DATE"';

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {

			lvPostingDate = rs.getString(4);
			lvAmount = getValues(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(6));
			lvType = getType(rs.getString(5));

			if ((rs.getString(3) != lvCompanyCode && lvCompanyCode) ||
				(lvPostingDate.substring(0, 4) != lvYear && lvYear)) {

				item = {
					"YEAR": lvYear,
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
				lvYear = lvPostingDate.substring(0, 4);
				lvAmount = parseFloat(lvAmount);

			} else {
				lvCompanyCode = rs.getString(3);
				lvAmount = parseFloat(lvAmount);
				lvYear = lvPostingDate.substring(0, 4);

				if (lvType === "Profit_Loss") {
					lvPLAmount = parseFloat(lvPLAmount) + lvAmount;
				} else if (lvType === "Balance_Sheet") {
					lvBSAmount = parseFloat(lvBSAmount) + lvAmount;
				} else if (lvType === "Off_Balance_Sheet") {
					lvOBSAmount = parseFloat(lvOBSAmount) + lvAmount;
				}
			}
		}

		item = {
			"YEAR": lvYear,
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
	// Main function to get the Statisctic Values               //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method === $.net.http.POST) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "POST is not supported, perform a GET to read the Account Type Amounts by Company Code based on Period"
			}));
		} else {
			try {
				//Calculate Values based on the Period Type 
				if (gvPeriod === "QUARTER") {
					var records = getEntriesPerQuarter();
				} else if (gvPeriod === "MONTH") {
					var records = getEntriesPerMonth();
				} else if (gvPeriod === "YEAR") {
					var records = getEntriesPerYear();
				}

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