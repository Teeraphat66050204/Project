import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function sendConfirmationEmail(input: {
  to: string;
  subject: string;
  bookingId: string;
  receiptNo: string;
  carName: string;
  pickupAt: string;
  returnAt: string;
  location: string;
  total: number;
}) {
  const outboxDir = path.join(process.cwd(), "tmp", "email-outbox");
  await mkdir(outboxDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const fileName = `${input.receiptNo}.txt`;
  const filePath = path.join(outboxDir, fileName);

  const content = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    `SentAt: ${timestamp}`,
    "",
    `Booking ID: ${input.bookingId}`,
    `Receipt No: ${input.receiptNo}`,
    `Car: ${input.carName}`,
    `Pickup: ${input.pickupAt}`,
    `Return: ${input.returnAt}`,
    `Location: ${input.location || "-"}`,
    `Total: ${input.total.toLocaleString()} Baht`,
  ].join("\n");

  await writeFile(filePath, content, "utf8");
  return { status: "SENT" as const, sentAt: timestamp, outboxFile: filePath };
}
