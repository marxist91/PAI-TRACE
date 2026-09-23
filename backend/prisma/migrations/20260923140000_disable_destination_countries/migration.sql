ALTER TABLE "OperationalSettings" ADD COLUMN "disabledDestinationCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
