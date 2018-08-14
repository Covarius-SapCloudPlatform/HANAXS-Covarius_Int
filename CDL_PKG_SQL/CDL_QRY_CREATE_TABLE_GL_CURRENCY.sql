CREATE COLUMN TABLE "CDL_SCH_LOGGING"."CDL_GL_CURRENCY"("SAP_DOCUMENT" VARCHAR(10), "FISCAL_YEAR" VARCHAR(4), "COMPANY_CODE" VARCHAR(4), "ITEM_NO" VARCHAR(10), "CURRENCY_TYPE" VARCHAR(2), "CURRENCY" VARCHAR(5), "CURRENCY_ISO" VARCHAR(3),
"AMOUNT" NVARCHAR(23), "EXCHANGE_RATE" NVARCHAR(9), "INDIRECT_EXCHANGE_RATE" NVARCHAR(9), "AMOUNT_BASE" NVARCHAR(23),"DISCOUNT_BASE" NVARCHAR(23), "DISCOUNT_AMOUNT" NVARCHAR(23), "TAX_AMOUNT" NVARCHAR(23),"ENTRY_DATE" DATE,
PRIMARY KEY ("SAP_DOCUMENT", "FISCAL_YEAR", "COMPANY_CODE", "ITEM_NO"), FOREIGN KEY("SAP_DOCUMENT", "FISCAL_YEAR", "COMPANY_CODE") 
REFERENCES "CDL_SCH_LOGGING"."CDL_GL_HEADER" ("SAP_DOCUMENT", "FISCAL_YEAR", "COMPANY_CODE"));