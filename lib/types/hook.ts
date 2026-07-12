export type CreateConsultationForm = {
  firstName: string;
  lastName: string;
  reason: string;
  scheduledFor: string;
};

export type ConsultationRecord = {
  id: string;
  first_name: string;
  last_name: string;
  reason: string;
  scheduled_for: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};
