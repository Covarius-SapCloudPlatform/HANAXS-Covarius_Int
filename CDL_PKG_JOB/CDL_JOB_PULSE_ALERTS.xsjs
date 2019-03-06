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
	var gvConfigTable = 'CDL_PULSE_ALERT_CONFIG';
	var gvAlertRecipientTable = 'CDL_PULSE_ALERT_RECIPIENT';
	var gvAlertMasterTable = 'CDL_PULSE_ALERT_MASTER';
	var gvPulseLogMasterTable = 'CDL_PULSE_LOG_MASTER';

	//Path to the Destination used for Mailgun API
	var gvDestPath = "CDL_PKG_LOGGING.CDL_PKG_API";
	var gvDestination = "CDL_DESTINATION_MAILGUN";
	var gvError,
		gvDays;

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
				HUB_INTEGRATION: lsReturn.getString(2),
				ON_OFF: lsReturn.getString(3),
				ALERT_TYPE: lsReturn.getString(4),
				FREQUENCY: lsReturn.getString(5),
				FREQUENCY_VALUE: lsReturn.getString(6),
				ALERT_RETENTION_DAYS: lsReturn.getString(7)
			};
			Configuration.push(oEntry);
			gvDays = lsReturn.getString(7);
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
	function getAlertRecipients(ivRecipients) {
		//Get the Connection to the Database
		var oConnection = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvAlertRecipientTable + '"';
		lvQuery = lvQuery + ' WHERE "RECIPIENT_EMAIL" = ' + "'" + ivRecipients + "'";

		var oStatement = oConnection.prepareStatement(lvQuery);

		//Execute the Query
		var lsReturn = oStatement.executeQuery();

		//Map and Save the results
		var AlertRecipients = [];

		while (lsReturn.next()) {
			var oEntry = {
				RECIPIENT_ID: lsReturn.getString(1),
				RECIPIENT_EMAIL: lsReturn.getString(2),
				ALERT_TYPE: lsReturn.getString(3),
				INTERFACE: lsReturn.getString(4),
				EMAIL_HEADER: lsReturn.getString(5),
				FREQUENCY: lsReturn.getString(6),
				FREQUENCY_VALUE: lsReturn.getString(7),
				DATA_ERROR_ALERT: lsReturn.getString(8),
				SAP_RESPONSE_ALERT: lsReturn.getString(9),
				SAP_DELIVERY_ALERT: lsReturn.getString(10)
			};
			AlertRecipients.push(oEntry);
		}

		//Close the DB Connection
		oStatement.close();
		oConnection.close();

		//Set the Number of entries found for Trace
		gvAlertConfigEntries = AlertRecipients.length;

		//Return the records
		return AlertRecipients;
	}

	// -------------------------------------------------------- // 
	// Function to build and send e-mails                       //
	// -------------------------------------------------------- //
	function buildAndSend(oConfiguration, oRecipients) {
		var oEntries = [],
			lsEntry,
			lvText,
			lvHtml,
			lvEmailResult;

		//Loop at Alerts then get the entries to be reported
		for (var i = 0; i < oRecipients.length; i++) {

			//Read the Entries from Pulse Log Master
			oEntries = _readPulseLogMaster(oRecipients[i].INTERFACE, oRecipients[i].DATA_ERROR_ALERT, oRecipients[i].SAP_RESPONSE_ALERT,
				oRecipients[
					i].SAP_DELIVERY_ALERT,
				gvDays);

			if (oEntries.length > 0) {
				//Build Email Text
				lvText = _buildTextEmail(oEntries, "TRUE");
				//Build Email HTML
				lvHtml = _buildHtmlEmail(oEntries, "TRUE");
				//lvPdf = _buildPdf(oEntries);

				//Send Email
				var oEmailRecipients = oRecipients[i].RECIPIENT_EMAIL.split(";");
				for (var j = 0; j < oEmailRecipients.length; j++) {
					lvEmailResult = _sendMail(gcFrom, oEmailRecipients[j], oRecipients[i].EMAIL_HEADER, lvText, lvHtml);
				}

				//Update the Alert Master Table
				_updateAlertMaster(lvEmailResult, oRecipients[i]);
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

		var lvBase64HeaderImage =
			'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';
		var lvBase64FooterImage =
			'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';

		//Header
		var lvText = '<!doctype html>';
		lvText = lvText + '<html>';
		lvText = lvText + '<head><title>Covarius Data Lake - Alerting Report</title></head>';
		lvText = lvText + '<body>';
		lvText = lvText + '<h2 style="background: rgb(102, 95, 99); border: 0px solid rgb(102, 95, 99); padding: 5px 10px;"><span style=';
		lvText = lvText +
			'"font-weight:normal;padding:0px;text-align:left;line-height:3.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: Arial;font-family:Lato, Arial, &quot;Helvetica Neue&quot;,';
		lvText = lvText +
			'Helvetica, sans-serif;font-size:20px;color:#ffffff;text-transform:uppercase;letter-spacing:2px;"></span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
			'<img src="data:image/png;base64,' + lvBase64HeaderImage +
		//	'" style="width:70px;height:70px;float:right;"></h2>';
		'"></h2>';

		lvText = lvText +
			'<p class="element" style="text-align:left;"> <span style="line-height:1.5;font-style:italic;mso-font-alt: Arial;font-family:&quot;Open Sans&quot;, Arial, &quot;Helvetica Neue&quot;, Helvetica, ';
		lvText = lvText + 'sans-serif;color:#9e9e9e;letter-spacing:0px;font-size:14px;">Alerting Report</span></p>';
		lvText = lvText +
			'<h3 style="padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: sans-serif;font-family:Lato, ';
		lvText = lvText +
			'sans-serif;font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5d6d8f;">Good Day Pulse Alert Subscriber</h3>';
		lvText = lvText +
			'<p style="font-weight:normal;padding:0px;text-align:left;margin:0px 0px 1.35em;mso-font-alt: Arial;font-family:&quot;Open Sans&quot;, Arial, &quot;Helvetica Neue&quot;, Helvetica, ';
		lvText = lvText +
			'sans-serif;color:#606060;font-size:17px;line-height:1.6;font-style:italic;">Some alerts have occured on the Covarius Data Lake, which we would like to bring under your attention.</p>';

		lvText = lvText +
			'<p style="font-weight:normal;padding:0px;text-align:left;margin:0px 0px 1.35em;line-height:1.7;mso-font-alt: Arial;font-family:&quot;Open Sans&quot;, Arial, &quot;Helvetica Neue&quot;, Helvetica, ';
		lvText = lvText +
			'sans-serif;font-size:15px;color:#606060;">Please investigate the alerts from the below list, using the Pulse Platform, The Pulse Logging Application can be used, searching with the below <b>';
		lvText = lvText +
			'Message Guid</b> for more information.&nbsp; <a title="Go to Pulse Logging" href="https://neo.covarius.com/#Logging-Overview" target="_blank" rel="noopener">Go to Pulse Logging</a>&nbsp;</p>';

		//Table
		if (pTable === "TRUE") {
			//Header Styling
			var lvHeadStyle1 =
				'<th scope="col"><span style="background: rgb(102, 95, 99); border: 0px solid rgb(102, 95, 99); padding: 5px 10px;"><span style=' +
				'"font-weight:normal;padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: Arial;font-family:Lato, Arial,';
			var lvHeadStyle2 =
				'&quot;Helvetica Neue&quot;, Helvetica, sans-serif;font-size:14px;color:#ffffff;text-transform:uppercase;letter-spacing:2px;">';

			var lvItemStyle1 = '<td style="width: 10%;"><span style="font-size:12px;"><span style=" padding: 5px 10px;"><span style=' +
				'"font-weight:normal;padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: Arial;font-family:Lato, Arial,';
			var lvItemStyle2 =
				'&quot;Helvetica Neue&quot;, Helvetica, sans-serif;font-size:12px;color:#665F63;text-transform:uppercase;letter-spacing:2px;">';

			//Table Header
			lvText = lvText +
				'<table border="1" dir="ltr" style="background: rgb(242, 243, 244); border: 0px solid rgb(102, 95, 99); padding: 5px 10px;">';
			lvText = lvText + '<thead>';
			lvText = lvText + '<tr>';
			lvText = lvText + lvHeadStyle1;
			lvText = lvText + lvHeadStyle2;
			lvText = lvText + 'Message Guid</span></span></th>';
			lvText = lvText + lvHeadStyle1;
			lvText = lvText + lvHeadStyle2;
			lvText = lvText + 'Transaction Date</strong></span></th>';
			lvText = lvText + lvHeadStyle1;
			lvText = lvText + lvHeadStyle2;
			lvText = lvText + 'Target</strong></span></th>';
			lvText = lvText + lvHeadStyle1;
			lvText = lvText + lvHeadStyle2;
			lvText = lvText + 'Interface</strong></span></th>';
			// 			lvText = lvText + lvHeadStyle1;
			// 			lvText = lvText + lvHeadStyle2;
			// 			lvText = lvText + 'Status Code</strong></span></th>';
			lvText = lvText + lvHeadStyle1;
			lvText = lvText + lvHeadStyle2;
			lvText = lvText + 'Message</strong></span></th>';
			lvText = lvText + '</tr>';
			lvText = lvText + '</thead>';
			lvText = lvText + '<tbody>';

			//Table of Items
			for (var j = 0; j < oEntries.length; j++) {
				lvText = lvText + '<tr>';
				lvText = lvText + lvItemStyle1 + lvItemStyle2 +
					oEntries[j].MESSAGE_GUID + '</span></span></span></td>';
				lvText = lvText + lvItemStyle1 + lvItemStyle2 +
					oEntries[j].START_TIME + '</span></span></span></td>';
				lvText = lvText + lvItemStyle1 + lvItemStyle2 +
					oEntries[j].TARGET_SYS_ID + '</span></span></span></td>';
				lvText = lvText + lvItemStyle1 + lvItemStyle2 +
					oEntries[j].INTERFACE + '</span></span></span></td>';
				// lvText = lvText + lvItemStyle1 + lvItemStyle2 +
				// 	oEntries[j].STATUS_CODE + '</span></span></span></td>';
				lvText = lvText + lvItemStyle1 + lvItemStyle2 +
					oEntries[j].STATUS_MESSAGE + '</span></span></span></td>';
				lvText = lvText + '</tr>';
			}
			lvText = lvText + '</tbody>';
			lvText = lvText + '</table>';
		}

		//Footer
		lvText = lvText + '<p>&nbsp;</p>';
		lvText = lvText +
			'<p style="font-weight:normal;padding:0px;text-align:left;margin:0px 0px 1.35em;line-height:1.7;mso-font-alt: Arial;font-family:&quot;Open Sans&quot;, Arial, &quot;Helvetica Neue&quot;, Helvetica, ';
		lvText = lvText +
			'sans-serif;font-size:15px;color:#606060;">PLEASE TAKE NOTE THIS IS A SYSTEM GENERATED MESSAGE - PLEASE DO NOT REPLY&nbsp;</p>';
		lvText = lvText +
			'<h3 style="padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: sans-serif;font-family:Lato,';
		lvText = lvText +
			'sans-serif;font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5d6d8f;">Regards</h3>';
		lvText = lvText +
			'<p class="element" style="text-align:left;"> <span style="line-height:1.5;font-style:italic;mso-font-alt: Arial;font-family:&quot;Open Sans&quot;, Arial, &quot;Helvetica Neue&quot;, Helvetica,';
		lvText = lvText + 'sans-serif;color:#9e9e9e;letter-spacing:0px;font-size:14px;">Pulse Alerting</span> </p>';
		lvText = lvText + '<h2 style="background: rgb(102, 95, 99); border: 0px solid rgb(102, 95, 99); padding: 5px 10px;"><span style=';
		lvText = lvText +
			'"font-weight:normal;padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: Arial;font-family:Lato, Arial, &quot;Helvetica';
		lvText = lvText +
			'Neue&quot;, Helvetica, sans-serif;font-size:8px;color:#ffffff;text-transform:uppercase;letter-spacing:2px;">Copyright © 2018 Covarius. All Rights Reserved.</span>';
		lvText = lvText + '</h2>';
		lvText = lvText + '<img src="data:image/png;base64,' + lvBase64FooterImage +
			'" style="float:right;">';

		lvText = lvText + '</body>';
		lvText = lvText + '</html>';

		return lvText;
	}

	//----------------------------------------------------------//
	// Function to build PDF as attachment                      //
	// ---------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Function to read the Pulse Log Master                    //
	// -------------------------------------------------------- //
	function _readPulseLogMaster(pInterface, pCDLE001, pCDLE003, pCDLE002, pDays) {
		//Get the Connection to the Database
		var oConnection = $.db.getConnection();

		//Build the Query
		var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvPulseLogMasterTable + '"';
		lvQuery = lvQuery + ' WHERE "INTERFACE" = ' + "'" + pInterface + "'";

		if (pDays) {
			//Get date number of days back based on configured days
			var lvDate = new Date();
			lvDate.setDate(lvDate.getDate() - pDays);
			var lvDateString = lvDate.toISOString().split('T')[0];

			if (lvQuery.indexOf('AND') === -1) {
				lvQuery = lvQuery + ' AND "START_TIME" >= ' + "'" + lvDateString + "'";
			} else {
				lvQuery = lvQuery + ' OR "START_TIME" >= ' + "'" + lvDateString + "'";
			}
		}

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
	// Function to delete entries in Master table older than 90 days //
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
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvAlertMasterTable + "\" WHERE DATE <= ?");

			//Date
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
			gvTableUpdate += ",There was a problem deleting entries in the Alert Master Table, Error: " + errorObj.message;
		}
	}

	// ------------------------------------------------------------- // 
	// Function to update DB Entries
	// ------------------------------------------------------------- /
	function _updateAlertMaster(pMailResult, oAlert) {
		try {
			//Delete Historic Entries
			_deleteHistoricEntries();

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
			oStatement.setString(3, oAlert.RECIPIENT_ID);
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
	function execute(recipientEmail, frequency, frequencyValue) {
		try {
			//Get the configuration from the table
			var oConfiguration = getConfiguration();
			//Get the Alerts Recipients that have been setup
			var oRecipients = getAlertRecipients(recipientEmail);
			//Build and Send Emails
			buildAndSend(oConfiguration, oRecipients);

			$.trace.info(JSON.stringify({
				TotalAlerts: oRecipients.length,
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