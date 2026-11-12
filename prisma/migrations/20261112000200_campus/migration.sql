-- CreateTable
CREATE TABLE "CampusResource" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "building" TEXT NOT NULL DEFAULT '',
    "floor" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "features" TEXT[],
    "accessible" BOOLEAN NOT NULL DEFAULT false,
    "opens" INTEGER NOT NULL DEFAULT 480,
    "closes" INTEGER NOT NULL DEFAULT 1200,

    CONSTRAINT "CampusResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusReservation" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "resourceId" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lateCancelAt" TIMESTAMPTZ(3),

    CONSTRAINT "CampusReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusLoan" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "resourceId" TEXT NOT NULL,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "renewals" INTEGER NOT NULL DEFAULT 0,
    "returnedAt" TIMESTAMPTZ(3),
    "remindedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CampusLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusInvite" (
    "reservationId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,

    CONSTRAINT "CampusInvite_pkey" PRIMARY KEY ("reservationId","recipientId")
);

-- CreateIndex
CREATE INDEX "CampusResource_kind_idx" ON "CampusResource"("kind");

-- CreateIndex
CREATE INDEX "CampusReservation_ownerId_endAt_idx" ON "CampusReservation"("ownerId", "endAt");

-- CreateIndex
CREATE INDEX "CampusReservation_resourceId_startAt_idx" ON "CampusReservation"("resourceId", "startAt");

-- CreateIndex
CREATE INDEX "CampusLoan_ownerId_returnedAt_idx" ON "CampusLoan"("ownerId", "returnedAt");

-- CreateIndex
CREATE INDEX "CampusLoan_dueAt_idx" ON "CampusLoan"("dueAt");

-- CreateIndex
CREATE INDEX "CampusInvite_recipientId_idx" ON "CampusInvite"("recipientId");

-- AddForeignKey
ALTER TABLE "CampusReservation" ADD CONSTRAINT "CampusReservation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CampusResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusLoan" ADD CONSTRAINT "CampusLoan_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CampusResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "CampusReservation" ADD CONSTRAINT campus_no_overlap
  EXCLUDE USING gist ("resourceId" WITH =, "unit" WITH =, tstzrange("startAt", "endAt", '[)') WITH &&)
  WHERE ("status" IN ('pending', 'confirmed'));
ALTER TABLE "CampusReservation" ADD CHECK ("endAt" > "startAt" AND "unit" > 0);
ALTER TABLE "CampusLoan" ADD CHECK ("renewals" BETWEEN 0 AND 2);

INSERT INTO "CampusResource" (id, kind, title, building, floor, position, capacity, features, accessible)
SELECT b || '-' || f || '0' || n, 'room', 'Room ' || b || '-' || f || '0' || n,
  CASE b WHEN 'A' THEN 'Main Building' ELSE 'Science Building' END, f, n - 1, n * 6,
  CASE WHEN n = 1 THEN ARRAY['whiteboard'] ELSE ARRAY['projector','whiteboard'] END, n <> 1
FROM unnest(ARRAY['A','B']) AS b CROSS JOIN generate_series(1,2) AS f CROSS JOIN generate_series(1,3) AS n;

INSERT INTO "CampusResource" (id, kind, title, capacity, features)
SELECT 'book-' || ordinal, 'book', title, 2, ARRAY[]::text[]
FROM unnest(ARRAY[
  'Introduction to Algorithms','The Algorithm Design Manual','Computer Networks','Computer Networking: A Top-Down Approach',
  'Computer Organization and Design','Digital Design and Computer Architecture','Operating Systems: Three Easy Pieces',
  'Modern Operating Systems','Introduction to Linear Algebra','Linear Algebra and Its Applications','Discrete Mathematics and Its Applications',
  'Concrete Mathematics','Numerical Analysis','Introduction to Probability','Information Theory, Inference, and Learning Algorithms',
  'Database System Concepts','Designing Data-Intensive Applications','Structure and Interpretation of Computer Programs',
  'The C Programming Language','C# in Depth','Effective Java','Clean Code','Refactoring','The Pragmatic Programmer',
  'Artificial Intelligence: A Modern Approach','Pattern Recognition and Machine Learning','Grammaire progressive du français',
  'Réussir le DELF B2','English Grammar in Use','Cambridge English First Trainer'
]) WITH ORDINALITY AS books(title, ordinal);

INSERT INTO "CampusResource" (id, kind, title, capacity, features)
SELECT 'equipment-' || ordinal, 'equipment', title, 3, ARRAY[]::text[]
FROM unnest(ARRAY['Laptop','Portable projector','USB-C adapter','HDMI cable','Webcam','Microphone','Tripod',
  'Drawing tablet','Arduino kit','Digital multimeter']) WITH ORDINALITY AS equipment(title, ordinal);

CREATE FUNCTION campus_record_late_cancellation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled'
     AND OLD."startAt" < CURRENT_TIMESTAMP + INTERVAL '1 hour' THEN
    NEW."lateCancelAt" := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER campus_late_cancellation BEFORE UPDATE OF status ON "CampusReservation"
  FOR EACH ROW EXECUTE FUNCTION campus_record_late_cancellation();

CREATE FUNCTION campus_send_loan_reminders(run_at timestamptz, only_user uuid DEFAULT NULL)
RETURNS integer LANGUAGE sql SET search_path = foundation, pg_catalog AS $$
  WITH due AS (
    UPDATE "CampusLoan"
    SET "remindedAt" = run_at
    WHERE "remindedAt" IS NULL AND "returnedAt" IS NULL
      AND "dueAt" <= run_at + INTERVAL '24 hours'
      AND (only_user IS NULL OR "ownerId" = only_user)
    RETURNING id, "ownerId", "resourceId", "dueAt"
  ), delivered AS (
    INSERT INTO "Notification" (id, "userId", type, payload, "updatedAt")
    SELECT gen_random_uuid(), due."ownerId", 'campus_loan_due',
      jsonb_build_object('loanId', due.id, 'title', resource.title, 'dueAt', due."dueAt"), run_at
    FROM due
    JOIN "User" AS account ON account.id = due."ownerId" AND account."deletedAt" IS NULL
    JOIN "CampusResource" AS resource ON resource.id = due."resourceId"
  )
  SELECT count(*)::integer FROM due;
$$;
