import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

// Configure nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Email templates for different notification types
const getEmailTemplate = (notification: any) => {
  const templates = {
    urgent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>URGENT - ${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .urgent { background: #dc3545; color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
            .content { line-height: 1.6; color: #333; }
            .action-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="urgent">
              <h2>🚨 URGENT - ${notification.title}</h2>
            </div>
            <div class="content">
              <p>${notification.message}</p>
              ${notification.actionUrl ? `<a href="${process.env.NEXT_PUBLIC_APP_URL}${notification.actionUrl}" class="action-button">${notification.actionLabel || 'Voir les détails'}</a>` : ''}
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par Suzalink CRM.</p>
          </div>
        </body>
      </html>
    `,
    high: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #ffc107; color: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
            .content { line-height: 1.6; color: #333; }
            .action-button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚡ ${notification.title}</h2>
            </div>
            <div class="content">
              <p>${notification.message}</p>
              ${notification.actionUrl ? `<a href="${process.env.NEXT_PUBLIC_APP_URL}${notification.actionUrl}" class="action-button">${notification.actionLabel || 'Voir les détails'}</a>` : ''}
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par Suzalink CRM.</p>
          </div>
        </body>
      </html>
    `,
    medium: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #17a2b8; color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
            .content { line-height: 1.6; color: #333; }
            .action-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${notification.title}</h2>
            </div>
            <div class="content">
              <p>${notification.message}</p>
              ${notification.actionUrl ? `<a href="${process.env.NEXT_PUBLIC_APP_URL}${notification.actionUrl}" class="action-button">${notification.actionLabel || 'Voir les détails'}</a>` : ''}
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par Suzalink CRM.</p>
          </div>
        </body>
      </html>
    `,
  };

  return templates[notification.priority] || templates.medium;
};

// POST /api/notifications/send-email - Send email notification
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, notification } = body;

    if (!notificationId || !notification) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user email from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', notification.userId)
      .single();

    if (userError || !userData?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    const userEmail = userData.email;

    // Check if user has email notifications enabled
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('email_notifications, urgent_only')
      .eq('user_id', session.user.id)
      .single();

    if (preferences && !preferences.email_notifications) {
      return NextResponse.json({ message: 'Email notifications disabled for user' });
    }

    // If urgent_only is enabled, only send urgent notifications
    if (preferences?.urgent_only && notification.priority !== 'urgent') {
      return NextResponse.json({ message: 'Only urgent notifications enabled for user' });
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Suzalink CRM" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `[${notification.priority.toUpperCase()}] ${notification.title}`,
      html: getEmailTemplate(notification),
    };

    const info = await transporter.sendMail(mailOptions);

    // Log the email notification
    await supabase
      .from('notification_email_logs')
      .insert({
        notification_id: notificationId,
        user_email: userEmail,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email notification:', error);

    // Log the failed email notification
    const body = await request.json();
    if (body?.notificationId && body?.userEmail) {
      await supabase
        .from('notification_email_logs')
        .insert({
          notification_id: body.notificationId,
          user_email: body.userEmail,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sent_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      error: 'Failed to send email notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
