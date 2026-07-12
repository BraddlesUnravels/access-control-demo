export type ConsultationStatus = 'scheduled' | 'completed' | 'cancelled';

export type ConsultationRecord = {
  id: string;
  student_user_id: string;
  first_name: string;
  last_name: string;
  reason: string;
  scheduled_for: string;
  status: ConsultationStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};
