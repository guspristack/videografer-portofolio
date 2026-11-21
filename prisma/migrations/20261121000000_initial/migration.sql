-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Film" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "posterAlt" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "visualSource" TEXT NOT NULL,
    "soundCredit" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "videoFile" TEXT,
    "posterFile" TEXT,
    "captions" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Film_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmCredit" (
    "id" SERIAL NOT NULL,
    "filmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "studio" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "FilmCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "Film_slug_key" ON "Film"("slug");

-- CreateIndex
CREATE INDEX "Film_published_position_idx" ON "Film"("published", "position");

-- CreateIndex
CREATE INDEX "FilmCredit_filmId_position_idx" ON "FilmCredit"("filmId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "session_expire_idx" ON "session"("expire");

-- AddForeignKey
ALTER TABLE "FilmCredit" ADD CONSTRAINT "FilmCredit_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;
