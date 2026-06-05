-- CreateTable
CREATE TABLE "Farmer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "locationLabel" TEXT,
    "cropType" TEXT NOT NULL,
    "alertTriggers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "aiMessage" TEXT,
    "forecastDate" TEXT NOT NULL,
    "rawWeather" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Farmer_phone_key" ON "Farmer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_farmerId_triggerType_forecastDate_key" ON "Alert"("farmerId", "triggerType", "forecastDate");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
