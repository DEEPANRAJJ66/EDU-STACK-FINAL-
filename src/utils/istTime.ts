/**
 * Indian Standard Time (IST — Asia/Kolkata) time and date utilities.
 * Ensures consistent IST calculation across all devices and timezones.
 */

export const getISTTime = (customDate?: Date): string => {
  const date = customDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find(p => p.type === 'hour')?.value.padStart(2, '0') || '00';
  const minute = parts.find(p => p.type === 'minute')?.value.padStart(2, '0') || '00';
  return `${hour}:${minute}`;
};

export const getISTDateStr = (customDate?: Date): string => {
  const date = customDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

export const getISTDayName = (customDate?: Date): string => {
  const date = customDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });
  return formatter.format(date);
};

export const getISTFormattedFull = (customDate?: Date): string => {
  const date = customDate || new Date();
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(date);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: 'short' }).format(date);
  const year = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(date);
  return `${weekday}, ${day} ${month} ${year}`;
};

export const formatTo12HourIST = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${period} IST`;
};

export const calculateEndTimeIST = (startStr: string, durationMins: number): string => {
  const [h, m] = startStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const totalMins = h * 60 + m + durationMins;
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};
