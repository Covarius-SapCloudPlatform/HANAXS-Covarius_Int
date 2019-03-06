CREATE COLUMN TABLE "CDL_SCH_LOGGING"."CDL_PULSE_ALERT_CONFIG" ("ID" INTEGER NOT NULL GENERATED BY DEFAULT as IDENTITY, "HUB_INTEGRATION" VARCHAR(5),"ON_OFF" VARCHAR(3), "ALERT_TYPE" VARCHAR(5),"ALERT_RETENTION_DAYS" INTEGER, "PORTAL_NOTIFICATION" VARCHAR(5),
"PORTAL_NOTIFICATION_FREQUENCY" VARCHAR(6), "HUB_INTEGRATION_API" VARCHAR(5000),
PRIMARY KEY ("ID"));