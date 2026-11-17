const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email().max(191).transform(v => v.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 chars')
              .max(72, 'Password too long'),
  full_name: z.string().min(2).max(150).trim(),
  phone: z.string().min(6).max(20).optional().or(z.literal('')),
  preferred_lang: z.string().min(2).max(10).default('en'),
});

const loginSchema = z.object({
  email: z.string().email().max(191).transform(v => v.toLowerCase().trim()),
  password: z.string().min(1).max(72),
});

module.exports = { registerSchema, loginSchema };