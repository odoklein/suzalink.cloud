import { readFileSync } from 'fs';
import { join } from 'path';

interface EmailConfig {
  IMAP_HOST: string;
  IMAP_PORT: number;
  IMAP_SECURE: boolean;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
}

let cachedConfig: EmailConfig | null = null;

export function getEmailConfig(): EmailConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = join(process.cwd(), 'emailserver.txt');
    const configContent = readFileSync(configPath, 'utf-8');
    
    const config: Partial<EmailConfig> = {};
    
    configContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, value] = trimmedLine.split('=');
        if (key && value) {
          const trimmedKey = key.trim();
          const trimmedValue = value.trim();
          
          if (trimmedKey.endsWith('_PORT')) {
            (config as any)[trimmedKey] = parseInt(trimmedValue);
          } else if (trimmedKey.endsWith('_SECURE')) {
            (config as any)[trimmedKey] = trimmedValue === 'true';
          } else {
            (config as any)[trimmedKey] = trimmedValue;
          }
        }
      }
    });

    cachedConfig = {
      IMAP_HOST: config.IMAP_HOST || 'imap.gmail.com',
      IMAP_PORT: config.IMAP_PORT || 993,
      IMAP_SECURE: config.IMAP_SECURE !== undefined ? config.IMAP_SECURE : true,
      SMTP_HOST: config.SMTP_HOST || 'smtp.gmail.com',
      SMTP_PORT: config.SMTP_PORT || 465,
      SMTP_SECURE: config.SMTP_SECURE !== undefined ? config.SMTP_SECURE : true,
    };

    return cachedConfig;
  } catch (error) {
    console.error('Failed to read email config from emailserver.txt:', error);
    
    // Fallback to environment variables if file reading fails
    cachedConfig = {
      IMAP_HOST: process.env.IMAP_HOST || 'imap.gmail.com',
      IMAP_PORT: Number(process.env.IMAP_PORT) || 993,
      IMAP_SECURE: String(process.env.IMAP_SECURE) === 'true',
      SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
      SMTP_PORT: Number(process.env.SMTP_PORT) || 465,
      SMTP_SECURE: String(process.env.SMTP_SECURE) === 'true',
    };

    return cachedConfig;
  }
}
