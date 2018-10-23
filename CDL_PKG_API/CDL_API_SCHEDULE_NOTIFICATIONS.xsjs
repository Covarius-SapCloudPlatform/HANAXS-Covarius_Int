(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-19                                         //
	// Description: REST service to be able to schedule the     //
	// alerts job.                                              //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Address to the Job File
	var gvJobUri = "../CDL_PKG_JOB/CDL_JOB_NOTIFICATIONS.xsjob";

	//Table Variables
	var gvSchemaName = '_SYS_XS',
		gvTableName = 'JOB_SCHEDULES',
		gvJobName = 'CDL_PKG_LOGGING.CDL_PKG_JOB::CDL_JOB_NOTIFICATIONS';

	//Incoming Parameters
	var gvFrequency = $.request.parameters.get('frequency'),
		gvFrequencyTime = $.request.parameters.get('time'),
		gvMethod = $.request.parameters.get('method'); //Create, Delete

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.POST) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "POST is not supported, perform a GET to schedule the notification job"
		}));
	}
	// -------------------------------------------------------- // 
	// Function to Schedule the Job                             //
	// -------------------------------------------------------- //
	function ScheduleJob() {
		var oJobId,
			oJob;

		oJob = new $.jobs.Job({
			uri: gvJobUri
		});

		//Create Schedules based on Daily Frequency and Time
		if (gvFrequency === "Daily") {
			if (gvFrequencyTime) {
			    var lvHour = gvFrequencyTime.substring(0, 2);
			    var lvMinute = gvFrequencyTime.substring(3, 5);
			    var lvSecond = gvFrequencyTime.substring(6, 8);
				var lvXscron = "* * * * " + lvHour + " " + lvMinute + " " + lvSecond;
				oJobId = oJob.schedules.add({
					description: "Job to send out Portal Notifications",
					xscron: lvXscron
				});
			} else {
				oJobId = oJob.schedules.add({
					description: "Job to send out Portal Notifications",
					xscron: "* * * * 16 0 0"
				});
			}
		}
		else {
		    oJobId = oJob.schedules.add({
					description: "Job to send out Portal Notifications",
					xscron: "* * * * 16 0 0"
				});
		}
	}
	// -------------------------------------------------------- // 
	// Function to Delete the Schedule of Job                   //
	// -------------------------------------------------------- //
	function DeleteJob() {
		var oJob,
			lvId;

		var oIds = _getListOfJobs();

		//Get the Job
		oJob = new $.jobs.Job({
			uri: gvJobUri
		});

		//Loop at List of ID's and delete scheduled Jobs
		for (var i = 0; i < oIds.length; i++) {
			lvId = parseInt(oIds[i].ID);
			//Delete the job scheduled with that ID
			oJob.schedules.delete({
				id: lvId
			});
		}
	}

	// -------------------------------------------------------- // 
	// Function to get the list of Schedules to Delete          //
	// -------------------------------------------------------- //
	function _getListOfJobs() {
		//Get the Connection to the Database
		var oConnection = $.db.getConnection();

		//Build the Query
		var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';
		lvQuery = lvQuery + ' WHERE "JOB_NAME" = ' + "'" + gvJobName + "'";

		//Prepare the SQL Statement to read the entries
		var oStatement = oConnection.prepareStatement(lvQuery);

		//Execute the Query
		var lsReturn = oStatement.executeQuery();

		//Map and Save the results
		var Jobs = [];

		while (lsReturn.next()) {
			var oEntry = {
				ID: lsReturn.getString(1),
				JOB_NAME: lsReturn.getString(2),
				XSCRON: lsReturn.getString(3)
			};
			Jobs.push(oEntry);
		}

		//Close the DB Connection
		oStatement.close();
		oConnection.close();

		//Return the records
		return Jobs;
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
				result: "POST is not supported, perform a GET to schedule the alert job"
			}));
		} else {
			try {
				if (gvMethod === "Create" || gvMethod === "CREATE") {
					DeleteJob();
					ScheduleJob();

					$.response.status = 200;
					$.response.setBody(JSON.stringify({
						message: "API Called, schedule created"
					}));
				} else if (gvMethod === "DELETE" || gvMethod === "Delete") {
					DeleteJob();

					$.response.status = 200;
					$.response.setBody(JSON.stringify({
						message: "API Called, schedule deleted"
					}));
				} else {
					$.response.status = 200;
					$.response.setBody(JSON.stringify({
						message: "API Called, but no action taken, method was not supplied"
					}));
				}

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