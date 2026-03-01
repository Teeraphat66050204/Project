-- CreateTable
CREATE TABLE "BookingConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "pickupLocation" TEXT,
    "emailTo" TEXT NOT NULL,
    "emailStatus" TEXT NOT NULL DEFAULT 'SENT',
    "emailSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingConfirmation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingConfirmation_bookingId_key" ON "BookingConfirmation"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingConfirmation_receiptNo_key" ON "BookingConfirmation"("receiptNo");
