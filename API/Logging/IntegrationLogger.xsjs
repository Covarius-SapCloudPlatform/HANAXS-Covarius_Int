(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-06-15                                         //
	// Description: REST service to be able to create entries   //
	// in the Integration Logging Table. POST method is allowed //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service.                                     //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate;
	//Variables declaring the table details
	var gvSchemaName = 'COVARIUS_INT_LOGGING';
	var gvTableName = 'LOGGING_MASTER';

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
	// -------------------------------------------------------- // 
	// Function to insert entries into the table after SCIA creation //
	// -------------------------------------------------------- //
	function _createLogEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

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

			//Get date 30 days back
			var lvDate = new Date();
			lvDate.setDate(lvDate.getDate() - 30);
			var lvDateString = lvDate.toISOString().split('T')[0];

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\" WHERE START_TIME <= ?");

			//LoginEmail
			oStatement.setString(1, lvDateString);

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate += "Table entries deleted for historic entries older than 30 days;";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem deleting entries in the logging table, Error: " + errorObj.message;
		}
	}

	// ------------------------------------------------------------- // 
	// Function to schedule a xs job to update the statuses in a minute//
	// ------------------------------------------------------------- //
	// 	function _scheduleJob() {

	// 		try {

	// 			var oDate = new Date();
	// 			var iYears = oDate.getFullYear();
	// 			var iMonth = (oDate.getMonth() + 1);
	// 			var iDay = oDate.getDate();
	// 			var iHours = oDate.getHours();
	// 			var iMinutes = (oDate.getMinutes() + 1);
	// 			if (iMinutes >= 60) {
	// 				iMinutes = 0;
	// 				iHours++;
	// 			}
	// 			var oJob = new $.jobs.Job({
	// 				uri: "../JOBS/updateIntegrationLogStatus.xsjob"
	// 			});
	// 			oJob.schedules.add({
	// 				description: "Post status update at " + oDate.toUTCString(),
	// 				xscron: iYears + " " + iMonth + " " + iDay + " * " + iHours + " " + iMinutes + " 0"
	// 			});
	// 			oJob.activate({
	// 				user: "S0019602510",
	// 				password: "Cov@rius@hand01@"
	// 			});

	// 		} catch (errorObj) {
	// 			gvTableUpdate = "There was a problem scheduling the Job, Error: " + errorObj.message;
	// 		}
	// 	}
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
			//Delete all entries older than 30 days
			try {
				_deleteHistoricEntries();
			} catch (errorObj) {
				gvTableUpdate = "Error during deletion of historic entries:" + errorObj.message;
			}
			// 			//Schedule Job to update the Status
			// 			try {
			// 				_scheduleJob();
			// 			} catch (errorObj) {
			// 				gvTableUpdate = "Error scheduling Job to update the statuses:" + errorObj.message;
			// 			}

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