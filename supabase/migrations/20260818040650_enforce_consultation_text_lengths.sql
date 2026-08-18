alter table public.consultations
add constraint consultations_first_name_max_length
check (char_length(first_name) <= 100),
add constraint consultations_last_name_max_length
check (char_length(last_name) <= 100),
add constraint consultations_reason_max_length
check (char_length(reason) <= 2000);
