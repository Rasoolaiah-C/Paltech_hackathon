export const isValidReminderTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim());
