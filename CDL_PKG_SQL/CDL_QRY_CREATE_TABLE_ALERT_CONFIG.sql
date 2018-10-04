CREATE COLUMN TABLE "CDL_SCH_LOGGING"."CDL_PULSE_ALERT_CONFIG" ("ID" INTEGER NOT NULL GENERATED BY DEFAULT as IDENTITY, "HUB_INTEGRATION" VARCHAR(5),"ON_OFF" VARCHAR(3), "ALERT_TYPE" VARCHAR(5), "FREQUENCY" VARCHAR(7), "FREQUENCY_VALUE" VARCHAR(50), "ALERT_RETENTION_DAYS" INTEGER,
PRIMARY KEY ("ID"));