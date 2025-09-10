import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import * as nodemailer from 'nodemailer';
import CryptoJS from 'crypto-js';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      to,
      cc,
      bcc,
      subject,
      content,
      attachments,
      configId, // Optional: specific email config to use
      prospectId, // Optional: prospect ID for activity tracking
      prospectEmail, // Optional: prospect email for activity tracking
    } = body;

    const supabase = await createServerSupabaseClient();

    // Get user's email configurations
    let configQuery = supabase
      .from('user_email_configs')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    if (configId) {
      configQuery = configQuery.eq('id', configId);
    } else {
      // Use first active config if none specified
      configQuery = configQuery.limit(1);
    }

    const { data: config, error: configError } = await configQuery.single();

    if (configError || !config) {
      return NextResponse.json({ error: 'No active email configuration found' }, { status: 400 });
    }

    // Decrypt SMTP password
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const smtpPassword = CryptoJS.AES.decrypt(config.smtp_password_encrypted, encryptionKey).toString(CryptoJS.enc.Utf8);

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_username,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Prepare email data
    const mailOptions: any = {
      from: `"${config.display_name}" <${config.email_address}>`,
      to: to,
      subject: subject,
      html: content,
      text: content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    // Add CC and BCC if provided
    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;

    // Handle attachments
    if (attachments && attachments.length > 0) {
      const attachmentPromises = attachments.map(async (attachment: any) => {
        if (attachment.file) {
          // File upload
          const buffer = await attachment.file.arrayBuffer();
          return {
            filename: attachment.file.name,
            content: Buffer.from(buffer),
            contentType: attachment.file.type,
          };
        } else if (attachment.path) {
          // Existing attachment
          const { data, error } = await supabase.storage
            .from('email-attachments')
            .download(attachment.path);

          if (error) throw error;

          return {
            filename: attachment.filename,
            content: Buffer.from(await data.arrayBuffer()),
            contentType: attachment.contentType,
          };
        }
      });

      mailOptions.attachments = await Promise.all(attachmentPromises);
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Save sent email to database
    const { error: saveError } = await supabase
      .from('personal_emails')
      .insert({
        user_id: session.user.id,
        email_config_id: config.id,
        folder_id: null, // Will be set when IMAP sync runs
        message_id: info.messageId,
        subject: subject,
        sender_name: config.display_name,
        sender_email: config.email_address,
        recipient_emails: Array.isArray(to) ? to : [to],
        cc_emails: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        bcc_emails: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
        email_text: mailOptions.text,
        email_html: content,
        sent_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
        is_read: true, // Sent emails are considered read
        has_attachments: attachments && attachments.length > 0,
      });

    if (saveError) {
      console.error('Error saving sent email:', saveError);
      // Don't fail the send operation for database errors
    }

    // Log activity if this email was sent to a prospect
    if (prospectId && prospectEmail) {
      try {
        const { error: activityError } = await supabase
          .from('prospect_activities')
          .insert({
            prospect_id: prospectId,
            user_id: session.user.id,
            activity_type: 'email',
            description: `Email sent to ${prospectEmail}`,
            metadata: {
              subject: subject,
              recipient_email: prospectEmail,
              message_id: info.messageId,
              email_config_id: config.id,
            },
          });

        if (activityError) {
          console.error('Error logging prospect activity:', activityError);
          // Don't fail the send operation for activity logging errors
        }
      } catch (activityError) {
        console.error('Error logging prospect activity:', activityError);
        // Don't fail the send operation for activity logging errors
      }
    }

    return NextResponse.json({
      message: 'Email sent successfully',
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send email'
    }, { status: 500 });
  }
}

