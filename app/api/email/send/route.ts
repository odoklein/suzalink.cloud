import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailCredentials } from '@/lib/user-email-credentials';
import { getEmailConfig } from '@/lib/email-config';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, to, subject, text, html } = body;
    if (!userId || !to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const creds = await getUserEmailCredentials(userId);
    if (!creds) {
      return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
    }
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport({
      host: emailConfig.SMTP_HOST,
      port: emailConfig.SMTP_PORT,
      secure: emailConfig.SMTP_SECURE,
      auth: {
        user: creds.smtp_username,
        pass: creds.smtp_password,
      },
    });
    const info = await transporter.sendMail({
      from: creds.smtp_username,
      to,
      subject,
      text,
      html,
    });
    return NextResponse.json({ success: true, info }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
