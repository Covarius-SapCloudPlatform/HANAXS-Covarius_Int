CREATE COLUMN TABLE "CDL_SCH_LOGGING"."CDL_GL_HEADER"("SAP_DOCUMENT" VARCHAR(10), "FISCAL_YEAR" VARCHAR(4), "COMPANY_CODE" VARCHAR(4), "MESSAGE_GUID" VARCHAR(30),"REFERENCE_KEY" VARCHAR(20),"BUSINESS_TRANSACTION" VARCHAR(4), "HEADERTEXT" VARCHAR(25), 
"DOCUMENT_DATE" VARCHAR(10), "POSTING_DATE" VARCHAR(10), "TRANSLATION_DATE" VARCHAR(10),  "FISCAL_PERIOD" VARCHAR(2), "DOCUMENT_TYPE" VARCHAR(10), "REFERENCE_DOCUMENT" VARCHAR(16), "REFERENCE_DOC_NO_LONG" VARCHAR(35), "ACCOUNTING_PRINCIPLE" VARCHAR(4), 
"BILLING_CATEGORY" VARCHAR(10), "STATUS_CODE" VARCHAR(8),"STATUS_MESSAGE" TEXT,"DOCUMENT_STATUS" VARCHAR(1), "DOCUMENT_STATUS_DESCRIPTION" VARCHAR(100), "POST_INDICATOR" VARCHAR(5), "ACCOUNT_TYPE" VARCHAR(40), "ENTRY_DATE" DATE, "UPDATE_GUID" VARCHAR(30),
PRIMARY KEY ("SAP_DOCUMENT", "FISCAL_YEAR", "COMPANY_CODE"));