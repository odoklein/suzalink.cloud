import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid UUID format');

// Project validation schemas
export const projectSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .nullable(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled', 'archived'], {
    invalid_type_error: 'Invalid project status'
  }),
  client_id: uuidSchema.optional().nullable(),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional()
    .nullable(),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional()
    .nullable(),
  budget: z.number()
    .positive('Budget must be positive')
    .max(999999999, 'Budget too large')
    .optional()
    .nullable()
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['end_date']
});

// Task validation schemas
export const taskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .nullable(),
  status: z.enum(['todo', 'doing', 'done'], {
    invalid_type_error: 'Invalid task status'
  }),
  priority: z.enum(['low', 'medium', 'high'], {
    invalid_type_error: 'Invalid task priority'
  }),
  project_id: uuidSchema,
  assignee_id: uuidSchema.optional().nullable(),
  created_by: uuidSchema,
  due_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional()
    .nullable()
}).refine(data => {
  if (data.due_date) {
    const dueDate = new Date(data.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate >= today;
  }
  return true;
}, {
  message: 'Due date cannot be in the past',
  path: ['due_date']
});

// Validation result types
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: Record<string, string[]>;
  message: string;
};

// Validation helper functions
export function validateProject(data: unknown): ValidationResult<z.infer<typeof projectSchema>> {
  try {
    const result = projectSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.reduce((acc: Record<string, string[]>, err) => {
        const path = err.path.join('.');
        if (!acc[path]) acc[path] = [];
        acc[path].push(err.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return {
        success: false,
        errors,
        message: 'Validation failed: ' + Object.values(errors).flat().join(', ')
      };
    }
    return {
      success: false,
      errors: { general: ['Unknown validation error'] },
      message: 'Unknown validation error occurred'
    };
  }
}

export function validateTask(data: unknown): ValidationResult<z.infer<typeof taskSchema>> {
  try {
    const result = taskSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.reduce((acc: Record<string, string[]>, err) => {
        const path = err.path.join('.');
        if (!acc[path]) acc[path] = [];
        acc[path].push(err.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return {
        success: false,
        errors,
        message: 'Validation failed: ' + Object.values(errors).flat().join(', ')
      };
    }
    return {
      success: false,
      errors: { general: ['Unknown validation error'] },
      message: 'Unknown validation error occurred'
    };
  }
}

// Database existence validation helpers
export async function validateProjectExists(projectId: string, supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
}

export async function validateUserExists(userId: string, supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
}

export async function validateClientExists(clientId: string, supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
}

// Form validation helpers for React
export function getFieldError(errors: Record<string, string[]>, fieldName: string): string | undefined {
  return errors[fieldName]?.[0];
}

export function hasFieldError(errors: Record<string, string[]>, fieldName: string): boolean {
  return !!errors[fieldName]?.length;
}
