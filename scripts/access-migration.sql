BEGIN;
CREATE TABLE IF NOT EXISTS admin_access (
  "userId" text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role varchar(30) NOT NULL,
  "grantedAt" timestamp NOT NULL DEFAULT now(),
  "grantedBy" text NOT NULL,
  "revokedAt" timestamp
);
CREATE TABLE IF NOT EXISTS access_events (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "userId" text NOT NULL,
  action varchar(30) NOT NULL,
  actor text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
COMMIT;
