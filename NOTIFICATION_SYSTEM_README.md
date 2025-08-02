# Notification System Documentation

## Overview

The notification system automatically sends email confirmations and reminders for booking appointments. It uses the authenticated user's email credentials to send emails through your SMTP server.

## Features

- **Automatic Email Confirmations**: When a guest books an appointment, they receive a confirmation email
- **Host Notifications**: The host receives an email notification about new bookings
- **Reminder System**: Automated reminders sent 1 hour before meetings
- **Professional Email Templates**: Clean, responsive email templates in French
- **Error Handling**: Robust error handling that doesn't break the booking process

## Setup

### 1. Database Migration

Run the migration to fix the booking-user relationship:

```sql
-- Run the migration file: supabase/migrations/fix_booking_user_relationship.sql
```

### 2. Email Configuration

Ensure your `emailserver.txt` file contains the correct SMTP settings:

```
# Email Server Configuration
IMAP_HOST=imap.titan.email
IMAP_PORT=993
IMAP_SECURE=true

# SMTP Settings (for sending emails)
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_SECURE=true
```

### 3. User Email Credentials

Each user must have their email credentials configured in the `user_email_credentials` table. The system will use these credentials to send emails on behalf of the user.

## API Endpoints

### Booking Creation
- **POST** `/api/bookings` - Creates a booking and automatically sends confirmation emails

### Reminders
- **POST** `/api/bookings/reminders` - Sends reminders for upcoming bookings (call via cron job)
- **GET** `/api/bookings/reminders` - Gets upcoming bookings that need reminders

### Testing
- **POST** `/api/bookings/test-notification` - Test the notification system with a specific booking
- **GET** `/api/bookings/test-notification?userId=xxx` - Get test booking info for a user

## Cron Job Setup

To send automated reminders, set up a cron job to call the reminders endpoint every 5 minutes:

```bash
# Add to crontab
*/5 * * * * curl -X POST https://your-domain.com/api/bookings/reminders
```

Or use the npm script:

```bash
# Add to crontab
*/5 * * * * cd /path/to/your/project && npm run send-reminders
```

## Email Templates

The system includes four email templates:

1. **Guest Confirmation** - Sent to guests when they book
2. **Host Notification** - Sent to hosts when they receive a booking
3. **Guest Reminder** - Sent to guests 1 hour before the meeting
4. **Host Reminder** - Sent to hosts 1 hour before the meeting

All templates are in French and include:
- Professional styling with proper spacing
- Meeting details (type, date, time, location, link)
- Contact information
- Responsive design

## Troubleshooting

### Common Issues

1. **"Could not find a relationship between 'bookings' and 'users'"**
   - Run the database migration: `supabase/migrations/fix_booking_user_relationship.sql`

2. **"No email credentials found for user"**
   - Ensure the user has email credentials configured in the `user_email_credentials` table

3. **Emails not sending**
   - Check SMTP settings in `emailserver.txt`
   - Verify user email credentials are correct
   - Check server logs for detailed error messages

### Testing

Use the test endpoint to verify the system is working:

```bash
# Test with a specific booking
curl -X POST https://your-domain.com/api/bookings/test-notification \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "your-booking-id"}'

# Get test booking info
curl "https://your-domain.com/api/bookings/test-notification?userId=your-user-id"
```

## File Structure

```
lib/
├── email-templates.ts          # Email template definitions
├── notification-service.ts     # Main notification service
└── email-config.ts            # Email configuration

app/api/bookings/
├── route.ts                   # Booking creation with notifications
├── reminders/
│   └── route.ts              # Reminder sending endpoint
└── test-notification/
    └── route.ts              # Testing endpoint

scripts/
└── send-reminders.ts         # Standalone reminder script

supabase/migrations/
└── fix_booking_user_relationship.sql  # Database migration
```

## Security

- All emails are sent using the authenticated user's credentials
- RLS policies ensure users can only access their own data
- Email credentials are stored securely in the database
- No sensitive data is logged

## Performance

- Email sending is asynchronous and doesn't block booking creation
- Database queries are optimized with proper indexes
- Reminder system processes bookings in batches
- Error handling prevents system failures 