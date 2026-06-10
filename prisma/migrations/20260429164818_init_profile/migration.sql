-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "favoriteTeamId" INTEGER,
    "followedLeagues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "watchedTeams" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "watchedPlayers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "style" TEXT DEFAULT 'balanced',
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
