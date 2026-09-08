const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

const isIsoTimestamp = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;

  const match = ISO_DATE_TIME_PATTERN.exec(value);

  if (!match) return false;

  const [, year, month, day, hour, minute, second, fraction = ''] = match;
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const numericHour = Number(hour);
  const numericMinute = Number(minute);
  const numericSecond = Number(second);
  const daysInMonth = new Date(
    Date.UTC(numericYear, numericMonth, 0),
  ).getUTCDate();

  return (
    numericMonth >= 1 &&
    numericMonth <= 12 &&
    numericDay >= 1 &&
    numericDay <= daysInMonth &&
    numericHour <= 23 &&
    numericMinute <= 59 &&
    numericSecond <= 59 &&
    fraction.length <= 9 &&
    !Number.isNaN(Date.parse(value))
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export { isUuid, isIsoTimestamp, isRecord };
