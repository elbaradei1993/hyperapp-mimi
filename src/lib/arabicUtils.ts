/**
 * Arabic Language Utilities
 * Comprehensive utilities for proper Arabic language support
 */

// Eastern Arabic numerals (used in Arabic-speaking countries)
const easternArabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const westernArabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Convert Western Arabic numerals to Eastern Arabic numerals
 */
export function toEasternArabicNumerals(text: string): string {
  return text.split('').map(char => {
    const index = westernArabicNumerals.indexOf(char);
    return index !== -1 ? easternArabicNumerals[index] : char;
  }).join('');
}

/**
 * Convert Eastern Arabic numerals to Western Arabic numerals
 */
export function toWesternArabicNumerals(text: string): string {
  return text.split('').map(char => {
    const index = easternArabicNumerals.indexOf(char);
    return index !== -1 ? westernArabicNumerals[index] : char;
  }).join('');
}

/**
 * Format numbers with Eastern Arabic numerals and proper grouping
 */
export function formatArabicNumber(num: number, useEasternNumerals: boolean = true): string {
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);

  return useEasternNumerals ? toEasternArabicNumerals(formatted) : formatted;
}

/**
 * Format currency in Arabic
 */
export function formatArabicCurrency(amount: number, currency: string = 'EGP', useEasternNumerals: boolean = true): string {
  const formatted = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);

  return useEasternNumerals ? toEasternArabicNumerals(formatted) : formatted;
}

/**
 * Format date in Arabic
 */
export function formatArabicDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };

  return new Intl.DateTimeFormat('ar-EG', defaultOptions).format(date);
}

/**
 * Format time in Arabic
 */
export function formatArabicTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  };

  return new Intl.DateTimeFormat('ar-EG', defaultOptions).format(date);
}

/**
 * Get Arabic day names
 */
export const arabicDayNames = {
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت'
};

/**
 * Get Arabic month names
 */
export const arabicMonthNames = {
  january: 'يناير',
  february: 'فبراير',
  march: 'مارس',
  april: 'أبريل',
  may: 'مايو',
  june: 'يونيو',
  july: 'يوليو',
  august: 'أغسطس',
  september: 'سبتمبر',
  october: 'أكتوبر',
  november: 'نوفمبر',
  december: 'ديسمبر'
};

/**
 * Check if text contains Arabic characters
 */
export function containsArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

/**
 * Get text direction based on content
 */
export function getTextDirection(text: string): 'ltr' | 'rtl' {
  return containsArabic(text) ? 'rtl' : 'ltr';
}

/**
 * Apply proper Arabic text shaping and RTL support
 */
export function prepareArabicText(text: string): {
  text: string;
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
} {
  const isArabic = containsArabic(text);
  const direction = isArabic ? 'rtl' : 'ltr';

  return {
    text,
    direction,
    isArabic
  };
}

/**
 * Format ordinal numbers in Arabic
 */
export function formatArabicOrdinal(num: number): string {
  // Arabic ordinal numbers
  const ordinals: { [key: number]: string } = {
    1: 'الأول',
    2: 'الثاني',
    3: 'الثالث',
    4: 'الرابع',
    5: 'الخامس',
    6: 'السادس',
    7: 'السابع',
    8: 'الثامن',
    9: 'التاسع',
    10: 'العاشر',
    11: 'الحادي عشر',
    12: 'الثاني عشر',
    13: 'الثالث عشر',
    14: 'الرابع عشر',
    15: 'الخامس عشر',
    16: 'السادس عشر',
    17: 'السابع عشر',
    18: 'الثامن عشر',
    19: 'التاسع عشر',
    20: 'العشرون',
    21: 'الحادي والعشرون',
    22: 'الثاني والعشرون',
    30: 'الثلاثون'
  };

  if (ordinals[num]) {
    return ordinals[num];
  }

  // For numbers not in the predefined list, use a generic approach
  if (num > 20) {
    const tens = Math.floor(num / 10) * 10;
    const units = num % 10;

    if (units === 0) {
      return `${formatArabicNumber(tens / 10)}ون`;
    } else {
      return `${formatArabicNumber(units)} وال${formatArabicNumber(tens / 10)}ون`;
    }
  }

  return formatArabicNumber(num);
}

/**
 * Format file sizes in Arabic
 */
export function formatArabicFileSize(bytes: number): string {
  const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت', 'تيرابايت'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${formatArabicNumber(Math.round(size * 100) / 100)} ${units[unitIndex]}`;
}

/**
 * Format percentages in Arabic
 */
export function formatArabicPercentage(value: number, decimals: number = 1): string {
  return `${formatArabicNumber(value, true)}%`;
}

/**
 * Get Arabic greeting based on time of day
 */
export function getArabicGreeting(hour: number = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) {
    return 'صباح الخير'; // Good morning
  } else if (hour >= 12 && hour < 17) {
    return 'مساء الخير'; // Good afternoon
  } else if (hour >= 17 && hour < 21) {
    return 'مساء الخير'; // Good evening
  } else {
    return 'تصبح على خير'; // Good night
  }
}

/**
 * Format duration in Arabic
 */
export function formatArabicDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${formatArabicNumber(hours)} ساعة`);
  }
  if (minutes > 0) {
    parts.push(`${formatArabicNumber(minutes)} دقيقة`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${formatArabicNumber(remainingSeconds)} ثانية`);
  }

  return parts.join(' و ');
}

/**
 * Validate Arabic text input
 */
export function validateArabicText(text: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for mixed scripts (Arabic and Latin without proper separation)
  const hasArabic = containsArabic(text);
  const hasLatin = /[a-zA-Z]/.test(text);

  if (hasArabic && hasLatin) {
    // Allow mixed text but warn about potential issues
    const arabicWords = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g) || [];
    const latinWords = text.match(/[a-zA-Z]+/g) || [];

    if (arabicWords.length > 0 && latinWords.length > 0) {
      // This is acceptable for bilingual content
    }
  }

  // Check for proper Arabic punctuation
  if (hasArabic) {
    // Arabic text should use Arabic punctuation when possible
    const arabicPunctuation = /[،؛؟]/;
    const latinPunctuation = /[,;?!]/;

    if (latinPunctuation.test(text) && !arabicPunctuation.test(text)) {
      errors.push('Consider using Arabic punctuation marks (، ؛ ؟) for better Arabic text formatting');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
