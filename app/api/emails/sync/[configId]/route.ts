// @ts-nocheck - IMAP library has incomplete TypeScript definitions
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import * as Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import CryptoJS from 'crypto-js';
import {
  categorizeEmailError,
  retryOperation,
  createDiagnosticReport,
  formatSyncStatusMessage,
  SyncResult
} from '@/lib/email-sync-utils';

interface EmailData {
  messageId: string;
  subject?: string;
  senderName?: string;
  senderEmail: string;
  recipientEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  emailText?: string;
  emailHtml?: string;
  sentAt: Date;
  receivedAt: Date;
}

async function fetchEmailFromImap(imapConfig: any, folderPath: string, messageId: string): Promise<EmailData | null> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: imapConfig.username,
      password: imapConfig.password,
      host: imapConfig.host,
      port: imapConfig.port,
      tls: imapConfig.secure,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
      connTimeout: 30000,
    });

    const timeout = setTimeout(() => {
      imap.end();
      resolve(null);
    }, 60000);

    imap.once('ready', () => {
      imap.openBox(folderPath, false, (err, box) => {
        if (err) {
          clearTimeout(timeout);
          imap.end();
          resolve(null);
          return;
        }

        // Search for the specific message
        imap.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
          if (err || !results || results.length === 0) {
            clearTimeout(timeout);
            imap.end();
            resolve(null);
            return;
          }

          const fetch = imap.fetch(results, { bodies: '', struct: true });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed: ParsedMail) => {
                if (err) {
                  clearTimeout(timeout);
                  imap.end();
                  resolve(null);
                  return;
                }

                const emailData: EmailData = {
                  messageId: parsed.messageId || messageId,
                  subject: parsed.subject,
                  senderName: parsed.from?.text,
                  senderEmail: parsed.from?.value[0]?.address || '',
                  recipientEmails: Array.isArray(parsed.to?.value)
                    ? parsed.to.value.map((addr: any) => addr.address || '')
                    : parsed.to?.value?.address ? [parsed.to.value.address] : [],
                  ccEmails: Array.isArray(parsed.cc?.value)
                    ? parsed.cc.value.map((addr: any) => addr.address || '')
                    : parsed.cc?.value?.address ? [parsed.cc.value.address] : [],
                  bccEmails: Array.isArray(parsed.bcc?.value)
                    ? parsed.bcc.value.map((addr: any) => addr.address || '')
                    : parsed.bcc?.value?.address ? [parsed.bcc.value.address] : [],
                  emailText: parsed.text,
                  emailHtml: parsed.html?.toString(),
                  sentAt: parsed.date || new Date(),
                  receivedAt: new Date(),
                };

                clearTimeout(timeout);
                imap.end();
                resolve(emailData);
              });
            });
          });

          fetch.once('error', () => {
            clearTimeout(timeout);
            imap.end();
            resolve(null);
          });
        });
      });
    });

    imap.once('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });

    imap.connect();
  });
}

async function syncEmailsForFolder(
  supabase: any,
  configId: string,
  userId: string,
  imapConfig: any,
  folder: any,
  lastSyncDate?: Date
): Promise<SyncResult> {
  return await retryOperation(async () => {
    return new Promise<SyncResult>((resolve) => {
      console.log(`🔄 Starting sync for folder: ${folder.folder_name}`);

      console.log(`🔌 Connecting to IMAP: ${imapConfig.username}@${imapConfig.host}:${imapConfig.port} (TLS: ${imapConfig.secure})`);

      const imap = new Imap({
        user: imapConfig.username,
        password: imapConfig.password,
        host: imapConfig.host,
        port: imapConfig.port,
        tls: imapConfig.secure,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000,
        connTimeout: 30000,
      });

      let synced = 0;
      let errors = 0;
      let warnings: string[] = [];

      const timeout = setTimeout(() => {
        console.log(`⏰ Timeout reached for folder ${folder.folder_name}`);
        imap.end();
        resolve({
          success: synced > 0,
          synced,
          errors,
          warnings
        });
      }, 180000); // 3 minute timeout per folder

      imap.once('ready', () => {
        console.log(`✅ IMAP connection ready for ${folder.folder_name}`);

        imap.openBox(folder.folder_path, false, async (err, box) => {
          if (err) {
            console.error(`❌ Error opening folder ${folder.folder_name}:`, err);
            const categorizedError = categorizeEmailError(err);

            clearTimeout(timeout);
            imap.end();
            resolve({
              success: false,
              synced: 0,
              errors: 1,
              error: categorizedError,
              warnings: [`Impossible d'ouvrir le dossier ${folder.folder_name}`]
            });
            return;
          }

          console.log(`📂 Opened folder ${folder.folder_name} - ${box.messages.total} messages`);

          // Build search criteria
          const searchCriteria = lastSyncDate
            ? [['SINCE', lastSyncDate.toISOString().split('T')[0]]]
            : ['ALL'];

          imap.search(searchCriteria, async (err, results) => {
            if (err) {
              console.error(`❌ IMAP search error for ${folder.folder_name}:`, err);
              const categorizedError = categorizeEmailError(err);

              clearTimeout(timeout);
              imap.end();
              resolve({
                success: false,
                synced: 0,
                errors: 1,
                error: categorizedError,
                warnings: [`Erreur de recherche dans ${folder.folder_name}`]
              });
              return;
            }

            const totalResults = results?.length || 0;
            console.log(`🔍 Found ${totalResults} emails in ${folder.folder_name}`);

            if (!results || results.length === 0) {
              console.log(`ℹ️ No new emails in ${folder.folder_name}`);
              clearTimeout(timeout);
              imap.end();
              resolve({
                success: true,
                synced: 0,
                errors: 0,
                warnings: [`Aucun nouvel email dans ${folder.folder_name}`]
              });
              return;
            }

            // Limit to last 50 emails per sync to avoid timeouts
            const recentResults = results.slice(-50);
            if (totalResults > 50) {
              warnings.push(`${totalResults - 50} anciens emails ignorés pour éviter les timeouts`);
            }

            console.log(`📧 Processing ${recentResults.length} recent emails in ${folder.folder_name}`);

            for (const msgId of recentResults) {
              try {
                // Fetch email headers first
                const fetch = imap.fetch(msgId, {
                  bodies: 'HEADER.FIELDS (MESSAGE-ID SUBJECT FROM TO CC DATE)',
                  struct: false
                });

                await new Promise<void>((resolveFetch) => {
                  fetch.on('message', (msg) => {
                    msg.on('body', async (stream) => {
                      const headerData = await new Promise<string>((resolveHeader) => {
                        let buffer = '';
                        stream.on('data', (chunk) => {
                          buffer += chunk.toString('utf8');
                        });
                        stream.on('end', () => resolveHeader(buffer));
                      });

                      // Parse Message-ID
                      const messageId = headerData.match(/Message-ID:\s*<(.+)>/i)?.[1] ||
                                       headerData.match(/Message-ID:\s*(.+)/i)?.[1];

                      if (!messageId) {
                        console.warn(`⚠️ No Message-ID found for email ${msgId} in ${folder.folder_name}`);
                        warnings.push(`Email sans ID ignoré dans ${folder.folder_name}`);
                        resolveFetch();
                        return;
                      }

                      // Check if email already exists
                      const { data: existing } = await supabase
                        .from('personal_emails')
                        .select('id')
                        .eq('email_config_id', configId)
                        .eq('message_id', messageId)
                        .single();

                      if (existing) {
                        console.log(`⏭️ Email already exists: ${messageId}`);
                        resolveFetch();
                        return;
                      }

                      // Fetch full email
                      const fullFetch = imap.fetch(msgId, { bodies: '', struct: true });

                      fullFetch.on('message', (fullMsg) => {
                        fullMsg.on('body', (stream) => {
                          simpleParser(stream, async (err, parsed: ParsedMail) => {
                            if (err) {
                              console.error(`❌ Error parsing email ${messageId}:`, err);
                              errors++;
                              resolveFetch();
                              return;
                            }

                            try {
                              // Save to database
                              const { error: insertError } = await supabase
                                .from('personal_emails')
                                .insert({
                                  user_id: userId,
                                  email_config_id: configId,
                                  folder_id: folder.id,
                                  message_id: parsed.messageId || messageId,
                                  subject: parsed.subject || 'Sans objet',
                                  sender_name: parsed.from?.text || '',
                                  sender_email: parsed.from?.value?.[0]?.address || '',
                              recipient_emails: Array.isArray(parsed.to?.value)
                                ? parsed.to.value.map((addr: any) => addr.address || '')
                                : parsed.to?.value?.address ? [parsed.to.value.address] : [],
                              cc_emails: Array.isArray(parsed.cc?.value)
                                ? parsed.cc.value.map((addr: any) => addr.address || '')
                                : parsed.cc?.value?.address ? [parsed.cc.value.address] : [],
                              bcc_emails: Array.isArray(parsed.bcc?.value)
                                ? parsed.bcc.value.map((addr: any) => addr.address || '')
                                : parsed.bcc?.value?.address ? [parsed.bcc.value.address] : [],
                                  email_text: parsed.text || '',
                                  email_html: typeof parsed.html === 'string' ? parsed.html : '',
                                  sent_at: parsed.date?.toISOString() || new Date().toISOString(),
                                  received_at: new Date().toISOString(),
                                });

                              if (insertError) {
                                console.error(`❌ Error saving email ${messageId}:`, insertError);
                                errors++;
                              } else {
                                synced++;
                                console.log(`✅ Saved email: ${parsed.subject} from ${parsed.from?.value?.[0]?.address}`);
                              }
                            } catch (dbError) {
                              console.error(`❌ Database error for email ${messageId}:`, dbError);
                              errors++;
                            }

                            resolveFetch();
                          });
                        });
                      });
                    });
                  });

                  fetch.on('error', (fetchError) => {
                    console.error(`❌ Fetch error for email ${msgId}:`, fetchError);
                    errors++;
                    resolveFetch();
                  });
                });

              } catch (error) {
                console.error(`❌ Error processing email ${msgId}:`, error);
                errors++;
              }
            }

            // Wait for all operations to complete
            setTimeout(() => {
              console.log(`🏁 Completed sync for ${folder.folder_name}: ${synced} synced, ${errors} errors`);
              clearTimeout(timeout);
              imap.end();
              resolve({
                success: synced > 0,
                synced,
                errors,
                warnings
              });
            }, 2000);
          });
        });
      });

      imap.once('error', (err) => {
        console.error(`❌ IMAP connection error for ${folder.folder_name}:`, {
          message: err.message,
          code: err.code,
          source: err.source,
          fullError: err
        });
        const categorizedError = categorizeEmailError(err);

        clearTimeout(timeout);
        resolve({
          success: false,
          synced: 0,
          errors: 1,
          error: categorizedError,
          warnings: [`Erreur de connexion IMAP pour ${folder.folder_name}`]
        });
      });

      imap.once('end', () => {
        console.log(`🔌 IMAP connection ended for ${folder.folder_name}`);
      });

      console.log(`🔌 Connecting to IMAP for ${folder.folder_name}...`);
      imap.connect();
    });
  }, 2, 2000); // Retry up to 2 times with 2-second delay
}

export async function POST(
  request: NextRequest,
  { params }: { params: { configId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = (await params).configId;
    const supabase = await createServerSupabaseClient();

    // Get email configuration
    const { data: config, error: configError } = await supabase
      .from('user_email_configs')
      .select('*')
      .eq('id', configId)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Email configuration not found or inactive' }, { status: 404 });
    }

    // Decrypt passwords - use same key as config creation
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.warn('⚠️  ENCRYPTION_KEY environment variable not set. Using fallback key for development.');
    }
    const finalEncryptionKey = encryptionKey || '123123123';
    console.log('🔐 Using encryption key:', encryptionKey ? '***SET***' : '***DEFAULT***');

    let imapPassword: string;
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(config.imap_password_encrypted, finalEncryptionKey);
      imapPassword = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!imapPassword) {
        console.error('❌ Password decryption failed - empty result');
        return NextResponse.json({
          error: 'Failed to decrypt email password. Please reconfigure your email settings.',
          synced: 0,
          errors: 1
        }, { status: 400 });
      }

      console.log('🔐 Password decrypted successfully, length:', imapPassword.length);
    } catch (decryptError) {
      console.error('❌ Password decryption error:', decryptError);
      return NextResponse.json({
        error: 'Failed to decrypt email password. Please reconfigure your email settings.',
        synced: 0,
        errors: 1
      }, { status: 400 });
    }

    const imapConfig = {
      host: config.imap_host,
      port: config.imap_port,
      secure: config.imap_secure,
      username: config.imap_username,
      password: imapPassword, // Use the decrypted password
    };

    // Get folders for this config
    const { data: folders, error: folderError } = await supabase
      .from('email_folders')
      .select('*')
      .eq('email_config_id', configId)
      .eq('user_id', session.user.id);

    if (folderError || !folders) {
      return NextResponse.json({ error: 'Failed to fetch email folders' }, { status: 500 });
    }

    const lastSyncDate = config.last_sync_at ? new Date(config.last_sync_at) : undefined;

    // Sync emails for each folder
    let totalSynced = 0;
    let totalErrors = 0;
    const syncResults: SyncResult[] = [];
    let hasAuthError = false;
    let hasConnectionError = false;

    console.log(`🚀 Starting email sync for ${config.email_address} (${folders.length} folders)`);

    for (const folder of folders) {
      console.log(`📁 Syncing folder: ${folder.folder_name}`);
      const result = await syncEmailsForFolder(
        supabase,
        configId,
        session.user.id,
        imapConfig,
        folder,
        lastSyncDate
      );

      syncResults.push({
        ...result,
        folder: folder.folder_name
      });

      totalSynced += result.synced;
      totalErrors += result.errors;

      // Track error types for better user feedback
      if (result.error) {
        if (result.error.type === 'authentication') {
          hasAuthError = true;
        } else if (result.error.type === 'connection') {
          hasConnectionError = true;
        }
      }

      // Update folder counts
      const { error: countError } = await supabase
        .from('email_folders')
        .update({
          message_count: result.synced,
          updated_at: new Date().toISOString(),
        })
        .eq('id', folder.id);

      if (countError) {
        console.error('Error updating folder count:', countError);
      }
    }

    // Update last sync time
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update last_sync_at if we had some success
    if (totalSynced > 0 || (totalSynced === 0 && totalErrors === 0)) {
      updateData.last_sync_at = new Date().toISOString();
    }

    await supabase
      .from('user_email_configs')
      .update(updateData)
      .eq('id', configId);

    // Create diagnostic report
    const diagnosticReport = createDiagnosticReport(
      config,
      syncResults,
      totalSynced,
      totalErrors
    );

    // Create user-friendly response
    const statusMessage = formatSyncStatusMessage(totalSynced, totalErrors, config.email_address);

    const response = {
      message: statusMessage,
      synced: totalSynced,
      errors: totalErrors,
      success: totalSynced > 0 || (totalSynced === 0 && totalErrors === 0),
      diagnostic: diagnosticReport,
      recommendations: diagnosticReport.recommendations
    };

    // Log diagnostic information
    console.log(`📊 Sync completed for ${config.email_address}:`, {
      totalSynced,
      totalErrors,
      foldersProcessed: syncResults.length,
      hasAuthError,
      hasConnectionError
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      error: 'Internal server error during email sync'
    }, { status: 500 });
  }
}
