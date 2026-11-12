-- CreateTable
CREATE TABLE "CampusMeeting" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "lecturerId" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "agenda" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response" TEXT NOT NULL DEFAULT '',
    "participants" UUID[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampusMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampusMeeting_studentId_createdAt_idx" ON "CampusMeeting"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "CampusMeeting_lecturerId_createdAt_idx" ON "CampusMeeting"("lecturerId", "createdAt");


ALTER TABLE "CampusMeeting" ADD CONSTRAINT campus_meeting_status
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));
ALTER TABLE "CampusMeeting" ADD CONSTRAINT campus_lecturer_meeting_overlap
  EXCLUDE USING gist ("lecturerId" WITH =, tsrange("startAt" AT TIME ZONE 'UTC', ("startAt" AT TIME ZONE 'UTC') + INTERVAL '30 minutes', '[)') WITH &&)
  WHERE (status = 'accepted');
