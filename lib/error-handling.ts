import { toast } from 'sonner';

// Error types for better error handling
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  FOREIGN_KEY = 'FOREIGN_KEY',
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  field?: string;
  retryable: boolean;
}

// Error classification based on error messages and codes
export function classifyError(error: any): AppError {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code;

  // PostgreSQL error codes
  if (errorCode === '23503' || errorMessage.includes('foreign key constraint')) {
    return {
      type: ErrorType.FOREIGN_KEY,
      message: 'Referenced record does not exist',
      details: 'The item you\'re trying to link to may have been deleted or doesn\'t exist.',
      retryable: false
    };
  }

  if (errorCode === '23505' || errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
    return {
      type: ErrorType.CONFLICT,
      message: 'Duplicate entry',
      details: 'An item with this information already exists.',
      retryable: false
    };
  }

  if (errorCode === '23514' || errorMessage.includes('check constraint')) {
    return {
      type: ErrorType.VALIDATION,
      message: 'Invalid data provided',
      details: 'The data doesn\'t meet the required format or constraints.',
      retryable: false
    };
  }

  // Network and connection errors
  if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
    return {
      type: ErrorType.NETWORK,
      message: 'Connection problem',
      details: 'Please check your internet connection and try again.',
      retryable: true
    };
  }

  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorCode === '42501') {
    return {
      type: ErrorType.PERMISSION,
      message: 'Access denied',
      details: 'You don\'t have permission to perform this action.',
      retryable: false
    };
  }

  // Not found errors
  if (errorMessage.includes('not found') || errorCode === '42P01') {
    return {
      type: ErrorType.NOT_FOUND,
      message: 'Item not found',
      details: 'The requested item could not be found.',
      retryable: false
    };
  }

  // Server errors (5xx)
  if (errorMessage.includes('server error') || errorMessage.includes('internal error')) {
    return {
      type: ErrorType.SERVER,
      message: 'Server error',
      details: 'Something went wrong on our end. Please try again later.',
      retryable: true
    };
  }

  // Default to unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred',
    details: errorMessage || 'Please try again or contact support if the problem persists.',
    retryable: true
  };
}

// User-friendly error messages
export function getErrorMessage(error: AppError, context?: string): { title: string; description: string } {
  const contextPrefix = context ? `${context}: ` : '';

  switch (error.type) {
    case ErrorType.FOREIGN_KEY:
      return {
        title: `${contextPrefix}Referenced item not found`,
        description: error.details || 'The item you\'re trying to link to may have been deleted.'
      };

    case ErrorType.VALIDATION:
      return {
        title: `${contextPrefix}Invalid information`,
        description: error.details || 'Please check your input and try again.'
      };

    case ErrorType.NETWORK:
      return {
        title: `${contextPrefix}Connection problem`,
        description: error.details || 'Please check your internet connection and try again.'
      };

    case ErrorType.PERMISSION:
      return {
        title: `${contextPrefix}Access denied`,
        description: error.details || 'You don\'t have permission to perform this action.'
      };

    case ErrorType.NOT_FOUND:
      return {
        title: `${contextPrefix}Not found`,
        description: error.details || 'The requested item could not be found.'
      };

    case ErrorType.CONFLICT:
      return {
        title: `${contextPrefix}Duplicate entry`,
        description: error.details || 'An item with this information already exists.'
      };

    case ErrorType.SERVER:
      return {
        title: `${contextPrefix}Server error`,
        description: error.details || 'Something went wrong on our end. Please try again later.'
      };

    default:
      return {
        title: `${contextPrefix}Unexpected error`,
        description: error.details || 'Please try again or contact support if the problem persists.'
      };
  }
}

// Toast notification helpers
export function showErrorToast(error: any, context?: string) {
  const appError = classifyError(error);
  const { title, description } = getErrorMessage(appError, context);
  
  toast.error(title, { 
    description,
    duration: appError.retryable ? 5000 : 7000
  });
  
  return appError;
}

export function showSuccessToast(message: string, description?: string) {
  toast.success(message, { 
    description,
    duration: 3000
  });
}

export function showWarningToast(message: string, description?: string) {
  toast.warning(message, { 
    description,
    duration: 4000
  });
}

// Retry mechanism for retryable errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  context?: string
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const appError = classifyError(error);
      
      // Don't retry non-retryable errors
      if (!appError.retryable) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Show retry toast on intermediate failures
      toast.info(`Attempt ${attempt} failed, retrying...`, {
        description: `Retrying ${context || 'operation'} in ${delay}ms`,
        duration: 2000
      });
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  // All retries failed, show final error
  showErrorToast(lastError, context);
  throw lastError;
}

// Error boundary helper for React components
export function handleAsyncError(error: any, context?: string): AppError {
  console.error(`Error in ${context || 'operation'}:`, error);
  
  const appError = classifyError(error);
  const { title, description } = getErrorMessage(appError, context);
  
  toast.error(title, { 
    description,
    duration: appError.retryable ? 5000 : 7000
  });
  
  return appError;
}

// Form error helpers
export function getFormErrorMessage(error: any, fieldName?: string): string {
  const appError = classifyError(error);
  
  if (fieldName && appError.field === fieldName) {
    return appError.message;
  }
  
  return appError.message;
}
