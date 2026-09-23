ALTER TABLE "OperationalSettings" ADD COLUMN "destinationCountries" TEXT[] NOT NULL DEFAULT ARRAY['Burkina Faso', 'Mali', 'Niger']::TEXT[];
