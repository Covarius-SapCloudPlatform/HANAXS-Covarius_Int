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
	var gvConfigTable = 'CDL_PULSE_CONFIG';
	var gvAlertConfigTable = 'CDL_PULSE_ALERT_CONFIG';
	var gvAlertMasterTable = 'CDL_PULSE_ALERT_MASTER';
	var gvPulseLogMasterTable = 'CDL_PULSE_LOG_MASTER';

	//Path to the Destination used for Mailgun API
	var gvDestPath = "CDL_PKG_LOGGING.CDL_PKG_JOB";
	var gvDestination = "CDL_DESTINATION_MAILGUN";
	var gvError;

	//Variables for Tracing
	var gvAlertConfigEntries,
		gvSuccessSend = 0,
		gvErrorSend = 0;

	//Constants
	var gcDataError = 'CDL-E001',
		gcDeliveryError = 'CDL-E002',
		gcResponseError = 'CDL-E003',
		gcFrom = 'service.sap@covarius.com';

	// -------------------------------------------------------- // 
	// Function to get the current configuration on Pulse       //
	// -------------------------------------------------------- //
	function getConfiguration() {
		//Get the Connection to the Database
		var oConnection = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var oStatement = oConnection.prepareStatement(
			"SELECT *  from \"" + gvSchemaName + "\".\"" + gvConfigTable + "\"");

		//Execute the Query
		var lsReturn = oStatement.executeQuery();

		//Map and Save the results
		var Configuration = [];

		while (lsReturn.next()) {
			var oEntry = {
				ID: lsReturn.getString(1),
				FREQ_PER_DAY: lsReturn.getString(2),
				ON_OFF: lsReturn.getString(3)
			};
			Configuration.push(oEntry);
		}

		//Close the DB Connection
		oStatement.close();
		oConnection.close();

		//Return the records
		return Configuration;
	}

	// -------------------------------------------------------- // 
	// Function to get the Alert Configuration Entries          //
	// -------------------------------------------------------- //
	function getAlertConfig() {
		//Get the Connection to the Database
		var oConnection = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var oStatement = oConnection.prepareStatement(
			"SELECT *  from \"" + gvSchemaName + "\".\"" + gvAlertConfigTable + "\"");

		//Execute the Query
		var lsReturn = oStatement.executeQuery();

		//Map and Save the results
		var AlertConfiguration = [];

		while (lsReturn.next()) {
			var oEntry = {
				ALERT_ID: lsReturn.getString(1),
				RECIPIENT_EMAIL: lsReturn.getString(2),
				INTERFACE: lsReturn.getString(3),
				EMAIL_HEADER: lsReturn.getString(4),
				DATA_ERROR_ALERT: lsReturn.getString(5),
				SAP_RESPONSE_ALERT: lsReturn.getString(6),
				SAP_DELIVERY_ALERT: lsReturn.getString(7)
			};
			AlertConfiguration.push(oEntry);
		}

		//Close the DB Connection
		oStatement.close();
		oConnection.close();

		//Set the Number of entries found for Trace
		gvAlertConfigEntries = AlertConfiguration.length;

		//Return the records
		return AlertConfiguration;
	}

	// -------------------------------------------------------- // 
	// Function to build and send e-mails                       //
	// -------------------------------------------------------- //
	function buildAndSend(oConfiguration, oAlerts) {
		var oEntries = [],
			lsEntry,
			lvText,
			lvHtml,
			lvEmailResult;

		//Loop at Alerts then get the entries to be reported
		for (var i = 0; i < oAlerts.length; i++) {

			//Read the Entries from Pulse Log Master
			oEntries = _readPulseLogMaster(oAlerts[i].INTERFACE, oAlerts[i].DATA_ERROR_ALERT, oAlerts[i].SAP_RESPONSE_ALERT, oAlerts[i].SAP_DELIVERY_ALERT);

			if (oEntries) {
				//Build Email Text
				lvText = _buildTextEmail(oEntries, "TRUE");
				//Build Email HTML
				lvHtml = _buildHtmlEmail(oEntries, "TRUE");
				//lvPdf = _buildPdf(oEntries);

				//Send Email
				lvEmailResult = _sendMail(gcFrom, oAlerts[i].RECIPIENT_EMAIL, oAlerts[i].EMAIL_HEADER, lvText, lvHtml);

				//Update the Alert Master Table
				_updateAlertMaster(lvEmailResult, oAlerts[i]);
			}
		}
	}

	// -------------------------------------------------------- // 
	// Function to build the Email Text                         //
	// -------------------------------------------------------- //
	function _buildTextEmail(oEntries, pTable) {

		var lvText = "Good Day Pulse Alert Subscriber. \n";
		lvText = lvText + "\n";

		lvText = lvText + "Some alerts have occured on the Covarius Data Lake, which we would like to bring under your attention. \n";
		lvText = lvText +
			"Please investigate the alerts from the below list, using the Pulse Platform, The Pulse Logging Application can be used, searching with the below Message Guid for more information. \n";
		lvText = lvText + "\n";

		//Build Text Table
		if (pTable === "TRUE") {
			lvText = lvText +
				"________________________________________________________________________________________________________________________________________________________________________________________________________________________________ \n";
			lvText = lvText +
				"|         Message Guid         |       Transaction Date      | Target | Interface  | Status Code |                                            Message                                                                          | \n";
			lvText = lvText +
				"================================================================================================================================================================================================================================ \n";

			for (var j = 0; j < oEntries.length; j++) {
				lvText = lvText + "| " + oEntries[j].MESSAGE_GUID + " | " + oEntries[j].START_TIME + " | " + oEntries[j].TARGET_SYS_ID + " | " +
					oEntries[j].INTERFACE + " | " + oEntries[j].STATUS_CODE + "    | " + oEntries[j].STATUS_MESSAGE.substring(0, 120) + "    | " + "\n";
			}

			lvText = lvText +
				"================================================================================================================================================================================================================================  \n";
			lvText = lvText + "\n";

		}

		lvText = lvText + "PLEASE TAKE NOTE, THIS IS A SYSTEM GENERATED MESSAGE, PLEASE DO NOT REPLY. \n";
		lvText = lvText + "\n";

		lvText = lvText + "Regards";
		lvText = lvText + "\n";
		lvText = lvText + "Covarius Data Lake Pulse Alerting";

		return lvText;
	}

	// -------------------------------------------------------- // 
	// Function to build the Email Html                         //
	// -------------------------------------------------------- //
	function _buildHtmlEmail(oEntries, pTable) {

		//Header
		var lvText =
			'<h1><strong>Covarius Data Lake Pulse&nbsp;<img src="https://www.covarius.com/czusys_images/map_logo_cov_blue.png" alt="" width="100" height="50" /></strong></h1>';
		lvText = lvText + '<h4><span style="color: #000080;"><strong>Good Day Pulse Alert Subscriber&nbsp; &nbsp;</strong></span></h4>';
		lvText = lvText +
			'<p><span style="color: #000000;">Some alerts have occured on the Covarius Data Lake, which we would like to bring under your attention.&nbsp;&nbsp;</span></p>';
		lvText = lvText +
			'<p><span style="color: #000000;">Please investigate the alerts from the below list, using the Pulse Platform, The Pulse Logging Application can be used,';
		lvText = lvText +
			'searching with the below Message Guid for more information.&nbsp;<a title="Pulse" href="https://neo.covarius.com/#Logging-Overview" target="https://neo.covarius.com/#Logging-Overview" rel="noopener">Pulse</a></span></p>';

		//Table
		if (pTable === "TRUE") {
			//Table Header
			lvText = lvText + '<table style="background-color: #e3e3e3; border-color: #6d7a85; float: left;" border="5">';
			lvText = lvText + '<tbody>';
			lvText = lvText + '<tr>';
			lvText = lvText + '<td><span style="color: #000080;"><strong>Message Guid</strong></span></td>';
			lvText = lvText + '<td><span style="color: #000080;"><strong>Transaction Date</strong></span></td>';
			lvText = lvText + '<td><span style="color: #000080;"><strong>Target</strong></span></td>';
			lvText = lvText + '<td><span style="color: #000080;"><strong>Interface</strong></span></td>';
			lvText = lvText + '<td><span style="color: #000080;"><strong>Status Code</strong></span></td>';
			lvText = lvText + '<td><span style="color: #000080;"><strong>Message</strong></span></td>';
			lvText = lvText + '</tr>';

			//Table of Items
			for (var j = 0; j < oEntries.length; j++) {
				lvText = lvText + '<tr>';
				lvText = lvText + '<td>' + oEntries[j].MESSAGE_GUID + '</td>';
				lvText = lvText + '<td>' + oEntries[j].START_TIME + '</td>';
				lvText = lvText + '<td>' + oEntries[j].TARGET_SYS_ID + '</td>';
				lvText = lvText + '<td>' + oEntries[j].INTERFACE + '</td>';
				lvText = lvText + '<td>' + oEntries[j].STATUS_CODE + '</td>';
				lvText = lvText + '<td>' + oEntries[j].STATUS_MESSAGE + '</td>';
				lvText = lvText + '</tr>';
			}
			lvText = lvText + '</tbody>';
			lvText = lvText + '</table>';
		}

		//Footer
		lvText = lvText + '<p>&nbsp;</p>';
		lvText = lvText +
			'<p><span style="color: #000000;">PLEASE TAKE NOTE, THIS IS A SYSTEM GENERATED MESSAGE, PLEASE DO NOT REPLY.</span></p>';
		lvText = lvText + '<p><strong><span style="color: #000080;">Regards</span></strong></p>';
		lvText = lvText + '<p><span style="color: #000080;">Covarius Data Lake Pulse Alerting</span></p>';
		lvText = lvText + '<p>&nbsp;</p>';
		lvText = lvText + '<p>&nbsp;</p>';

		return lvText;
	}

	//----------------------------------------------------------//
	// Function to build PDF as attachment                      //
	// ---------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Function to read the Pulse Log Master                    //
	// -------------------------------------------------------- //
	function _readPulseLogMaster(pInterface, pCDLE001, pCDLE003, pCDLE002) {
		//Get the Connection to the Database
		var oConnection = $.db.getConnection();

		//Build the Query
		var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvPulseLogMasterTable + '"';
		lvQuery = lvQuery + ' WHERE "INTERFACE" = ' + "'" + pInterface + "'";

		if (pCDLE001 === "TRUE") {
			lvQuery = lvQuery + ' AND "STATUS_CODE" = ' + "'" + gcDataError + "'";
		}

		if (pCDLE003 === "TRUE") {
			if (lvQuery.indexOf('AND') === -1) {
				lvQuery = lvQuery + ' AND "STATUS_CODE" = ' + "'" + gcResponseError + "'";
			} else {
				lvQuery = lvQuery + ' OR "STATUS_CODE" = ' + "'" + gcResponseError + "'";
			}
		}

		if (pCDLE002 === "TRUE") {
			if (lvQuery.indexOf('AND') === -1) {
				lvQuery = lvQuery + ' AND "STATUS_CODE" = ' + "'" + gcDeliveryError + "'";
			} else {
				lvQuery = lvQuery + ' OR "STATUS_CODE" = ' + "'" + gcDeliveryError + "'";
			}
		}

		//Prepare the SQL Statement to read the entries
		var oStatement = oConnection.prepareStatement(lvQuery);

		//Execute the Query
		var lsReturn = oStatement.executeQuery();

		//Map and Save the results
		var Entries = [];

		while (lsReturn.next()) {
			var oEntry = {
				MESSAGE_GUID: lsReturn.getString(1),
				START_TIME: lsReturn.getString(2),
				END_TIME: lsReturn.getString(3),
				STATUS: lsReturn.getString(4),
				SOURCE_SYS_ID: lsReturn.getString(10),
				SOURCE_SYS_AREA: lsReturn.getString(11),
				TARGET_SYS_ID: lsReturn.getString(12),
				TARGET_SYS_AREA: lsReturn.getString(13),
				INTERFACE: lsReturn.getString(14),
				STATUS_CODE: lsReturn.getString(15),
				STATUS_MESSAGE: lsReturn.getString(16)
			};
			Entries.push(oEntry);
		}

		//Close the DB Connection
		oStatement.close();
		oConnection.close();

		//Return the records
		return Entries;
	}

	// -------------------------------------------------------- // 
	// Function to send the email out                           //
	// -------------------------------------------------------- //
	function _sendMail(pFrom, pTo, pSubject, pText, pHtml) {
		//Variable Declarations
		var oDestination;
		var oClient;
		var oRequest;
		var lvResult;

		//Build the request Body for Mailgun
		var lvMailDetails = "from=" + pFrom + "&to=" + pTo + "&subject=" + pSubject;
		lvMailDetails += "&text=" + encodeURIComponent(pText) + "&html=" + encodeURIComponent(pHtml);

		try {
			//Reading the destination properties
			oDestination = $.net.http.readDestination(gvDestPath, gvDestination);

			//Creating HTTP Client
			oClient = new $.net.http.Client();

			//Creating Request
			oRequest = new $.web.WebRequest($.net.http.POST, "messages");
			oRequest.headers.set("Content-Type", "application/x-www-form-urlencoded");
			oRequest.headers.set("Accept", "text/json");
			oRequest.setBody(lvMailDetails);

			oClient.request(oRequest, oDestination);

			//Getting the response body and setting as output data
			var oResponse = oClient.getResponse();
			var oData = JSON.parse(oResponse.body.asString());
			var oMessage = oData.message;

			if (oMessage === "Queued. Thank you.") {
				//return "Email has been sent to:" + pTo;
				lvResult = "SENT";
				gvSuccessSend = parseInt(gvSuccessSend) + 1;
			} else {
				// return "Error during email sending via mailGun";
				lvResult = "ERROR";
				gvErrorSend = parseInt(gvSuccessSend) + 1;
			}

		} catch (errorObj) {
			return "Error during email sending via mailGun" + "Error: " + errorObj.message;
		}

		return lvResult;
	}

	// ------------------------------------------------------------- // 
	// Function to update DB Entries
	// ------------------------------------------------------------- /
	function _updateAlertMaster(pMailResult, oAlert) {
		try {
			//Get Database Connection
			var oConnection = $.db.getConnection();

			//Prepare SQL Statement to be executed
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvAlertMasterTable +
				'" VALUES (?, ?, ?, ?, ?, ?)');

			//Date
			var lvDate = new Date();
			var lvDateString = lvDate.toISOString().substring(0, 10);
			oStatement.setString(1, lvDateString);
			//Time
			var lvTimeString = lvDate.toISOString().substring(11, 19);
			oStatement.setString(2, lvTimeString);
			//Alert ID
			oStatement.setString(3, oAlert.ALERT_ID);
			//Recipient Email
			oStatement.setString(4, oAlert.RECIPIENT_EMAIL);
			//Interface
			oStatement.setString(5, oAlert.INTERFACE);
			//Status
			oStatement.setString(6, pMailResult);

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

		} catch (err) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = err.message;
			throw new Error(err.message);
		}
	}

	// -------------------------------------------------------- // 
	// Function to Execute the Metods to Send out Alerts        //
	// -------------------------------------------------------- //
	function execute() {
		try {
			//Get the configuration from the table
			var oConfiguration = getConfiguration();
			//Get the Alerts that have been setup
			var oAlerts = getAlertConfig();
			//Build and Send Emails
			buildAndSend(oConfiguration, oAlerts);

			$.trace.info(JSON.stringify({
				TotalAlerts: oAlerts.length,
				AlertConfigEntries: gvAlertConfigEntries,
				SuccessfulEmails: gvSuccessSend,
				ErronousEmails: gvErrorSend
			}));
		} catch (err) {
			$.trace.error(JSON.stringify({
				message: err.message
			}));
		}
	}