(function() {
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
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.POST) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "POST is not supported, perform a GET to send out all relevant alerts"
		}));
	}

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
				ON_OFF: lsReturn.getString(3),
				ALERT_RETENTION_DAYS: lsReturn.getString(4)
			};
			Configuration.push(oEntry);
			gvDays = lsReturn.getString(4);
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
			oEntries = _readPulseLogMaster(oAlerts[i].INTERFACE, oAlerts[i].DATA_ERROR_ALERT, oAlerts[i].SAP_RESPONSE_ALERT, oAlerts[i].SAP_DELIVERY_ALERT,
				gvDays);

			if (oEntries.length > 0) {
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
        var lvBase64HeaderImage = 'iVBORw0KGgoAAAANSUhEUgAAADgAAAA5CAAAAAExtofxAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHKSURBVEjH7ZVtjcMwEESHgimYghmUgzGEwZIIgmAohUAIBVNYCu9+OF9O2qQ66U466bZS29HL2Nv1dq2+htYoUpakSWiQNCEkaZRrF7i7u+vkN1WDZYEkUxJ13f0KPvvvYjKpuOpa0mRiy0kTWUKa5VX0+xhaFm4lqm+wSqQeXyRBIi+SQUKLHJFIq0Ri1CJd6lxSLh+k0cj5CD6oZPhJOGFzS/CsGj/CoR5fgucOFkyKkCXJKcoHJxRJMpAOsECom5pOsCYyMhdlD3+3QpK9j8ue9T8IWX7RWL/lekYt7OqXwAsYIVb5As4nXfAdDBXCJElP0Mk51TbIEE9wWJPpdIQPSFtbtzBsyegEd8m8gpL0mLv3COdkkk7QS6ofy6j1Ev5om7yF7rx73c/372x59bf+N35k7MwsHah1ZnmV2cy6kzEUWC6OOQaA5UklByjh1vgAGNcx/AQAvzOGCfDHmiV8ZuwBhobRdS+N2hmTAyU2q4xB3d2OI/vNowOe6hi9Kk4HMLVF6Zf5+37HVADaoiyrXBj7AeZL90VpL4wAvhbFmtLeGa3plK20N8ZDUXLTgm/OMYYYt3s+xBBPt37cnvgfHT9kDN+KxBeEXVCUn9JxhwAAAABJRU5ErkJggg==';
		var lvBase64FooterImage = 'iVBORw0KGgoAAAANSUhEUgAAAMgAAAAcCAMAAAATKQCVAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoyQjgwMDRFMjVDRjIxMUU1QjI3N0ZGRTQ3NDJFQjJCMyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo0OUNGRUQ4QTVDRkQxMUU1QjI3N0ZGRTQ3NDJFQjJCMyI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjJCODAwNEUwNUNGMjExRTVCMjc3RkZFNDc0MkVCMkIzIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjJCODAwNEUxNUNGMjExRTVCMjc3RkZFNDc0MkVCMkIzIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+zrgM9AAAAspQTFRF////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////smNKVQAAAO10Uk5TAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE5PUFFSU1RVVldYWVpbXl9gYWJjZWZnaGlqa2xtbm9wcnN1dnd4eXp7fH1+f4CBgoOEhYaHiImKjI2Oj5CRkpOUlZaXmJqbnJ2en6Cho6Slpqepqqusra6vsLGys7S1tri5ury9vr/Aw8TFxsfIycrLzM3Oz9DR0tPU1dbX2drc3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+gB+N+AAABnpJREFUWMOVmPlDFUUcwOc9Tg1EnxdSkqhlZBklmWYWqUSoYeYFeWslXqWRGWqhFklIgngnapJKZmGJIGYqqUhqAlKgqIkgcsib/6H3/e7u7MzuvIU3P32P2Zn5zPGd7ywheuk0KfPMHUpbr+Ut7kMMJfzT/EonpbVFqaPsgmOmq4w0VO4Kxpk9NdUeD6qqoIwlIS5qgBf/2UCwOlCMANHXjROajN12qZ7SW8Xp43yNQw1YfYuy0pbTn/eNKtBd9MoMG+cCy06xJa+jYDzAaq3Bz1TlLuVL06lPgvU5AUsEiskgdhUmTHcSMvaK3kRtskPofUyV0ANtXMhcj2SLLloYagnyJdhKAzR1AnUP4ioPlts8BVkttnBzMldvUZuxA7pVXfdeZ02u2hctQBLAdPdJTR10zxqE0jQPQWYYG7jXnVVbrJoqcjdvyDzeqChfoMtRiorztw8nvhL73j7FV/eCW5DIB2Aar6mBZdQEcudPKKXlaj80xiMQ/1qcqY3ToiYvOoDHYSarFe3EBg8OU4/LghqXVvkYHqt8dBUMVqv22IL6v73cgATjFk3WVNsP1AzC6ocl/oONewQyEaRL6tHymXSe5rJKQTBu2vC2/lm3w/R2uLLncBSpXHiZ2gKW7+UgfsVgyGMHPYlagRDStw5Wu4cnIJ+B9BZzeK/QN9Z6cNUP47+zbRiuMOKezhAOwVQc2EgpyHaMa2wIMXj06t2DkG/A95onIFkgDSaSEoDHMV7mIsvAddZHNGaA8bAMBM9aw9Oa2v8O6L9ssgCJB98UT0AQfaJssNPBc1zKQTBivWq88GA/tDrMIKMfgvqOpna+gOvTLc0CJE4/rR0EWQ5SWS/JYHeAZ4KUozu4LprMuCRxJpABuADrWLUcjI3hxArkXfBN8wQkEnf2raQQ07AuuuwtnaQgY/QwzJc3wLzGCBKIgTqfxYWlGLZdgdgKJBN8L3sCYi9Vw8e5z0cKKQ65D+sv31lz5afnUTDvMoDYDoN8jSUMUbjPPiaWIKENLr050KMLMbKRhcL/9sbaxSyjSA6yBHxjTWZfMB8ygGBK1RjBAiveW3ttViD26Ktc3OhwijK8nLvWr04RQE5ZgESbzH4SkMnYbIJWxf8PXP3ORAJSlgYlY+evN5WkYainSWOXFD7T2d9ZNTfDjpCDzJFvrb5g3iGAPHefT5vUCHJDyS7TrHOtpI7kWvN4EHhy7LnJGjiiGi/DrHSVgowWw5BW3gTzah6kJ652gbdW431QW9RL0xKkaYlk0leB+DjfJQbdMOHOHvJRkZrqxiqW/SDPkII4IAkrNZmz9ICtgPjgg+V6b63CCExj5pJ2Qe6l95Ptng9AHMF3+TVYehsHEpLayuVL80EusUtJcKePMeJhqAniQDCINkdqFfpUg/4tcQNydSeUU2C9P0h6DPCaXMT3eRKeLpIBYr5UrT44cPoSpSCYc1z0E41bwZjLpSg4FXQOC2onMVfwcQeiRK0uuBvP+chAwvD9xnUZCpvotGyE8Fh8yB/MlteF45yhvIUDMOHfRkwBhL6kg5TiTGSxCptBLdeTUjfhdxTu8PXSwPS3ITXCJU9R5OfT+Hd6IQfSF2+YRu7FGFVD83z1fUe3eOu+2dj/Hi52Yylmrc/CzHEIaQ9EybqdUTKQtXi5sv8X47GLZ1DuXUFPh7O2u0BqXaVpC5Sx7H1KTVq34VDx/rf9iK7ftcdt6HeoVzoMIDXsx0tkE+iTSPsgviXgqHJIQIIbMN9Uchfvxc16lPU9AdtHixGBOLx9rKtN6nDOb09Jzj6jvBfrlHMYVKLO+Kr46ClL81qU1OBZIoK0sF9CPa/rsbkdEBKOz+L9sjtvidJuUfK8xIxKFBsG8k8154m18XHTv8InofqewVwh3XRN3dDWoPtJk686ghhA2D8X7+P4aLZ1CIQk4sezJCC2XYY+29QniP9u03B2C3d4veGXjx7f/dKdoi8/hBhA9KFtxDAXQDoGYvuZm2sBhHiJc1vHfmeQaTXicH7yFzPa7CbdVzlXSJCHHuW+u8D/RlJAzvoLD77bYaSDICTkNmZ63mYQQsb9xfp05vbj2gtcWc1dqcu9TNf47Jwy16atL8kaZ/KFLTt4+S5tqDi2NlJ0FLjKMZZMBOYccpUow8cLoZIqH3GJKzjfBPAV4LaJAWkg57NHbz5T2/ag6tjKJwwtesWkFt5wBdqKA/OVJwD5H/Z/yN6oLofHAAAAAElFTkSuQmCC';
		
		//Header
		var lvText = '<!doctype html>';
		lvText = lvText + '<html>';
		lvText = lvText + '<head><title>Covarius Data Lake - Alerting Report</title></head>';
		lvText = lvText + '<body>';
		lvText = lvText + '<h2 style="background: rgb(102, 95, 99); border: 0px solid rgb(102, 95, 99); padding: 5px 10px;"><span style=';
		lvText = lvText +
			'"font-weight:normal;padding:0px;text-align:left;line-height:3.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: Arial;font-family:Lato, Arial, &quot;Helvetica Neue&quot;,';
		lvText = lvText +
			'Helvetica, sans-serif;font-size:20px;color:#ffffff;text-transform:uppercase;letter-spacing:2px;">COVARIUS DATA LAKE PULSE</span>&nbsp;&nbsp;&nbsp;' + '<img style="float:right;" src="data:image/png;base64,' + lvBase64HeaderImage + 
			'" alt="" width="70" height="70" /></h2>';
	
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
				'<th scope="col"><span style="background: rgb(102, 95, 99); border: 0px solid rgb(102, 95, 99); padding: 5px 10px;"><span style=' + '"font-weight:normal;padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: Arial;font-family:Lato, Arial,';
			var lvHeadStyle2 =
				'&quot;Helvetica Neue&quot;, Helvetica, sans-serif;font-size:14px;color:#ffffff;text-transform:uppercase;letter-spacing:2px;">';
            
            var lvItemStyle1 = '<td style="width: 10%;"><span style="font-size:12px;"><span style=" padding: 5px 10px;"><span style=' + '"font-weight:normal;padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: Arial;font-family:Lato, Arial,';
            var lvItemStyle2 = '&quot;Helvetica Neue&quot;, Helvetica, sans-serif;font-size:12px;color:#665F63;text-transform:uppercase;letter-spacing:2px;">';
            
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
			lvText = lvText + lvHeadStyle1;
			lvText = lvText + lvHeadStyle2;
			lvText = lvText + 'Status Code</strong></span></th>';
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
				lvText = lvText + lvItemStyle1 + lvItemStyle2 +
					oEntries[j].STATUS_CODE + '</span></span></span></td>';
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
		lvText = lvText + 'sans-serif;font-size:15px;color:#606060;">PLEASE TAKE NOTE THIS IS A SYSTEM GENERATED MESSAGE - PLEASE DO NOT REPLY&nbsp;</p>';
		lvText = lvText +
			'<h3 style="padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: sans-serif;font-family:Lato,';
		lvText = lvText +
			'sans-serif;font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5d6d8f;">Regards</h3>';
		lvText = lvText + '<p class="element" style="text-align:left;"> <span style="line-height:1.5;font-style:italic;mso-font-alt: Arial;font-family:&quot;Open Sans&quot;, Arial, &quot;Helvetica Neue&quot;, Helvetica,';
		lvText = lvText + 'sans-serif;color:#9e9e9e;letter-spacing:0px;font-size:14px;">Pulse Alerting</span> </p>';
		lvText = lvText + '<h2 style="background: rgb(102, 95, 99); border: 0px solid rgb(102, 95, 99); padding: 5px 10px;"><span style=';
		lvText = lvText + '"font-weight:normal;padding:0px;text-align:left;line-height:1.5;word-break:normal;margin:0px 0px 5px;text-rendering:optimizelegibility;mso-font-alt: Arial;font-family:Lato, Arial, &quot;Helvetica';
		lvText = lvText + 'Neue&quot;, Helvetica, sans-serif;font-size:8px;color:#ffffff;text-transform:uppercase;letter-spacing:2px;">Copyright © 2018 Covarius. All Rights Reserved.</span>&nbsp;&nbsp;&nbsp;<img style="float:right;" src="data:image/png;base64,' + lvBase64FooterImage;
		lvText = lvText + '" alt="" width="200" height="28" /></h2>';
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

			lvQuery = lvQuery + ' AND "START_TIME" >= ' + "'" + lvDateString + "'";
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
	// Main function to add entries to the logging table        //
	// -------------------------------------------------------- //
	function main() {

		//Check the Method
		if ($.request.method === $.net.http.POST) {
			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				result: "POST is not supported, perform a GET to send out all relevant alerts"
			}));
		} else {
			try {
				//Get the configuration from the table
				var oConfiguration = getConfiguration();
				//Get the Alerts that have been setup
				var oAlerts = getAlertConfig();
				//Build and Send Emails
				buildAndSend(oConfiguration, oAlerts);

				//Write to the trace
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
				gvError = err.message;
			}

			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				TableUpdateStatus: gvTableUpdate,
				Error: gvError
			}));
		}
	}

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();