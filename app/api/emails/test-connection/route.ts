import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import Imap from 'imap';
import nodemailer from 'nodemailer';

// Test IMAP connection
async function testImapConnection(config: any): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      const imap = new Imap({
        user: config.imapUsername,
        password: config.imapPassword,
        host: config.imapHost,
        port: config.imapPort,
        tls: config.imapSecure,
        tlsOptions: { rejectUnauthorized: false }, // Allow self-signed certificates
        authTimeout: 10000,
        connTimeout: 10000,
      });

      const timeout = setTimeout(() => {
        imap.end();
        resolve({ success: false, error: 'Connection timeout' });
      }, 15000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        imap.end();
        resolve({ success: true });
      });

      imap.once('error', (err: any) => {
        clearTimeout(timeout);
        imap.end();
        resolve({ success: false, error: err.message || 'IMAP connection failed' });
      });

      imap.connect();
    } catch (error: any) {
      resolve({ success: false, error: error.message || 'IMAP setup failed' });
    }
  });
}

// Test SMTP connection
async function testSmtpConnection(config: any): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUsername,
          pass: config.smtpPassword,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      });

      const timeout = setTimeout(() => {
        transporter.close();
        resolve({ success: false, error: 'SMTP connection timeout' });
      }, 15000);

      transporter.verify((error: any, success: any) => {
        clearTimeout(timeout);
        transporter.close();

        if (error) {
          resolve({ success: false, error: error.message || 'SMTP verification failed' });
        } else {
          resolve({ success: true });
        }
      });
    } catch (error: any) {
      resolve({ success: false, error: error.message || 'SMTP setup failed' });
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 POST /api/emails/test-connection - Starting...');
    const session = await auth();
    console.log('📧 Session check:', !!session?.user?.id);
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 Parsing request body...');
    const body = await request.json();
    console.log('📧 Body keys:', Object.keys(body));
    const {
      emailAddress,
      imapHost,
      imapPort,
      imapSecure,
      imapUsername,
      imapPassword,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPassword,
    } = body;

    // Validate required fields
    console.log('📧 Validating required fields...');
    const missingFields = {
      imapHost: !imapHost,
      imapUsername: !imapUsername,
      imapPassword: !imapPassword,
      smtpHost: !smtpHost,
      smtpUsername: !smtpUsername,
      smtpPassword: !smtpPassword
    };
    
    const hasMissingFields = Object.values(missingFields).some(Boolean);
    if (hasMissingFields) {
      console.log('❌ Missing required fields:', missingFields);
      return NextResponse.json({
        error: 'Missing required connection parameters',
        details: missingFields
      }, { status: 400 });
    }
    
    console.log('✅ All required fields present');

    const results = {
      imap: { success: false, error: '' },
      smtp: { success: false, error: '' },
      overall: false,
    };

    // Test IMAP connection
    console.log('Testing IMAP connection...');
    const imapResult = await testImapConnection({
      imapHost,
      imapPort: imapPort || 993,
      imapSecure: imapSecure ?? true,
      imapUsername,
      imapPassword,
    });

    results.imap = {
      success: imapResult.success,
      error: imapResult.error || '',
    };

    // Test SMTP connection
    console.log('Testing SMTP connection...');
    const smtpResult = await testSmtpConnection({
      smtpHost,
      smtpPort: smtpPort || 587,
      smtpSecure: smtpSecure ?? false,
      smtpUsername,
      smtpPassword,
    });

    results.smtp = {
      success: smtpResult.success,
      error: smtpResult.error || '',
    };

    // Overall success if both connections work
    results.overall = results.imap.success && results.smtp.success;

    const response = {
      success: results.overall,
      imap: results.imap,
      smtp: results.smtp,
      message: results.overall
        ? 'Both IMAP and SMTP connections successful!'
        : 'Connection test completed with issues. Check details below.',
    };

    return NextResponse.json(response, { status: results.overall ? 200 : 400 });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during connection test'
    }, { status: 500 });
  }
}
