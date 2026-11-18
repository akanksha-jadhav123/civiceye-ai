const DEFAULT_HOURS = { CRITICAL: 24, HIGH: 72, MEDIUM: 168, LOW: 336 };

function defaultSlaHours(priority) {
  return DEFAULT_HOURS[priority] ?? DEFAULT_HOURS.MEDIUM;
}

function computeSlaDueAt(from, hours) {
  return new Date(new Date(from).getTime() + hours * 3600 * 1000);
}

module.exports = { DEFAULT_HOURS, defaultSlaHours, computeSlaDueAt };
