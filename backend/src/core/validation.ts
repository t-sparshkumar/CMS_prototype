import { AppError } from '../middleware/errorHandler.js';
import type { FieldMeta, FieldValidationRules } from '../types/field.js';

/**
 * Validate item input against field metadata and validation rules.
 */
export function validateItemInput(
  fields: FieldMeta[],
  input: Record<string, unknown>,
  isCreate: boolean,
): void {
  const errors: string[] = [];

  for (const field of fields) {
    if (field.hidden || field.type === 'alias') {
      continue;
    }

    const value = input[field.field];
    const isPresent = value !== undefined && value !== null && value !== '';

    if (isCreate && field.required && !field.is_system && isPresent === false) {
      errors.push(`Field "${field.field}" is required`);
      continue;
    }

    if (!isPresent) {
      continue;
    }

    const rules = field.validation as FieldValidationRules | null;
    if (!rules) {
      continue;
    }

    if (typeof value === 'string') {
      if (rules.min_length !== undefined && value.length < rules.min_length) {
        errors.push(`Field "${field.field}" must be at least ${rules.min_length} characters`);
      }
      if (rules.max_length !== undefined && value.length > rules.max_length) {
        errors.push(`Field "${field.field}" must be at most ${rules.max_length} characters`);
      }
      if (rules.regex) {
        try {
          const pattern = new RegExp(rules.regex);
          if (!pattern.test(value)) {
            errors.push(`Field "${field.field}" does not match required pattern`);
          }
        } catch {
          errors.push(`Field "${field.field}" has invalid validation regex`);
        }
      }
    }

    if (typeof value === 'number' || (typeof value === 'string' && !Number.isNaN(Number(value)))) {
      const num = typeof value === 'number' ? value : Number(value);
      if (rules.min !== undefined && num < rules.min) {
        errors.push(`Field "${field.field}" must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && num > rules.max) {
        errors.push(`Field "${field.field}" must be at most ${rules.max}`);
      }
    }
  }

  for (const key of Object.keys(input)) {
    if (!fields.some((f) => f.field === key)) {
      errors.push(`Field "${key}" does not exist on this collection`);
    }
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('; '), 400, 'VALIDATION_ERROR');
  }
}
