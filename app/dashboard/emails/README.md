# Email Management System

A comprehensive email management system built on top of the existing email APIs. This system provides a modern, Gmail-like interface for managing personal emails.

## Features

### 📧 Email Management
- **Multi-account support**: Connect multiple email accounts (Gmail, Outlook, Yahoo, etc.)
- **Folder navigation**: Browse through Inbox, Sent, Drafts, Trash, and Spam folders
- **Message viewing**: Read emails with HTML and plain text support
- **Search functionality**: Search through emails by subject, sender, or content
- **Email composition**: Create and send new emails with attachments
- **Reply functionality**: Reply to emails with original message context
- **Draft management**: Save and manage email drafts

### 🔧 Configuration Management
- **Easy setup**: Step-by-step email account configuration
- **Connection testing**: Test IMAP/SMTP connections before saving
- **Provider presets**: Pre-configured settings for popular email providers
- **Security**: Encrypted password storage with AES-256 encryption
- **Multiple accounts**: Support for multiple email accounts per user

### 🔄 Synchronization
- **Real-time sync**: Manual and automatic email synchronization
- **Status indicators**: Visual feedback for sync operations
- **Error handling**: Graceful error handling with user-friendly messages
- **Progress tracking**: Track sync progress and results

## Components

### Main Components
- **`page.tsx`**: Main email interface with folder navigation and message list
- **`EmailConfigModal.tsx`**: Modal for adding and configuring email accounts
- **`EmailComposer.tsx`**: Email composition interface with attachment support
- **`EmailSetupGuide.tsx`**: Onboarding guide for new users

### Key Features
- **Responsive design**: Works on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface using shadcn/ui components
- **Real-time updates**: Live updates when emails are synced or sent
- **Error handling**: Comprehensive error handling with toast notifications
- **Loading states**: Proper loading indicators for all async operations

## API Integration

The email system integrates with the following APIs:

- **`/api/emails/config`**: Email configuration management
- **`/api/emails/folders`**: Folder management
- **`/api/emails/messages`**: Message retrieval and management
- **`/api/emails/send`**: Email sending
- **`/api/emails/drafts`**: Draft management
- **`/api/emails/sync/[configId]`**: Email synchronization
- **`/api/emails/test-connection`**: Connection testing

## Usage

### Setting Up Email Accounts
1. Navigate to the Email section in the dashboard
2. Click "Add Email Account" if no accounts are configured
3. Follow the setup guide for your email provider
4. Enter your email credentials and test the connection
5. Save the configuration to start syncing emails

### Managing Emails
1. Use the folder navigation to browse different email folders
2. Click on any email to read it
3. Use the search bar to find specific emails
4. Click "Compose" to create new emails
5. Use "Reply" to respond to emails

### Synchronization
1. Click the sync button next to any email account
2. Monitor the sync progress and results
3. Emails will be automatically organized into folders

## Security

- All email passwords are encrypted using AES-256 encryption
- Passwords are never stored in plain text
- Secure connections (SSL/TLS) are used for all email operations
- User authentication is required for all email operations

## Supported Email Providers

- **Gmail**: Requires App Password (2FA must be enabled)
- **Outlook/Hotmail**: Uses regular password
- **Yahoo**: Requires App Password
- **Custom IMAP/SMTP**: Any provider with IMAP/SMTP support

## Technical Details

- Built with Next.js 14 and React
- Uses TypeScript for type safety
- Styled with Tailwind CSS and shadcn/ui components
- Integrates with Supabase for data storage
- Uses Nodemailer for email operations
- Implements proper error handling and loading states
