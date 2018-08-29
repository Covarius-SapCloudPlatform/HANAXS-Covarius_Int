(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-08-15                                         //
	// Description: REST service to be able to retrieve the     //
	// statistics of the latest posting date found. Or based    //
	// on the postingDate that has been passed in.              //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate;
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvHeaderTable = 'CDL_GL_HEADER';
	var gvMasterTable = "CDL_GL_MASTER";
	//Variable for Latest Posting Date
	var gvPostingDate = $.request.parameters.get('postingDate');

	//Variables for Carrying Statistics totals
	var gvPosted = 0,
		gvParked = 0,
		gvRejected = 0,
		gvAcknowledged = 0,
		gvSent = 0,
		gvRecord = {};

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.POST) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "POST is not supported, perform a GET to read the latest Posting Statistics"
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
		var lvMessageGuid,
			lvUpdateGuid;

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT \"MESSAGE_GUID\", \"UPDATE_GUID\" FROM \"" + gvSchemaName + "\".\"" + gvHeaderTable + "\"" + "WHERE \"POSTING_DATE\"=" + "'" +
			gvPostingDate + "'"
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			lvMessageGuid = rs.getString(1);
			lvUpdateGuid = rs.getString(2);
			_getStatistics(lvMessageGuid, lvUpdateGuid);
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();
	}

	// ------------------------------------------------------------- // 
	// Function to retrieve Status Records                          //
	// ------------------------------------------------------------- //
	function _getStatistics(messageGuid, updateGuid) {
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT \"STATUS\" FROM \"" + gvSchemaName + "\".\"" + gvMasterTable + "\"" +
			"WHERE \"MESSAGE_GUID\"=" + "'" + messageGuid + "'" +
			"OR \"MESSAGE_GUID\"=" + "'" + updateGuid + "'"
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			if (rs.getString(1) == "PARKED") {
				gvParked = gvParked + 1;
			} else if (rs.getString(1) == "POSTED") {
				gvPosted = gvPosted + 1;
			} else if (rs.getString(1) == "REJECTED") {
				gvRejected = gvRejected + 1;
			} else if (rs.getString(1) == "ACKNOWLEDGED") {
				gvAcknowledged = gvAcknowledged + 1;
			} else if (rs.getString(1) == "SENT") {
				gvSent = gvSent + 1;
			}
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

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
				result: "POST is not supported, perform a GET to read the latest Posting Statistics"
			}));
		} else {
			try {
				//Get the lates Posting Date if it has not been passed in
				if (!gvPostingDate || gvPostingDate === "") {
					getLatestPostingDate();
				}
				//Calculate Statistics
				getEntries();

				var gvRecord = {
					POSTING_DATE: gvPostingDate,
					PARKED: gvParked,
					POSTED: gvPosted,
					REJECTED: gvRejected,
					SENT: gvSent,
					ACKNOWLEDGED: gvAcknowledged
				};

				$.response.status = 200;
				$.response.setBody(JSON.stringify({
					message: "API Called",
					record: gvRecord
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