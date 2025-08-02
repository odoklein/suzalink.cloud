import { supabase } from './supabase';
import { getUserEmailCredentials } from './user-email-credentials';
import { getEmailConfig } from './email-config';
import { emailTemplates, EmailTemplateData } from './email-templates';
import nodemailer from 'nodemailer';

export interface BookingData {
  id: string;
  meeting_type_id: string;
  host_user_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  start_time: string;
  end_time: string;
  notes?: string;
  meeting_link?: string;
  location?: string;
  meeting_types: {
    name: string;
    duration_minutes: number;
  };
  users: {
    full_name: string;
    email: string;
  };
}

export class NotificationService {
  private static async ensureUserExists(userId: string) {
    // Check if user exists in public.users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      // Get user data from auth.users
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      
      if (authUser?.user) {
        // Insert user into public.users table
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || 'User',
            role: 'user'
          })
          .select('id, email, full_name')
          .single();

        if (error) {
          console.error('Error creating user record:', error);
          // Return a fallback user object
          return {
            id: userId,
            email: authUser.user.email || 'unknown@example.com',
            full_name: authUser.user.user_metadata?.full_name || 'User'
          };
        }

        return newUser;
      }
    }

    return existingUser;
  }

  private static async getTransporter(userId: string) {
    const creds = await getUserEmailCredentials(userId);
    if (!creds) {
      throw new Error('No email credentials found for user');
    }

    const emailConfig = getEmailConfig();
    return nodemailer.createTransport({
      host: emailConfig.SMTP_HOST,
      port: emailConfig.SMTP_PORT,
      secure: emailConfig.SMTP_SECURE,
      auth: {
        user: creds.smtp_username,
        pass: creds.smtp_password,
      },
    });
  }

  private static async sendEmail(
    userId: string,
    to: string,
    subject: string,
    html: string,
    text: string
  ) {
    const transporter = await this.getTransporter(userId);
    const creds = await getUserEmailCredentials(userId);
    
    if (!creds) {
      throw new Error('No email credentials found for user');
    }

    const info = await transporter.sendMail({
      from: creds.smtp_username,
      to,
      subject,
      html,
      text,
    });

    return info;
  }

  private static formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private static formatDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h${minutes}` : `${hours}h`;
    }
  }

  static async sendBookingConfirmation(bookingData: BookingData) {
    try {
      // Ensure user data exists
      const userData = await this.ensureUserExists(bookingData.host_user_id);
      
      const templateData: EmailTemplateData = {
        guestName: bookingData.guest_name,
        guestEmail: bookingData.guest_email,
        hostName: userData?.full_name || bookingData.users?.full_name || 'Host',
        hostEmail: userData?.email || bookingData.users?.email || 'host@example.com',
        meetingType: bookingData.meeting_types.name,
        startTime: this.formatDateTime(bookingData.start_time),
        endTime: this.formatDuration(bookingData.start_time, bookingData.end_time),
        meetingLink: bookingData.meeting_link,
        location: bookingData.location,
        notes: bookingData.notes,
        bookingId: bookingData.id,
      };

      // Send confirmation to guest
      const guestTemplate = emailTemplates.guestConfirmation(templateData);
      await this.sendEmail(
        bookingData.host_user_id,
        bookingData.guest_email,
        guestTemplate.subject,
        guestTemplate.html,
        guestTemplate.text
      );

      // Send notification to host
      const hostTemplate = emailTemplates.hostNotification(templateData);
      await this.sendEmail(
        bookingData.host_user_id,
        templateData.hostEmail,
        hostTemplate.subject,
        hostTemplate.html,
        hostTemplate.text
      );

      // Update notification records
      await supabase
        .from('booking_notifications')
        .insert([
          {
            booking_id: bookingData.id,
            type: 'confirmation',
            sent_to: 'guest',
            email_sent: true,
          },
          {
            booking_id: bookingData.id,
            type: 'confirmation',
            sent_to: 'host',
            email_sent: true,
          },
        ]);

      return { success: true };
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      throw error;
    }
  }

  static async sendBookingReminder(bookingData: BookingData) {
    try {
      // Ensure user data exists
      const userData = await this.ensureUserExists(bookingData.host_user_id);
      
      const templateData: EmailTemplateData = {
        guestName: bookingData.guest_name,
        guestEmail: bookingData.guest_email,
        hostName: userData?.full_name || bookingData.users?.full_name || 'Host',
        hostEmail: userData?.email || bookingData.users?.email || 'host@example.com',
        meetingType: bookingData.meeting_types.name,
        startTime: this.formatDateTime(bookingData.start_time),
        endTime: this.formatDuration(bookingData.start_time, bookingData.end_time),
        meetingLink: bookingData.meeting_link,
        location: bookingData.location,
        notes: bookingData.notes,
        bookingId: bookingData.id,
      };

      // Send reminder to guest
      const guestTemplate = emailTemplates.guestReminder(templateData);
      await this.sendEmail(
        bookingData.host_user_id,
        bookingData.guest_email,
        guestTemplate.subject,
        guestTemplate.html,
        guestTemplate.text
      );

      // Send reminder to host
      const hostTemplate = emailTemplates.hostReminder(templateData);
      await this.sendEmail(
        bookingData.host_user_id,
        templateData.hostEmail,
        hostTemplate.subject,
        hostTemplate.html,
        hostTemplate.text
      );

      // Update notification records
      await supabase
        .from('booking_notifications')
        .insert([
          {
            booking_id: bookingData.id,
            type: 'reminder',
            sent_to: 'guest',
            email_sent: true,
          },
          {
            booking_id: bookingData.id,
            type: 'reminder',
            sent_to: 'host',
            email_sent: true,
          },
        ]);

      return { success: true };
    } catch (error) {
      console.error('Error sending booking reminder:', error);
      throw error;
    }
  }

  static async getUpcomingBookingsForReminders() {
    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
    
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        meeting_types (
          name,
          duration_minutes
        ),
        users!host_user_id (
          full_name,
          email
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', oneHourFromNow.toISOString())
      .lt('start_time', new Date(oneHourFromNow.getTime() + 5 * 60 * 1000).toISOString()); // Within 5 minutes of 1 hour before

    if (error) {
      throw error;
    }

    return bookings;
  }
} 