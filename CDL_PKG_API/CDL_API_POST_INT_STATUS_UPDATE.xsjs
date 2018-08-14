(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-07-23                                         //
	// Description: REST service to be able to update document  //
	// status in data lake tables, when an update is done on    //
	// SAP and passed through to Third Party.                   //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate;
	//Variables declaring the table details
	var gvSchemaName = 'CDL_SCH_LOGGING';
	var gvHeaderTable = 'CDL_GL_HEADER';

	// -------------------------------------------------------- // 
	// Component Declarations                                   //
	// -------------------------------------------------------- //
	//Check the Method
	if ($.request.method === $.net.http.GET) {
		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			message: "API Called",
			result: "Only POST Operation is supported, " +
				"with JSON payload to update the Sap Document Status in Covarius Data Lake."
		}));
	}

	// -------------------------------------------------------- // 
	// Function to get the Entry to be updated for Header       //
	// -------------------------------------------------------- //
	function getDBEntry() {
		//Get the Incoming Body
		var oBody = JSON.parse($.request.body.asString());

		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the entries
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT \"SAP_DOCUMENT\", \"FISCAL_YEAR\", \"COMPANY_CODE\", \"DOCUMENT_STATUS\" from \"" + gvSchemaName + "\".\"" + gvHeaderTable +
			"\" WHERE \"SAP_DOCUMENT\" = \'" + oBody.DocumentNumber + "\'" + " AND \"FISCAL_YEAR\" = \'" + oBody.FiscalYear + "\'" +
			"AND \"COMPANY_CODE\" = \'" + oBody.CompanyCode + "\'"
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Save the results
		while (rs.next()) {
			var oEntry = {
				SAP_DOCUMENT: rs.getString(1),
				FISCAL_YEAR: rs.getString(2),
				COMPANY_CODE: rs.getString(3),
				DOCUMENT_STATUS: rs.getString(4)
			};
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		//Check that entry was found
		if (!oEntry) {
			gvTableUpdate = 'No entry found in table ' + gvHeaderTable;
		}

		//Return the records
		return oEntry;

	}

	// ------------------------------------------------------------- // 
	// Function to update DB Entry for Header
	// ------------------------------------------------------------- /
	function updateDBEntries(aEntry) {
		try {
			//Get the Incoming Body
			var oBody = JSON.parse($.request.body.asString());

			//Get Database Connection
			var conn = $.db.getConnection();

			//Prepare SQL Statement to be executed
			var pstmt = conn.prepareStatement(
				"UPDATE \"" + gvSchemaName + "\".\"" + gvHeaderTable +
				"\" SET DOCUMENT_STATUS = ?, DOCUMENT_STATUS_DESCRIPTION = ?, UPDATE_GUID = ? WHERE SAP_DOCUMENT = ? AND FISCAL_YEAR = ? AND COMPANY_CODE = ?");

			//Prepare the statement
			pstmt.setString(1, oBody.DocumentStatus);
			pstmt.setString(2, oBody.DocumentStatusDescription);
			pstmt.setString(3, oBody.MESSAGE_GUID);
			pstmt.setString(4, aEntry.SAP_DOCUMENT);
			pstmt.setString(5, aEntry.FISCAL_YEAR);
			pstmt.setString(6, aEntry.COMPANY_CODE);

			pstmt.addBatch();

			//Execute the Statement and Close the connection
			pstmt.executeBatch();
			pstmt.close();
			conn.commit();
			conn.close();

			//Return Results
			gvTableUpdate = 'Entry successfully updated in table ' + gvHeaderTable + ';';

		} catch (err) {
			if (pstmt !== null) {
				pstmt.close();
			}
			if (conn !== null) {
				conn.close();
			}
			gvTableUpdate = 'Error during update of entry in table ' + gvHeaderTable + ':' + err.message + ';';
			throw new Error(err.message);
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
				result: "Only POST Operation is supported, " +
					"with JSON payload to update the Sap Document Status in Covarius Data Lake."
			}));
		} else if ($.request.method === $.net.http.POST) {
			//Get the Incoming Body
			var oBody = JSON.parse($.request.body.asString());
			//Perform Table Entry to updated in Data Lake
			try {
				if (oBody.DocumentNumber) {
					var oEntry = getDBEntry();

					if (oEntry) {
						//Header Table
						updateDBEntries(oEntry);

						$.response.status = 200;
						$.response.setBody(JSON.stringify({
							message: "API Called",
							result: gvTableUpdate
						}));
					} else {
						$.response.status = 200;
						$.response.setBody(JSON.stringify({
							message: "API Called",
							result: gvTableUpdate
						}));
					}

				}
			} catch (errorObj) {
				if (!gvTableUpdate) {
					gvTableUpdate = "Please supply the DocumentNumber, DocumentStatus, DocumentStatusDescription to perform the update via a POST";
				}
				$.response.status = 200;
				$.response.setBody(JSON.stringify({
					message: "API Called",
					result: gvTableUpdate
				}));
			}
		}
	}

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

})();