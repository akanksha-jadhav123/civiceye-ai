const { z } = require('zod');
const { CATEGORIES, PRIORITIES } = require('../complaints/validators');

const STATUSES = [
  'SUBMITTED', 'AI_ANALYSIS', 'UNDER_REVIEW', 'APPROVED', 'ASSIGNED', 'ACCEPTED',
  'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED', 'REOPENED', 'REJECTED',
];

// Targets an admin may request through PATCH /status. ASSIGNED/ACCEPTED/RESOLUTION_SUBMITTED
// are reached only via the assign and worker endpoints.
const ADMIN_STATUS_TARGETS = ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED', 'IN_PROGRESS'];

const boolStr = z.enum(['true', 'false']).transform((v) => v === 'true');

const listComplaintsSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(CATEGORIES).optional(),
  overdue: boolStr.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['created_at', 'priority', 'sla_due_at', 'status']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const changeStatusSchema = z.object({
  to: z.enum(ADMIN_STATUS_TARGETS),
  remarks: z.string().trim().max(500).optional(),
});

const changePrioritySchema = z.object({
  priority: z.enum(PRIORITIES),
  justification: z.string().trim().min(5).max(500),
});

const assignSchema = z.object({
  worker_id: z.number().int().positive(),
  remarks: z.string().trim().max(500).optional(),
});

const createWorkerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  password: z.string().min(8).max(100),
  full_name: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(20).optional(),
  department_id: z.number().int().positive(),
  employee_code: z.string().trim().max(60).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

const listWorkersSchema = z.object({
  department_id: z.coerce.number().int().positive().optional(),
});

module.exports = {
  listComplaintsSchema, changeStatusSchema, changePrioritySchema, assignSchema,
  createWorkerSchema, listWorkersSchema,
};
