-- CreateTable
CREATE TABLE "ContactGroup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CampaignGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CampaignGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContactGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContactGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroup_eventId_name_key" ON "ContactGroup"("eventId", "name");

-- CreateIndex
CREATE INDEX "_CampaignGroups_B_index" ON "_CampaignGroups"("B");

-- CreateIndex
CREATE INDEX "_ContactGroups_B_index" ON "_ContactGroups"("B");

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignGroups" ADD CONSTRAINT "_CampaignGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignGroups" ADD CONSTRAINT "_CampaignGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactGroups" ADD CONSTRAINT "_ContactGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactGroups" ADD CONSTRAINT "_ContactGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
