/**
 * Status machine: single source of truth for legal complaint transitions.
 * TRANSITIONS[from][to] = roles allowed to perform that transition.
 */
const TRANSITIONS = {
  SUBMITTED: {
    AI_ANALYSIS:  ['SYSTEM'],
    UNDER_REVIEW: ['ADMIN'],
    REJECTED:     ['ADMIN'],
  },
  AI_ANALYSIS: {
    UNDER_REVIEW: ['SYSTEM', 'ADMIN'],
    REJECTED:     ['ADMIN'],
  },
  UNDER_REVIEW: {
    APPROVED: ['ADMIN'],
    REJECTED: ['ADMIN'],
  },
  APPROVED: {
    ASSIGNED: ['ADMIN', 'DEPT_MANAGER'],
    REJECTED: ['ADMIN'],
  },
  ASSIGNED: {
    ACCEPTED: ['WORKER'],
    APPROVED: ['WORKER', 'ADMIN'], // worker rejects the job, or admin unassigns
  },
  ACCEPTED: {
    IN_PROGRESS: ['WORKER'],
  },
  IN_PROGRESS: {
    RESOLUTION_SUBMITTED: ['WORKER'],
  },
  RESOLUTION_SUBMITTED: {
    RESOLVED:    ['ADMIN'], // only an admin can verify; workers cannot self-approve
    IN_PROGRESS: ['ADMIN'], // verification failed, send back to the worker
  },
  RESOLVED: {
    REOPENED: ['CITIZEN', 'ADMIN'],
  },
  REOPENED: {
    UNDER_REVIEW: ['ADMIN'],
  },
  REJECTED: {},
};

const TERMINAL_OR_CLOSED = ['RESOLVED', 'REJECTED'];

function canTransition(from, to, role) {
  const allowed = TRANSITIONS[from]?.[to];
  return Array.isArray(allowed) && allowed.includes(role);
}

function nextStatuses(from) {
  return Object.keys(TRANSITIONS[from] || {});
}

module.exports = { TRANSITIONS, TERMINAL_OR_CLOSED, canTransition, nextStatuses };
