import { TimeWindow } from './types';

/**
 * Converts a number to subscript Unicode characters
 * @param number - The number to convert
 * @returns Subscript string
 */
export const convertToSubscript = (number: number): string =>
  String(number)
    .split('')
    .map((digit) => String.fromCharCode(8320 + parseInt(digit)))
    .join('');

/**
 * Formats a number string using scientific notation with subscript zeros
 * Examples: 0.000001 → "0.0₅1", 0.123 → "0.123"
 * @param num - The number string or number to format
 * @param precision - The number of decimal places to include (default: 3)
 * @returns The formatted number string
 */
export function formatNumberWithSubscriptZeros(
  num: string | number,
  precision = 3
): string {
  const hasE = num.toString().includes('e');
  const numberStr = hasE
    ? parseFloat(num.toString()).toFixed(18)
    : num.toString();
  const number = typeof num === 'number' ? num : parseFloat(numberStr);
  const isNegative = number < 0;
  const absNumberStr = isNegative ? numberStr.slice(1) : numberStr;

  if (number === 0 || absNumberStr.replace(/0|\./g, '') === '') {
    return '0';
  }

  const [part0, part1 = ''] = absNumberStr.split('.');

  if (/^0*$/.test(part1)) {
    return isNegative ? `-${part0}` : part0;
  }

  const leadingZerosMatch = part1.match(/^0+/);
  if (leadingZerosMatch) {
    const leadingZerosCount = leadingZerosMatch[0].length;

    if (leadingZerosCount > 2) {
      const smallCount = convertToSubscript(leadingZerosCount);
      const result = `${part0}.0${smallCount}${part1
        .slice(leadingZerosCount, leadingZerosCount + precision)
        .replace(/0+$/, '')}`;
      return isNegative ? `-${result}` : result;
    } else {
      const result = `${part0}.${part1
        .slice(0, precision + leadingZerosCount)
        .replace(/0+$/, '')}`;
      return isNegative ? `-${result}` : result;
    }
  } else {
    const result = `${part0}.${part1.slice(0, precision).replace(/0+$/, '')}`;
    return isNegative ? `-${result}` : result;
  }
}

/**
 * Formats a date based on the time window
 * @param date - Date to format
 * @param format - Time window format (Day, Week, Month)
 * @param withYear - Include year in format (default: false)
 * @returns Formatted date string
 */
export const printDate = (
  date: Date | string | number,
  format?: TimeWindow,
  withYear = false
): string => {
  let formatOptions: Intl.DateTimeFormatOptions = {
    year: withYear ? 'numeric' : undefined
  };

  switch (format) {
    case TimeWindow.Day:
      formatOptions = {
        hour: '2-digit',
        minute: '2-digit'
      };
      break;
    case TimeWindow.Week:
    case TimeWindow.Month:
      formatOptions = {
        month: 'short',
        day: '2-digit'
      };
      break;
    default:
      formatOptions = {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      };
  }

  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  return dateObj.toLocaleDateString('en-US', formatOptions);
};
