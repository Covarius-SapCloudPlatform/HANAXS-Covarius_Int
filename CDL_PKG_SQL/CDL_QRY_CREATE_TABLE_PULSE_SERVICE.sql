CREATE COLUMN TABLE "CDL_SCH_LOGGING"."CDL_PULSE_SERVICE" ("SERVICE_ID" INTEGER NOT NULL GENERATED BY DEFAULT as IDENTITY, "SERVICE_NAME" VARCHAR(100),PRIMARY KEY ("SERVICE_ID", "SERVICE_NAME"));