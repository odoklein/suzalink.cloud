import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  // Parse form data (for attachments)
  const formData = await req.formData();
  const from = formData.get("from") as string;
  const to = formData.get("to") as string;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  const cc = formData.get("cc") as string | null;
  const bcc = formData.get("bcc") as string | null;
  const files = formData.getAll("attachments");

  if (!from) {
    return NextResponse.json({ error: "Missing sender email (from)" }, { status: 400 });
  }

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Titan SMTP credentials: user = sender's email, pass = fixed password
  const transporter = nodemailer.createTransport({
    host: "smtp.titan.email",
    port: 465,
    secure: true,
    auth: {
      user: from,
      pass: process.env.TITAN_EMAIL_PASSWORD, 
    },
  });

  // Prepare attachments
  const attachments = [];
  for (const file of files) {
    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        content: buffer,
        contentType: file.type,
      });
    }
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      html: body,
      attachments,
    });
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
