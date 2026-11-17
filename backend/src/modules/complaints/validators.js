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

const createComplaintSchema = z.object({
  title: z.string().min(4).max(200).trim(),
  description: z.string().min(10).max(3000).trim(),
  category_confirmed: z.enum(CATEGORIES),
  category_ai: z.enum(CATEGORIES).optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(255).optional().or(z.literal('')),
  image_urls: z.array(z.string().url()).max(5).optional().default([]),
});

const listMineSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = { createComplaintSchema, listMineSchema, CATEGORIES, PRIORITIES };