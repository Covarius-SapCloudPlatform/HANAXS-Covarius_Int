	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-18                                         //
	// Description: REST service to be able to send out the     //
	// alerts that have been configured                         //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         // 
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate;

	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvMasterTable = 'CDL_GL_MASTER';
	var gvRoutingTable = 'CDL_NOTIFICATION_ROUTING';

	//Path to the Destination used for HCI
	var gvDestPath = "CDL_PKG_LOGGING.CDL_PKG_JOB";
	var gvDestination = "CDL_DESTINATION_HCI_NOTIFICATIONS";
	var gvProcessingCount = 0,
		gvRequestedProcessing = 0,
		gvError;

	//Constants
	var gcSuccess = 'DSUCCESS',
		gcSuccessError = 'DSUCCESSE',
		gcConfirm = 'DCONFIRM',
		gcConfirmError = 'DCONFIRME',
		gcReturn = 'DRETURN',
		gcReturnError = 'DRETURNE',
		gcError = 'DERROR';

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.POST) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "POST is not supported, perform a GET to send out all relevant daily notifications"
		}));
	}

	// -------------------------------------------------------- // 
	// Function to get the Routes maintained in Pulse           //
	// -------------------------------------------------------- //
	function getRoutes() {
		//Get the Connection to the Database
		var oConnection = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var oStatement = oConnection.prepareStatement(
			"SELECT *  from \"" + gvSchemaName + "\".\"" + gvRoutingTable + "\"");

		//Execute the Query
		var lsReturn = oStatement.executeQuery();

		//Map and Save the results
		var oRoutes = [];

		while (lsReturn.next()) {
			var oEntry = {
				COMPANY_CODE: lsReturn.getString(1),
				ODATA_URL: lsReturn.getString(2),
				SYSTEM: lsReturn.getString(3),
				CLIENT: lsReturn.getString(4)
			};
			oRoutes.push(oEntry);
		}

		//Close the DB Connection
		oStatement.close();
		oConnection.close();

		//Return the records
		return oRoutes;
	}

	// -------------------------------------------------------- // 
	// Function to build and send e-mails                       //
	// -------------------------------------------------------- //
	function _countAndSend(oRoutes) {
		//Variables for Notifications
		var lvSent = 0,
			lvAcknowledged = 0,
			lvError = 0,
			lvParked = 0,
			lvPosted = 0;

		//Date
		var lvDate = new Date();
		var lvDateString = lvDate.toISOString().substring(0, 10);

		//Loop at the list of Routes and Perform Counts to Send 
		for (var i = 0; i < oRoutes.length; i++) {
			//Get Sent Count for Date   
			lvSent = parseFloat(_getCount('SENT', oRoutes[i].COMPANY_CODE, lvDateString));
			//Get Acknowledged Count for Date
			lvAcknowledged = _getCount('ACKNOWLEDGED', oRoutes[i].COMPANY_CODE, lvDateString);
			//Get Error Count for Date
			lvError = _getCount('ERROR', oRoutes[i].COMPANY_CODE, lvDateString);
			//Get the Parked Count for Date
			lvParked = _getCount('PARKED', oRoutes[i].COMPANY_CODE, lvDateString);
			//Get the Posted Count for Date
			lvPosted = _getCount('POSTED', oRoutes[i].COMPANY_CODE, lvDateString);

			//Call the Function to call HCI Notification Process
			_determineNotifications(oRoutes[i].ODATA_URL, oRoutes[i].CLIENT, lvSent, lvAcknowledged, lvError, lvParked, lvPosted);
		}
	}

	// -------------------------------------------------------- // 
	// Function to get the Count for Specific Status            //
	// -------------------------------------------------------- //
	function _getCount(pStatus, pCompanyCode, pDate) {
		var lvCount;
		//Get the Connection to the Database
		var oConnection = $.db.getConnection();

		//Build the Query
		var lvQuery = 'SELECT COUNT(*) FROM "' + gvSchemaName + '"."' + gvMasterTable + '"';
		lvQuery = lvQuery + ' WHERE "STATUS" = ' + "'" + pStatus + "'";
		lvQuery = lvQuery + ' AND "DATE" = ' + "'" + pDate + "'";
		lvQuery = lvQuery + ' AND "COMPANY_CODE" = ' + "'" + pCompanyCode + "'";

		//Prepare the SQL Statement to read the entries
		var oStatement = oConnection.prepareStatement(lvQuery);

		//Execute the Query
		var lsReturn = oStatement.executeQuery();

		//Map and Save the results
		while (lsReturn.next()) {
			lvCount = lsReturn.getString(1);
		}

		//Close the DB Connection
		oStatement.close();
		oConnection.close();

		//Return the records
		return lvCount;
	}

	// -------------------------------------------------------- // 
	// Function to determine Notifications and Send            //
	// -------------------------------------------------------- //
	function _determineNotifications(pUrl, pClient, pSent, pAcknowledged, pError, pParked, pPosted) {
		//Variables
		var lvTypeKey;
		var lvBody,
			lvResult;

		//Determine the Keys to send
		if (pSent > 0) {
			//Error Scenario
			// 			if (pError > 0) {

			// 				lvBody = {
			// 					URL: pUrl,
			// 					Client: pClient,
			// 					TypeKey: gcError
			// 				};

			// 				lvResult = _callHciProcess(pUrl, lvBody);

			// 				if (lvResult === "SENT") {
			// 					gvProcessingCount = gvProcessingCount + 1;
			// 					gvRequestedProcessing = gvRequestedProcessing + 1;
			// 				} else {
			// 					gvRequestedProcessing = gvRequestedProcessing + 1;
			// 				}

			// 			}

			//Succesfull Delivery to SAP
			if (pSent > 0 && pAcknowledged === pSent) {
				lvBody = {
					URL: pUrl,
					Client: pClient,
					TypeKey: gcSuccess
				};

				lvResult = _callHciProcess(pUrl, lvBody);

				if (lvResult === "SENT") {
					gvProcessingCount = gvProcessingCount + 1;
					gvRequestedProcessing = gvRequestedProcessing + 1;
				} else {
					gvRequestedProcessing = gvRequestedProcessing + 1;
				}

			} else {
				lvBody = {
					URL: pUrl,
					Client: pClient,
					TypeKey: gcSuccessError
				};

				lvResult = _callHciProcess(pUrl, lvBody);

				if (lvResult === "SENT") {
					gvProcessingCount = gvProcessingCount + 1;
					gvRequestedProcessing = gvRequestedProcessing + 1;
				} else {
					gvRequestedProcessing = gvRequestedProcessing + 1;
				}
			}

			//Successfull Response from SAP
			if (pSent === pAcknowledged) {
				lvBody = {
					URL: pUrl,
					Client: pClient,
					TypeKey: gcConfirm
				};

				lvResult = _callHciProcess(pUrl, lvBody);

				if (lvResult === "SENT") {
					gvProcessingCount = gvProcessingCount + 1;
					gvRequestedProcessing = gvRequestedProcessing + 1;
				} else {
					gvRequestedProcessing = gvRequestedProcessing + 1;
				}

				lvBody = {
					URL: pUrl,
					Client: pClient,
					TypeKey: gcReturn
				};

				lvResult = _callHciProcess(pUrl, lvBody);

				if (lvResult === "SENT") {
					gvProcessingCount = gvProcessingCount + 1;
					gvRequestedProcessing = gvRequestedProcessing + 1;
				} else {
					gvRequestedProcessing = gvRequestedProcessing + 1;
				}

			} else {
				lvBody = {
					URL: pUrl,
					Client: pClient,
					TypeKey: gcConfirmError
				};

				lvResult = _callHciProcess(pUrl, lvBody);

				if (lvResult === "SENT") {
					gvProcessingCount = gvProcessingCount + 1;
					gvRequestedProcessing = gvRequestedProcessing + 1;
				} else {
					gvRequestedProcessing = gvRequestedProcessing + 1;
				}

				lvBody = {
					URL: pUrl,
					Client: pClient,
					TypeKey: gcReturnError
				};

				lvResult = _callHciProcess(pUrl, lvBody);

				if (lvResult === "SENT") {
					gvProcessingCount = gvProcessingCount + 1;
					gvRequestedProcessing = gvRequestedProcessing + 1;
				} else {
					gvRequestedProcessing = gvRequestedProcessing + 1;
				}
			}
		}
	}

	//---------------------------------------------------------//
	// Function to call the HCI Process                        //
	//--------------------------------------------------------//
	function _callHciProcess(pUrl, pBody) {
		//Variable Declarations
		var oDestination;
		var oClient;
		var oRequest;
		var lvResult;

		try {
			//Reading the destination properties
			oDestination = $.net.http.readDestination(gvDestPath, gvDestination);

			//Creating HTTP Client
			oClient = new $.net.http.Client();

			//Creating Request
			oRequest = new $.web.WebRequest($.net.http.POST, "");
			// 			oRequest.headers.set("Content-Type", "application/x-www-form-urlencoded");
			// 			oRequest.headers.set("Accept", "text/json");
			oRequest.setBody(JSON.stringify(pBody));

			oClient.request(oRequest, oDestination);

			//Getting the response body and setting as output data
			var oResponse = oClient.getResponse();
			// 			var oData = JSON.parse(oResponse.body.asString());
			// 			var oMessage = oData.message;

		} catch (errorObj) {
			lvResult = "ERROR";
			return "Error during calling HCI Notification process" + "Error: " + errorObj.message;
		}
		lvResult = "SENT";
		return lvResult;
	}

	// -------------------------------------------------------- // 
	// Function to Execute the Metods to Send out Alerts        //
	// -------------------------------------------------------- //
	function execute() {
		try {
			//Get the Routing Entries from the table
			var oRoutes = getRoutes();

			//Perform Counts and Trigger Notifications
			_countAndSend(oRoutes);

			//Write to the trace
			$.trace.info(JSON.stringify({
				RequestedNotifications: gvRequestedProcessing,
				ProcessedNotifications: gvProcessingCount
			}));
		} catch (err) {
			$.trace.error(JSON.stringify({
				message: err.message
			}));
			gvError = err.message;
		}

		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			Error: gvError
		}));
	}