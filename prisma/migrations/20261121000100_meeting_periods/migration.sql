ALTER TABLE foundation."CampusMeeting"
  ADD COLUMN IF NOT EXISTS "durationMinutes" integer NOT NULL DEFAULT 30 CHECK ("durationMinutes" IN (30, 80));

ALTER TABLE foundation."CampusMeeting"
  DROP CONSTRAINT campus_lecturer_meeting_overlap,
  ADD CONSTRAINT campus_lecturer_meeting_overlap EXCLUDE USING gist
  ("lecturerId" WITH =, tsrange("startAt" AT TIME ZONE 'UTC',
   ("startAt" AT TIME ZONE 'UTC') + "durationMinutes" * interval '1 minute', '[)') WITH &&)
  WHERE (status = 'accepted');
