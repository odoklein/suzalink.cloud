// Email sync utility functions for better error handling and diagnostics

export interface EmailSyncError {
  type: 'authentication' | 'connection' | 'timeout' | 'permission' | 'server' | 'unknown';
  message: string;
  userMessage: string;
  solution: string;
  retryable: boolean;
  code?: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  error?: EmailSyncError;
  warnings?: string[];
}

export function categorizeEmailError(error: any): EmailSyncError {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';

  // Authentication errors
  if (errorMessage.includes('No supported authentication method') ||
      errorMessage.includes('Authentication failed') ||
      errorMessage.includes('Invalid credentials') ||
      errorMessage.includes('Login failed') ||
      errorMessage.includes('AUTHENTICATIONFAILED')) {
    return {
      type: 'authentication',
      message: errorMessage,
      userMessage: 'Échec d\'authentification',
      solution: 'Vérifiez vos identifiants. Pour Gmail, utilisez un mot de passe d\'application.',
      retryable: false,
      code: 'AUTH_FAILED'
    };
  }

  // Connection errors
  if (errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('Connection refused') ||
      errorMessage.includes('Connection timed out')) {
    return {
      type: 'connection',
      message: errorMessage,
      userMessage: 'Problème de connexion',
      solution: 'Vérifiez votre connexion internet et les paramètres du serveur.',
      retryable: true,
      code: 'CONN_FAILED'
    };
  }

  // Timeout errors
  if (errorMessage.includes('timeout') ||
      errorMessage.includes('TIMEOUT') ||
      errorMessage.includes('ETIMEDOUT')) {
    return {
      type: 'timeout',
      message: errorMessage,
      userMessage: 'Connexion expirée',
      solution: 'La connexion prend trop de temps. Réessayez plus tard.',
      retryable: true,
      code: 'TIMEOUT'
    };
  }

  // Permission errors
  if (errorMessage.includes('Permission denied') ||
      errorMessage.includes('Access denied') ||
      errorMessage.includes('Unauthorized')) {
    return {
      type: 'permission',
      message: errorMessage,
      userMessage: 'Permissions insuffisantes',
      solution: 'Vérifiez que votre compte a les permissions nécessaires.',
      retryable: false,
      code: 'PERMISSION_DENIED'
    };
  }

  // Server errors
  if (errorMessage.includes('Server error') ||
      errorMessage.includes('Internal server error') ||
      errorMessage.includes('503') ||
      errorMessage.includes('502')) {
    return {
      type: 'server',
      message: errorMessage,
      userMessage: 'Erreur du serveur',
      solution: 'Le serveur de messagerie rencontre des problèmes. Réessayez plus tard.',
      retryable: true,
      code: 'SERVER_ERROR'
    };
  }

  // Default unknown error
  return {
    type: 'unknown',
    message: errorMessage,
    userMessage: 'Erreur inconnue',
    solution: 'Une erreur inattendue s\'est produite. Contactez le support si le problème persiste.',
    retryable: true,
    code: 'UNKNOWN_ERROR'
  };
}

export function getProviderSpecificGuidance(provider: string): string {
  const providerGuidance: { [key: string]: string } = {
    'gmail.com': 'Pour Gmail, activez l\'authentification à deux facteurs et générez un mot de passe d\'application.',
    'outlook.com': 'Pour Outlook, utilisez votre mot de passe habituel.',
    'yahoo.com': 'Pour Yahoo, générez un mot de passe d\'application.',
    'icloud.com': 'Pour iCloud, générez un mot de passe d\'application.',
    'aol.com': 'Pour AOL, utilisez votre mot de passe habituel.',
  };

  const domain = provider.toLowerCase().split('@')[1];
  return providerGuidance[domain] || `Consultez la documentation de ${provider} pour les paramètres IMAP/SMTP.`;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const categorizedError = categorizeEmailError(error);

      // Don't retry non-retryable errors
      if (!categorizedError.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      console.log(`⏳ Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}

export function createDiagnosticReport(
  config: any,
  syncResults: SyncResult[],
  totalSynced: number,
  totalErrors: number
): any {
  const report = {
    timestamp: new Date().toISOString(),
    config: {
      id: config.id,
      email: config.email_address,
      provider: config.email_address.split('@')[1],
      imapHost: config.imap_host,
      imapPort: config.imap_port,
      smtpHost: config.smtp_host,
      smtpPort: config.smtp_port,
    },
    summary: {
      totalSynced,
      totalErrors,
      foldersSynced: syncResults.length,
      successRate: totalErrors === 0 ? 100 : Math.round((totalSynced / (totalSynced + totalErrors)) * 100)
    },
    folderResults: syncResults.map(result => ({
      folder: result.success ? 'success' : 'failed',
      synced: result.synced,
      errors: result.errors,
      error: result.error ? {
        type: result.error.type,
        userMessage: result.error.userMessage,
        solution: result.error.solution
      } : null,
      warnings: result.warnings || []
    })),
    recommendations: [] as string[]
  };

  // Generate recommendations based on results
  if (totalErrors > 0) {
    const authErrors = syncResults.filter(r => r.error?.type === 'authentication').length;
    if (authErrors > 0) {
      report.recommendations.push('Corrigez les problèmes d\'authentification en vérifiant vos identifiants.');
      report.recommendations.push(getProviderSpecificGuidance(config.email_address));
    }

    const connectionErrors = syncResults.filter(r => r.error?.type === 'connection').length;
    if (connectionErrors > 0) {
      report.recommendations.push('Vérifiez votre connexion internet et les paramètres du serveur.');
    }

    const timeoutErrors = syncResults.filter(r => r.error?.type === 'timeout').length;
    if (timeoutErrors > 0) {
      report.recommendations.push('Les délais d\'attente sont longs. Essayez pendant les heures creuses.');
    }
  }

  if (totalSynced === 0) {
    report.recommendations.push('Aucun email n\'a été synchronisé. Vérifiez vos paramètres et autorisations.');
  }

  return report;
}

export function formatSyncStatusMessage(
  totalSynced: number,
  totalErrors: number,
  provider?: string
): string {
  if (totalErrors === 0) {
    return `✅ Synchronisation réussie: ${totalSynced} email(s) synchronisé(s)`;
  } else if (totalSynced === 0) {
    return `❌ Échec de synchronisation: Aucun email synchronisé`;
  } else {
    return `⚠️ Synchronisation partielle: ${totalSynced} email(s) synchronisé(s), ${totalErrors} erreur(s)`;
  }
}

export function getHealthStatus(
  lastSync: Date | null,
  errorCount: number,
  totalSynced: number
): 'healthy' | 'warning' | 'error' {
  const now = new Date();
  const hoursSinceLastSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60) : 24;

  if (errorCount > 5 || hoursSinceLastSync > 24) {
    return 'error';
  } else if (errorCount > 0 || hoursSinceLastSync > 6) {
    return 'warning';
  } else {
    return 'healthy';
  }
}
