import { useState, useCallback } from 'react';
import { ValidationResult } from '@/lib/validation';

export interface FormState {
  isSubmitting: boolean;
  isDirty: boolean;
  errors: Record<string, string[]>;
  touchedFields: Set<string>;
}

export interface UseFormStateOptions<T> {
  initialValues: T;
  validate?: (values: T) => ValidationResult<T>;
  onSubmit?: (values: T) => Promise<void>;
}

export function useFormState<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit
}: UseFormStateOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    isDirty: false,
    errors: {},
    touchedFields: new Set()
  });

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setFormState(prev => ({
      ...prev,
      isDirty: true,
      touchedFields: new Set(prev.touchedFields).add(field as string),
      // Clear field error when user starts typing
      errors: {
        ...prev.errors,
        [field as string]: []
      }
    }));
  }, []);

  const setFieldError = useCallback((field: string, errors: string[]) => {
    setFormState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: errors
      }
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      errors: {}
    }));
  }, []);

  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;
    setValues(resetValues);
    setFormState({
      isSubmitting: false,
      isDirty: false,
      errors: {},
      touchedFields: new Set()
    });
  }, [initialValues]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Don't submit if already submitting
    if (formState.isSubmitting) {
      return;
    }

    setFormState(prev => ({
      ...prev,
      isSubmitting: true,
      errors: {}
    }));

    try {
      // Validate if validator provided
      if (validate) {
        const validationResult = validate(values);
        if (!validationResult.success) {
          setFormState(prev => ({
            ...prev,
            isSubmitting: false,
            errors: validationResult.errors
          }));
          return;
        }
      }

      // Submit if handler provided
      if (onSubmit) {
        await onSubmit(values);
      }

      // Success - reset dirty state but keep values
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isDirty: false
      }));
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        isSubmitting: false
      }));
      throw error; // Re-throw to allow caller to handle
    }
  }, [values, validate, onSubmit, formState.isSubmitting]);

  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(field, e.target.value);
    },
    onBlur: () => {
      setFormState(prev => ({
        ...prev,
        touchedFields: new Set(prev.touchedFields).add(field as string)
      }));
    },
    error: formState.errors[field as string]?.[0],
    disabled: formState.isSubmitting
  }), [values, formState.errors, formState.isSubmitting, setValue]);

  const getSelectProps = useCallback((field: keyof T) => ({
    value: values[field] || '',
    onValueChange: (value: string) => {
      setValue(field, value);
    },
    disabled: formState.isSubmitting
  }), [values, formState.isSubmitting, setValue]);

  const hasError = useCallback((field: string) => {
    return !!formState.errors[field]?.length;
  }, [formState.errors]);

  const getError = useCallback((field: string) => {
    return formState.errors[field]?.[0];
  }, [formState.errors]);

  const isFieldTouched = useCallback((field: string) => {
    return formState.touchedFields.has(field);
  }, [formState.touchedFields]);

  const hasAnyError = Object.keys(formState.errors).some(key => formState.errors[key].length > 0);
  const canSubmit = !formState.isSubmitting && !hasAnyError && formState.isDirty;

  return {
    values,
    formState,
    setValue,
    setFieldError,
    clearErrors,
    reset,
    handleSubmit,
    getFieldProps,
    getSelectProps,
    hasError,
    getError,
    isFieldTouched,
    hasAnyError,
    canSubmit
  };
}
