require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('postgres://bb_app:app_pw@localhost:5432/bloodbank'),
  DB_OWNER_URL: z.string().optional(),
  PG_SUPERUSER_URL: z.string().optional(),
  MONGO_URL: z.string().default('mongodb://localhost:27017/bloodbank_audit'),
  JWT_SECRET: z.string().default('super_secret_jwt_blood_bank_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  ENC_KEY: z.string().default('default_32_character_encryption_secret_key!'),
  CORS_ORIGIN: z.string().default('http://localhost:5173')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
