export type ActivityHistoryRow = {
  id: string;
  title: string | null;
  description: string | null;
  activity_type: string;
  activity_status: string | null;
  call_result: string | null;
  call_category?: string | null;
  phone_number: string | null;
  next_action: string | null;
  next_action_date: string | null;
  occurred_at: string;
};

export function activityHistoryRelation({
  contactId,
  companyId,
  dealId,
}: {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
}): ['deal_id' | 'company_id' | 'contact_id', string] | null {
  if (dealId) return ['deal_id', dealId];
  if (companyId) return ['company_id', companyId];
  if (contactId) return ['contact_id', contactId];
  return null;
}

export function activityHistoryLabel(
  activity: Pick<ActivityHistoryRow, 'activity_type' | 'activity_status'>
) {
  if (activity.activity_status === 'PRZYGOTOWANO_SMS')
    return 'PRZYGOTOWANO SMS';
  if (activity.activity_type === 'telefon') return 'TELEFON';
  if (activity.activity_type === 'follow_up') return 'FOLLOW-UP';
  if (activity.activity_type === 'wiadomosc') return 'WIADOMOŚĆ';
  return activity.activity_type.replaceAll('_', ' ').toLocaleUpperCase('pl');
}
