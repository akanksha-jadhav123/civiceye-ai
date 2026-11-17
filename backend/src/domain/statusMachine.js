/**
 * Status machine — single source of truth for legal complaint transitions.
 */
const TRANSITIONS = {
  SUBMITTED: {
    AI_ANALYSIS:  ['SYSTEM'],
    UNDER_REVIEW: ['ADMIN'],
  },
  AI_ANALYSIS: {
    UNDER_REVIEW: ['SYSTEM', 'ADMIN'],
  },
  UNDER_REVIEW: {
    APPROVED: ['ADMIN'],
    REJECTED: ['ADMIN'],
  },
  APPROVED: {
    ASSIGNED: ['ADMIN', 'DEPT_MANAGER'],
  },
  ASSIGNED: {
    ACCEPTED: ['WORKER'],
  },
  ACCEPTED: {
    IN_PROGRESS: ['WORKER'],
  },
  IN_PROGRESS: {
    RESOLUTION_SUBMITTED: ['WORKER'],
  },
  RESOLUTION_SUBMITTED: {
    RESOLVED: ['ADMIN'],
  },
  RESOLVED: {
    REOPENED: ['CITIZEN', 'ADMIN'],
  },
  REOPENED: {
    UNDER_REVIEW: ['ADMIN'],
  },
  REJECTED: {},
};

function canTransition(from, to, role) {
  const allowed = TRANSITIONS[from]?.[to];
  return Array.isArray(allowed) && allowed.includes(role);
}

function nextStatuses(from) {
  return Object.keys(TRANSITIONS[from] || {});
}

module.exports = { TRANSITIONS, canTransition, nextStatuses };