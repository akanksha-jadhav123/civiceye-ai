const { z } = require('zod');

const CATEGORIES = [
  'ROAD_DAMAGE',
  'GARBAGE',
  'DRAINAGE',
  'WATER_LEAKAGE',
  'STREETLIGHT',
  'WATERLOGGING',
  'PUBLIC_INFRA',
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Only https image URLs are accepted (blocks javascript:, data:, file: etc.).
const httpsUrl = z.string().url().max(500).refine((u) => u.startsWith('https://'), 'Must be an https URL');

// AI fields (category_ai, ai_confidence) are intentionally not accepted from clients.
const createComplaintSchema = z.object({
  title: z.string().trim().min(4).max(200),
  description: z.string().trim().min(10).max(3000),
  category_confirmed: z.enum(CATEGORIES),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().max(255).optional().or(z.literal('')),
  image_urls: z.array(httpsUrl).max(5).optional().default([]),
});

const listMineSchema = z.object({
  status: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const reopenSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

module.exports = {
  CATEGORIES, PRIORITIES, httpsUrl,
  createComplaintSchema, listMineSchema, reopenSchema, feedbackSchema,
};
