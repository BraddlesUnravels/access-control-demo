export type ConsultationStatus = 'scheduled' | 'completed' | 'cancelled';

export type CreateConsultationInput = {
  firstName: string;
  lastName: string;
  reason: string;
  scheduledFor: string;
};

export type UpdateConsultationInput = {
  scheduledFor?: string;
  status?: Exclude<ConsultationStatus, 'cancelled'>;
};

type ValidationResult<T> = { data: T; error?: never } | { error: string; data?: never };

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const isValidIsoDateString = (value: string): boolean => {
  return !Number.isNaN(Date.parse(value));
};

export const validateCreateConsultationInput = (
  value: unknown,
): ValidationResult<CreateConsultationInput> => {
  if (!value || typeof value !== 'object') return { error: 'Request body must be an object' };

  const payload = value as Record<string, unknown>;
  const firstName = payload.firstName;
  const lastName = payload.lastName;
  const reason = payload.reason;
  const scheduledFor = payload.scheduledFor;

  if (!isNonEmptyString(firstName)) return { error: 'First name is required' };
  if (!isNonEmptyString(lastName)) return { error: 'Last name is required' };
  if (!isNonEmptyString(reason)) return { error: 'Reason is required' };
  if (!isNonEmptyString(scheduledFor)) return { error: 'Scheduled time is required' };
  if (!isValidIsoDateString(scheduledFor)) return { error: 'Scheduled time must be a valid date' };

  return {
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      reason: reason.trim(),
      scheduledFor,
    },
  };
};

export const validateUpdateConsultationInput = (
  value: unknown,
): ValidationResult<UpdateConsultationInput> => {
  if (!value || typeof value !== 'object') return { error: 'Request body must be an object' };

  const payload = value as Record<string, unknown>;
  const scheduledFor = payload.scheduledFor;
  const status = payload.status;

  const hasScheduledFor = typeof scheduledFor !== 'undefined';
  const hasStatus = typeof status !== 'undefined';

  if (!hasScheduledFor && !hasStatus) {
    return { error: 'At least one field is required: scheduledFor or status' };
  }

  if (hasScheduledFor) {
    if (!isNonEmptyString(scheduledFor)) return { error: 'Scheduled time must be a valid date' };
    if (!isValidIsoDateString(scheduledFor)) {
      return { error: 'Scheduled time must be a valid date' };
    }
  }

  if (hasStatus && status !== 'scheduled' && status !== 'completed') {
    return { error: 'Status must be scheduled or completed' };
  }

  return {
    data: {
      scheduledFor: hasScheduledFor ? (scheduledFor as string) : undefined,
      status: hasStatus ? (status as 'scheduled' | 'completed') : undefined,
    },
  };
};
