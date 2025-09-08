import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import * as Imap from 'imap';
import CryptoJS from 'crypto-js';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = (await params).id;
    const supabase = await createServerSupabaseClient();

    // Get the email configuration
    const { data: config, error: configError } = await supabase
      .from('user_email_configs')
      .select('*')
      .eq('id', configId)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found or inactive'
      }, { status: 404 });
    }

    // Decrypt password using same logic as sync
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const finalEncryptionKey = encryptionKey || '123123123';

    let imapPassword: string;
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(config.imap_password_encrypted, finalEncryptionKey);
      imapPassword = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!imapPassword) {
        return NextResponse.json({
          success: false,
          error: 'Password decryption failed - please reconfigure your email settings',
          details: 'The stored password could not be decrypted. This usually means the encryption key has changed.'
        }, { status: 400 });
      }
    } catch (decryptError) {
      console.error('Password decryption error:', decryptError);
      return NextResponse.json({
        success: false,
        error: 'Password decryption failed - please reconfigure your email settings',
        details: 'The stored password could not be decrypted. This usually means the encryption key has changed.'
      }, { status: 400 });
    }

    // Test IMAP connection
    console.log(`🔍 Testing stored IMAP config for ${config.email_address}`);

    const imapConfig = {
      host: config.imap_host,
      port: config.imap_port,
      secure: config.imap_secure,
      username: config.imap_username,
      password: imapPassword,
    };

    return new Promise((resolve) => {
      const imap = new Imap({
        user: imapConfig.username,
        password: imapConfig.password,
        host: imapConfig.host,
        port: imapConfig.port,
        tls: imapConfig.secure,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 15000,
        connTimeout: 15000,
      });

      const timeout = setTimeout(() => {
        imap.end();
        resolve(NextResponse.json({
          success: false,
          error: 'Connection timeout',
          details: 'The IMAP server did not respond within 15 seconds. Check your internet connection and server settings.',
          config: {
            host: imapConfig.host,
            port: imapConfig.port,
            secure: imapConfig.secure,
            username: imapConfig.username
          }
        }));
      }, 20000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        console.log(`✅ IMAP connection successful for ${config.email_address}`);
        imap.end();
        resolve(NextResponse.json({
          success: true,
          message: 'IMAP connection successful!',
          details: 'Your email configuration is working correctly.',
          config: {
            host: imapConfig.host,
            port: imapConfig.port,
            secure: imapConfig.secure,
            username: imapConfig.username
          }
        }));
      });

      imap.once('error', (err: any) => {
        clearTimeout(timeout);
        console.error(`❌ IMAP connection error:`, {
          message: err.message,
          code: err.code,
          source: err.source
        });
        imap.end();

        let userMessage = 'Unknown connection error';
        let troubleshooting = 'Please check your email configuration and try again.';

        if (err.message?.includes('Authentication failed') ||
            err.message?.includes('Invalid credentials') ||
            err.message?.includes('Login failed')) {
          userMessage = 'Authentication failed';
          troubleshooting = 'For Gmail, make sure you\'re using an App Password instead of your regular password.';
        } else if (err.message?.includes('ECONNREFUSED') ||
                   err.message?.includes('Connection refused')) {
          userMessage = 'Connection refused';
          troubleshooting = 'Check that the IMAP server address and port are correct.';
        } else if (err.message?.includes('certificate') ||
                   err.message?.includes('SSL')) {
          userMessage = 'SSL/TLS error';
          troubleshooting = 'Try changing the SSL setting or contact your email provider.';
        }

        resolve(NextResponse.json({
          success: false,
          error: userMessage,
          details: err.message,
          troubleshooting,
          config: {
            host: imapConfig.host,
            port: imapConfig.port,
            secure: imapConfig.secure,
            username: imapConfig.username
          }
        }, { status: 400 }));
      });

      imap.connect();
    });

  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during connection test'
    }, { status: 500 });
  }
}
