(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-06-15                                         //
	// Description: REST service to be able to create entries   //
	// in the Integration Logging Tables.POST method is allowed //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service.                                     //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate;
	//Variable to carry the conversion errors
	var gvConvError;
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvTableName = 'CDL_PULSE_LOG_MASTER';
	var gvHeaderTable = 'CDL_GL_HEADER';
	var gvItemTable = 'CDL_GL_ITEM';
	var gvCurrencyTable = 'CDL_GL_CURRENCY';
	var gvForecastMaster = 'CDL_GL_FORECAST_MASTER';

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "GET is not supported, perform a POST to add Logging Entries"
		}));
	}
	// ----------------------------------------------------------------// 
	// Function to insert entries into the table for integration event //
	// ----------------------------------------------------------------//
	function _createLogEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());
			var requestPayload = oBody.PAYLOAD_REQUEST;
			var responsePayload = oBody.PAYLOAD_RESPONSE;
			var statusCode,
				statusMessage;

			requestPayload = requestPayload.replace("\\", "");
			if (requestPayload) {
				try {
					var request = JSON.parse(requestPayload);
				} catch (convError) {
					gvConvError = convError.message;
				}
			}
			responsePayload = responsePayload.replace("\\", "");
			responsePayload = responsePayload.replace("\n", "");
			if (responsePayload) {
				try {
					var response = JSON.parse(responsePayload);
				} catch (convError) {
					gvConvError += convError.message;
				}
			}

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//Message GUID
			oStatement.setString(1, oBody.MESSAGE_GUID);
			//Start Time
			oStatement.setString(2, oBody.START_TIME);
			//End Time
			oStatement.setString(3, oBody.END_TIME);
			//Status
			oStatement.setString(4, oBody.STATUS);
			//Payload Request
			oStatement.setString(5, oBody.PAYLOAD_REQUEST);
			//Payload Response
			//var response = JSON.stringify(body.PAYLOAD_RESPONSE);
			oStatement.setString(6, oBody.PAYLOAD_RESPONSE);
			//Object Key
			oStatement.setString(7, oBody.OBJECT_KEY);
			//Method
			oStatement.setString(8, oBody.METHOD);
			//Direction
			oStatement.setString(9, oBody.DIRECTION);
			//Source System ID
			oStatement.setString(10, oBody.SOURCE_SYS_ID);
			//Source System Area
			oStatement.setString(11, oBody.SOURCE_SYS_AREA);
			//Target System ID
			oStatement.setString(12, oBody.TARGET_SYS_ID);
			//Target System Area
			oStatement.setString(13, oBody.TARGET_SYS_AREA);
			//Interface
			oStatement.setString(14, oBody.INTERFACE);
			//Status Code
			if (response) {
				if (response.StatusCode) {
					oStatement.setString(15, response.StatusCode);
					//Status Message
					oStatement.setString(16, response.StatusMessage);
				} else {
					statusCode = "CDL-E002";
					statusMessage = "Communication Error from CDL to SAP";
					oStatement.setString(15, statusCode);
					oStatement.setString(16, statusMessage);
				}
			} else {
				statusCode = "CDL-E002";
				statusMessage = "Communication Error from CDL to SAP, Investigate using CDLIntegrationMessageId on Covarius Data Lake Pulse :";
				oStatement.setString(15, statusCode);
				oStatement.setString(16, statusMessage);
			}

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully in logging table;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem inserting entries into the logging table, Error: " + errorObj.message;
		}
	}
	// ------------------------------------------------------------- // 
	// Function to delete entries in logging table older than 30 days//
	// ------------------------------------------------------------- //
	function _deleteHistoricEntries() {

		try {
			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Get date 90 days back
			var lvDate = new Date();
			lvDate.setDate(lvDate.getDate() - 90);
			var lvDateString = lvDate.toISOString().split('T')[0];

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\" WHERE START_TIME <= ?");

			//Start Time
			oStatement.setString(1, lvDateString);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate += "Table entries deleted for historic entries older than 90 days;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate += ",There was a problem deleting entries in the logging table, Error: " + errorObj.message;
		}
	}

	// 	------------------------------------------------------------- // 
	// 	Function to read the payloads and create entries in tables    //
	// 	------------------------------------------------------------- //
	function _savePayloadFields() {
		try {

			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());
			var requestPayload = oBody.PAYLOAD_REQUEST;
			var responsePayload = oBody.PAYLOAD_RESPONSE;

			requestPayload = requestPayload.replace("\\", "");
			if (requestPayload) {
				try {
					var request = JSON.parse(requestPayload);
				} catch (convError) {
					gvConvError += convError.message;
				}
			}
			responsePayload = responsePayload.replace("\\", "");
			responsePayload = responsePayload.replace("\n", "");
			if (responsePayload) {
				try {
					var response = JSON.parse(responsePayload);
				} catch (convError) {
					gvConvError += convError.message;
				}
			}

			if (request && response) {
				//Insert Entries into GL_HEADER Table
				_InsertHeaderEntry(request, response);

				//Insert Entries into GL_ITEM Table
				_InsertItemEntry(request, response);

				//Insert Entries into GL_Currency Table
				_InsertCurrencyEntry(request, response);

				//Insert Entries into Forecast Master Table
				_InsertForecastEntry(request, response);
			}
		} catch (errorObj) {
			gvTableUpdate = "Error saving Payload field level entries:" + errorObj.message;
		}
	}

	// 	------------------------------------------------------------- // 
	// 	Function to create a GL Header Table entry                    //
	// 	------------------------------------------------------------- //
	function _InsertHeaderEntry(req_json, resp_json) {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			if (oBody.MESSAGE_GUID && resp_json.DocumentNumber) {
				//Get the Database connection
				var oConnection = $.db.getConnection();

				//Build the Statement to insert the entries
				var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvHeaderTable +
					'" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

				//Populate the fields with values from the incoming payload
				//SAP Document
				oStatement.setString(1, resp_json.DocumentNumber);
				//Fiscal Year
				if (req_json.FiscalYear) {
					oStatement.setString(2, req_json.FiscalYear);
				} else {
					oStatement.setString(2, resp_json.FiscalYear);
				}
				//Company Code
				if (req_json.CompanyCode) {
					oStatement.setString(3, req_json.CompanyCode);
				} else {
					oStatement.setString(3, resp_json.CompanyCode);
				}
				//Message GUID
				oStatement.setString(4, oBody.MESSAGE_GUID);
				//Reference Key
				oStatement.setString(5, req_json.ObjectKey);
				//Business Transaction
				oStatement.setString(6, req_json.BusinessTransaction);
				//HeaderText
				oStatement.setString(7, req_json.HeaderText);
				//Document Date
				oStatement.setString(8, req_json.DocumentDate);
				//Posting Date
				oStatement.setString(9, req_json.PostingDate);
				//Translation Date
				oStatement.setString(10, req_json.TranslationDate);
				//Fiscal Period
				oStatement.setString(11, req_json.FiscalPeriod);
				//Document Type
				oStatement.setString(12, req_json.DocumentType);
				//Reference Document
				oStatement.setString(13, req_json.ReferenceDocNo);
				//Reference Document Number Long
				oStatement.setString(14, req_json.ReferenceDocNoLong);
				//Accounting Principle
				oStatement.setString(15, req_json.AccountingPrinciple);
				//Billing Category
				oStatement.setString(16, req_json.BillingCategory);
				//Status Code
				oStatement.setString(17, resp_json.StatusCode);
				//Status Message
				oStatement.setString(18, resp_json.StatusMessage);
				//Document Status
				oStatement.setString(19, resp_json.DocumentStatus);
				//Document Status Description
				oStatement.setString(20, resp_json.DocumentStatusDescription);
				//Post Indicator
				if (req_json.PostIndicator) {
					oStatement.setString(21, req_json.PostIndicator.toString());
				} else {
					oStatement.setString(21, "false");
				}
				//Account Type
				oStatement.setString(22, req_json.AccountType);
				//Entry Date
				var lvDate = new Date();
				var lvDateString = lvDate.toISOString().substring(0, 10);
				oStatement.setString(23, lvDateString);
				//Update GUID
				oStatement.setString(24, oBody.MESSAGE_GUID);

				//Add Batch process to executed on the database
				oStatement.addBatch();

				//Execute the Insert
				oStatement.executeBatch();

				//Close the connection
				oStatement.close();
				oConnection.commit();
				oConnection.close();

				gvTableUpdate += ",Table entry created for CDL_GL_HEADER";

			} else {
				gvTableUpdate += ",Table entry not created for CDL_GL_HEADER, key values missing";
			}

		} catch (errorObj) {
			gvTableUpdate += ",Error saving Payload Header field level entries:" + errorObj.message;
		}
	}
	// 	------------------------------------------------------------- // 
	// 	Function to create a GL Item Table entry                      //
	// 	------------------------------------------------------------- //
	function _InsertItemEntry(req_json, resp_json) {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvItemTable +
				'" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

			//Item Number Initialization
			var item = 0;

			//Prepare the Batch Statement
			oStatement.setBatchSize(req_json.ToItem.length);

			//Populate the fields with values from the incoming payload
			for (var i = 0; i < req_json.ToItem.length; i++) {
				//SAP Document
				oStatement.setString(1, resp_json.DocumentNumber);

				//Fiscal Year
				if (req_json.FiscalYear) {
					oStatement.setString(2, req_json.FiscalYear);
				} else {
					oStatement.setString(2, resp_json.FiscalYear);
				}
				//Company Code
				if (req_json.CompanyCode) {
					oStatement.setString(3, req_json.CompanyCode);
				} else {
					oStatement.setString(3, resp_json.CompanyCode);
				}

				//Item
				if (!req_json.ToItem[i].ItemNumber) {
					item = item + 1;
					var itemNumber = padToThree(item);
					oStatement.setString(4, itemNumber);
				} else {
					oStatement.setString(4, req_json.ToItem[i].ItemNumber);
				}

				//GL Account
				oStatement.setString(5, req_json.ToItem[i].GLAccount);
				//Value Date
				oStatement.setString(6, req_json.ToItem[i].ValueDate);
				//Posting Date
				oStatement.setString(7, req_json.ToItem[i].PostingDate);
				//Item Text
				oStatement.setString(8, req_json.ToItem[i].ItemText);
				//Ref Key 1
				oStatement.setString(9, req_json.ToItem[i].RefKey1);
				//Ref Key 2
				oStatement.setString(10, req_json.ToItem[i].RefKey2);
				//Ref Key 3
				oStatement.setString(11, req_json.ToItem[i].RefKey3);
				//Account Type
				oStatement.setString(12, req_json.ToItem[i].AccountType);
				//Document Type
				oStatement.setString(13, req_json.ToItem[i].DocumentType);
				//Fiscal Period
				oStatement.setString(14, req_json.ToItem[i].FiscalPeriod);
				//Profit Center
				oStatement.setString(15, req_json.ToItem[i].ProfitCenter);
				//Assignment Number
				oStatement.setString(16, req_json.ToItem[i].AssignmentNumber);
				//Trading Partner
				oStatement.setString(17, req_json.ToItem[i].TradingPartner);
				//Customer
				oStatement.setString(18, req_json.ToItem[i].Customer);
				//Vendor
				oStatement.setString(19, req_json.ToItem[i].VendorNo);
				//Entry Date
				var lvDate = new Date();
				var lvDateString = lvDate.toISOString().substring(0, 10);
				oStatement.setString(20, lvDateString);

				//Add Batch process to executed on the database
				oStatement.addBatch();
			}

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate += ",Table entries created for CDL_GL_ITEM";

		} catch (errorObj) {
			gvTableUpdate += ",Error saving Payload Item field level entries:" + errorObj.message;
		}
	}

	// 	------------------------------------------------------------- // 
	// 	Function to create a GL Currency Table enties                 //
	// 	------------------------------------------------------------- //
	function _InsertCurrencyEntry(req_json, resp_json) {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvCurrencyTable +
				'" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

			//Item Number Initialization
			var item = 0;

			//Prepare the Batch Statement
			oStatement.setBatchSize(req_json.ToCurrency.length);

			//Populate the fields with values from the incoming payload
			for (var i = 0; i < req_json.ToCurrency.length; i++) {
				//SAP Document
				oStatement.setString(1, resp_json.DocumentNumber);

				//Fiscal Year
				if (req_json.FiscalYear) {
					oStatement.setString(2, req_json.FiscalYear);
				} else {
					oStatement.setString(2, resp_json.FiscalYear);
				}
				//Company Code
				if (req_json.CompanyCode) {
					oStatement.setString(3, req_json.CompanyCode);
				} else {
					oStatement.setString(3, resp_json.CompanyCode);
				}

				//Item
				if (!req_json.ToCurrency[i].ItemNumber) {
					item = item + 1;
					var itemNumber = padToThree(item);
					oStatement.setString(4, itemNumber);
				} else {
					oStatement.setString(4, req_json.ToCurrency[i].ItemNumber);
				}

				//Currency Type
				oStatement.setString(5, req_json.ToCurrency[i].CurrencyType);
				//Currency
				oStatement.setString(6, req_json.ToCurrency[i].CurrencyKey);
				//Currency ISO
				oStatement.setString(7, req_json.ToCurrency[i].CurrencyIso);
				//Amount
				oStatement.setString(8, req_json.ToCurrency[i].Amount);
				//Exchange Rate
				oStatement.setString(9, req_json.ToCurrency[i].ExchangeRate);
				//Indirect Exchange Rate
				oStatement.setString(10, req_json.ToCurrency[i].IndirectExchangeRate);
				//Amount Base
				oStatement.setString(11, req_json.ToCurrency[i].AmountBase);
				//Discount Base
				oStatement.setString(12, req_json.ToCurrency[i].DiscountBase);
				//Discount Amount
				oStatement.setString(13, req_json.ToCurrency[i].DiscountAmt);
				//Tax Amount
				oStatement.setString(14, req_json.ToCurrency[i].TaxAmount);
				//Entry Date
				var lvDate = new Date();
				var lvDateString = lvDate.toISOString().substring(0, 10);
				oStatement.setString(15, lvDateString);

				//Add Batch process to executed on the database
				oStatement.addBatch();
			}

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate += ",Table entries created for CDL_GL_CURRENCY";

		} catch (errorObj) {
			gvTableUpdate += ",Error saving Payload Currency field level entries:" + errorObj.message;
		}
	}

	// 	------------------------------------------------------------- // 
	// 	Function to create Forecast Master Table enties               //
	// 	------------------------------------------------------------- //
	function _InsertForecastEntry(req_json, resp_json) {
		var lvDate,
			lvCounter = 0;

		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvForecastMaster +
				'" VALUES (?, ?, ?, ?, ?, ?)');

			//Item Number Initialization
			var item = 0;

			//Populate the fields with values from the incoming payload
			for (var i = 0; i < req_json.ToCurrency.length; i++) {
				if (req_json.ToCurrency[i].Amount > 0) {
					lvCounter = parseInt(lvCounter) + 1;
					//SAP Document
					oStatement.setString(1, resp_json.DocumentNumber);

					//Fiscal Year
					if (req_json.FiscalYear) {
						oStatement.setString(2, req_json.FiscalYear);
					} else {
						oStatement.setString(2, resp_json.FiscalYear);
					}
					//Company Code
					if (req_json.CompanyCode) {
						oStatement.setString(3, req_json.CompanyCode);
					} else {
						oStatement.setString(3, resp_json.CompanyCode);
					}

					//Item
					if (!req_json.ToCurrency[i].ItemNumber) {
						item = item + 1;
						var itemNumber = padToThree(item);
						oStatement.setString(4, itemNumber);
					} else {
						oStatement.setString(4, req_json.ToCurrency[i].ItemNumber);
					}

					//Posting Date
					lvDate = "";
					lvDate = req_json.PostingDate.substring(0, 4) + "-" + req_json.PostingDate.substring(4, 6) + "-" + req_json.PostingDate.substring(6,
						8);
					oStatement.setString(5, lvDate);

					//Amount
					oStatement.setString(6, req_json.ToCurrency[i].Amount);

					//Add Batch process to executed on the database
					oStatement.addBatch();
				}
			}

			//Prepare the Batch Statement
			oStatement.setBatchSize(lvCounter);

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate += ",Table entries created for CDL_GL_FORECAST_MASTER";

		} catch (errorObj) {
			gvTableUpdate += ",Error saving GL Forecast Master entries:" + errorObj.message;
		}
	}

	// -------------------------------------------------------- // 
	// Function to Pad Item Number                             //
	// -------------------------------------------------------- //	
	function padToThree(number) {
		if (number <= 999) {
			number = ("00" + number).slice(-3);
		}
		return number;
	}

	// ------------------------------------------------------------- // 
	// Function to delete entries in GL Header Table older than 90 days//
	// ------------------------------------------------------------- //
	function _deleteHistoricEntriesContentTables(tableName) {
		try {
			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Get date 90 days back
			var lvDate = new Date();
			lvDate.setDate(lvDate.getDate() - 90);
			var lvDateString = lvDate.toISOString().substring(0, 10);

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + tableName + "\" WHERE ENTRY_DATE <= ?");

			//Entry Date
			oStatement.setString(1, lvDateString);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate += "Table entries deleted for historic entries older than 90 days" + tableName + ";";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate += ",There was a problem deleting entries in the " + tableName + " table, Error: " + errorObj.message;
		}
	}
	// -------------------------------------------------------- // 
	// Main function to add entries to the logging table        //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method === $.net.http.GET) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "GET is not supported, perform a POST to add Logging Entries"
			}));
		} else {
			//Perform Table Entry to be created in Logging Table
			try {
				_createLogEntry();
			} catch (errorObj) {
				gvTableUpdate = "Error during table insert:" + errorObj.message;
			}
			//Delete all entries older than 90 days
			try {
				//Logging Table
				_deleteHistoricEntries();
				//Header Table
				_deleteHistoricEntriesContentTables(gvHeaderTable);
				//Item Table
				_deleteHistoricEntriesContentTables(gvItemTable);
				//Currency Table
				_deleteHistoricEntriesContentTables(gvCurrencyTable);
			} catch (errorObj) {
				gvTableUpdate += "Error during deletion of historic entries:" + errorObj.message;
			}
			//Save Payload Fields
			try {
				_savePayloadFields();
			} catch (errorObj) {
				gvTableUpdate += "Error saving Payload level entries:" + errorObj.message;
			}

			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				TableUpdateStatus: gvTableUpdate
			}));
		}
	}

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();