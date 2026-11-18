/**
 * Rule-based priority scoring. Deterministic and auditable on purpose.
 * Safety keywords force CRITICAL; context keywords raise the base level by one.
 */
const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const BASE_BY_CATEGORY = {
  ROAD_DAMAGE: 'MEDIUM',
  GARBAGE: 'LOW',
  DRAINAGE: 'MEDIUM',
  WATER_LEAKAGE: 'MEDIUM',
  STREETLIGHT: 'MEDIUM',
  WATERLOGGING: 'HIGH',
  PUBLIC_INFRA: 'MEDIUM',
};

const CRITICAL_PATTERNS = [
  /\blive\s+wires?\b/, /\bexposed\s+wires?\b/, /\bfallen\s+(electric\s+)?(pole|wire)s?\b/,
  /\belectric(al)?\s+shock\b/, /\belectrocut\w*/, /\bsparking\b/, /\bshort\s+circuit\b/,
  /\bopen\s+manhole\b/, /\bmanhole\s+(is\s+)?(open|uncovered|missing)\b/, /\bsinkhole\b/,
  /\bgas\s+leak\w*/, /\bcollaps(e|ed|ing)\b/, /\bfire\b/,
  /\baccident\b/, /\binjur(y|ed|ies)\b/,
];

const ESCALATE_PATTERNS = [
  /\bschool\b/, /\bhospital\b/, /\bchild(ren)?\b/, /\belderly\b/,
  /\bflood(ed|ing)?\b/, /\boverflow(ing)?\b/, /\bsewage\b/,
  /\bdangerous\b/, /\bhazard(ous)?\b/, /\bblock(ed|ing)\s+(the\s+)?(road|traffic)\b/,
  /\bdeep\s+(pothole|crater|hole)s?\b/, /\bno\s+water\b/,
];

function raise(level, steps = 1) {
  return LEVELS[Math.min(LEVELS.indexOf(level) + steps, LEVELS.length - 1)];
}

function scorePriority({ category, title = '', description = '' }) {
  const text = `${title} ${description}`.toLowerCase();
  const reasons = [];
  let level = BASE_BY_CATEGORY[category] || 'MEDIUM';
  reasons.push(`base:${category || 'UNKNOWN'}=${level}`);

  const critical = CRITICAL_PATTERNS.find((re) => re.test(text));
  if (critical) {
    reasons.push(`critical-keyword:${critical.source}`);
    return { priority: 'CRITICAL', reasons };
  }

  const escalate = ESCALATE_PATTERNS.find((re) => re.test(text));
  if (escalate) {
    level = raise(level);
    reasons.push(`escalate-keyword:${escalate.source}`);
  }
  return { priority: level, reasons };
}

module.exports = { LEVELS, BASE_BY_CATEGORY, scorePriority };
