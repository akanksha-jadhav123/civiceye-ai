const { z } = require('zod');
const { httpsUrl } = require('../complaints/validators');

const listAssignmentsSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const rejectSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

const resolutionSchema = z.object({
  notes: z.string().trim().min(5).max(1000),
  after_image_urls: z.array(httpsUrl).min(1).max(5),
});

module.exports = { listAssignmentsSchema, rejectSchema, resolutionSchema };
