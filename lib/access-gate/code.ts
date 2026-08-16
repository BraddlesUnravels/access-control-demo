export const ACCESS_INVITE_CODE_LENGTH = 15;
export const ACCESS_INVITE_CODE_RAW_LENGTH = 18;

export const formatInviteCode = (value: string) => {
  const raw = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ACCESS_INVITE_CODE_RAW_LENGTH);

  return [
    raw.slice(0, 3),
    raw.slice(3, 7),
    raw.slice(7, 11),
    raw.slice(11, ACCESS_INVITE_CODE_LENGTH),
  ]
    .filter(Boolean)
    .join('-');
};
