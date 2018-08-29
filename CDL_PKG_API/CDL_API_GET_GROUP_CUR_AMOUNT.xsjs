(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-16                                         //
	// Description: REST service to be able to retrieve the     //
	// Grouping Values for Base Currency and Amount             //
	// with paramter to indicate when Reporting Currency or     //
	// Base Currency is to be used.                             //
	// Parameter: currencyType (BC or RC), and postingDate      //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate;
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvHeaderTable = 'CDL_GL_HEADER';
	var gvCurrencyTable = "CDL_GL_CURRENCY";
	//Variable for Latest Posting Date
	var gvPostingDate = $.request.parameters.get('postingDate');
	//Get the Currency Type Variable
	var gvCurrencyType = $.request.parameters.get('currencyType');

	//Variables for Carrying Statistics totals
	var gvPosted = 0,
		gvParked = 0,
		gvRejected = 0,
		gvRecord = {};

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.POST) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "POST is not supported, perform a GET to read the BaseCurrency/Amount Grouping"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to get the latest posting Date                 //
	// -------------------------------------------------------- //
	function getLatestPostingDate() {
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT MAX(\"POSTING_DATE\") FROM \"" + gvSchemaName + "\".\"" + gvHeaderTable + "\""
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			gvPostingDate = rs.getString(1);
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();
	}

	// -------------------------------------------------------- // 
	// Function to get the list of entries for that Posting Date  //
	// -------------------------------------------------------- //
	function getEntries() {
		var lvCurrency,
			lvQuery,
			lvAmount = 0,
			lvCalc = 0,
			lvCurrencyField;

		//Determine field to use base on currencyType
		if (gvCurrencyType) {
			if (gvCurrencyType == "BC") {
				lvCurrencyField = "CURRENCY_ISO";
			} else {
				lvCurrencyField = "CURRENCY";
			}
		} else {
			lvCurrencyField = "CURRENCY_ISO";
		}

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		lvQuery = 'SELECT J1."' + lvCurrencyField + '", J1."AMOUNT" FROM "' + gvSchemaName + '"."' + gvCurrencyTable + '" as J1 ';
		lvQuery = lvQuery + 'JOIN "' + gvSchemaName + '"."' + gvHeaderTable + '" as J2 ';
		lvQuery = lvQuery + 'ON J1."SAP_DOCUMENT" = J2."SAP_DOCUMENT" ';
		lvQuery = lvQuery + 'AND J1."FISCAL_YEAR" = J2."FISCAL_YEAR" ';
		lvQuery = lvQuery + 'AND J1."COMPANY_CODE" = J2."COMPANY_CODE" ';
		lvQuery = lvQuery + ' WHERE J2."POSTING_DATE" = ' + "'" + gvPostingDate + "'";
		lvQuery = lvQuery + ' ORDER BY J1."CURRENCY_ISO"';

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();
		var item,
			records = [];

		//Map and Save the results
		while (rs.next()) {
			if (rs.getString(1) != lvCurrency && lvCurrency) {
				item = {
					"CURRENCY": lvCurrency,
					"AMOUNT": lvAmount
				};
				records.push(item);
				//Initialize Variables
				lvAmount = 0;
				lvCurrency = rs.getString(1);
				lvAmount = parseFloat(rs.getString(2));
			} else {
				lvCurrency = rs.getString(1);
				lvCalc = parseFloat(rs.getString(2));
				//				if (lvCalc > 0) {
				lvAmount = parseFloat(lvAmount) + lvCalc;
				//				}
			}
		}
		//Get the Last Item
		item = {
			"CURRENCY": lvCurrency,
			"AMOUNT": lvAmount
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
				result: "POST is not supported, perform a GET to read the BaseCurrency/Amount Grouping"
			}));
		} else {
			try {
				//Get the lates Posting Date if it has not been passed in
				if (!gvPostingDate || gvPostingDate === "") {
					getLatestPostingDate();
				}
				
				//Calculate Statistics
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