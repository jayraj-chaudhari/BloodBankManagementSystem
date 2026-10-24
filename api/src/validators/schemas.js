const { z } = require('zod');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['WHOLE_BLOOD', 'RED_CELLS', 'PLASMA', 'PLATELETS'];
const UNIT_STATUSES = ['QUARANTINE', 'AVAILABLE', 'RESERVED', 'ISSUED', 'EXPIRED', 'DISCARDED'];
const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'PARTIAL', 'FULFILLED', 'REJECTED', 'CANCELLED'];
const URGENCIES = ['ROUTINE', 'URGENT', 'EMERGENCY'];
const TEST_TYPES = ['HIV', 'HBV', 'HCV', 'SYPHILIS', 'MALARIA'];
const TEST_RESULTS = ['NEGATIVE', 'POSITIVE', 'INCONCLUSIVE'];
const ALERT_RESPONSES = ['PENDING', 'ACCEPTED', 'DECLINED'];
const ROLES = ['admin', 'bb_officer', 'lab_tech', 'hospital_user', 'donor', 'auditor'];

const registerDonorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(['M', 'F', 'O']),
  blood_group: z.enum(BLOOD_GROUPS),
  weight_kg: z.number().min(45, 'Weight must be at least 45 kg'),
  region_code: z.string().length(3).toUpperCase(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Phone must be a 10-digit Indian mobile number starting with 6-9'),
  address: z.string().optional().nullable()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  role_name: z.enum(['admin', 'bb_officer', 'lab_tech', 'hospital_user', 'auditor']),
  branch_id: z.number().int().positive().optional().nullable(),
  hospital_id: z.number().int().positive().optional().nullable()
});

const createDonationSchema = z.object({
  donor_id: z.number().int().positive(),
  branch_id: z.number().int().positive(),
  donated_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  volume_ml: z.number().int().min(200).max(500),
  hemoglobin_gdl: z.number().min(12.5, 'Hemoglobin must be at least 12.5 g/dL'),
  components: z.array(z.enum(COMPONENTS)).min(1, 'At least one component must be specified')
});

const createScreeningSchema = z.object({
  donation_id: z.number().int().positive(),
  test_type: z.enum(TEST_TYPES),
  result: z.enum(TEST_RESULTS),
  report: z.record(z.any()).optional().default({})
});

const createRequestSchema = z.object({
  patient_ref: z.string().min(1, 'Patient reference code is required'),
  blood_group: z.enum(BLOOD_GROUPS),
  component: z.enum(COMPONENTS),
  units_needed: z.number().int().min(1).max(20),
  urgency: z.enum(URGENCIES).default('ROUTINE'),
  needed_by: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)).optional().nullable(),
  hospital_id: z.number().int().positive().optional().nullable()
});

const updateUnitStatusSchema = z.object({
  status: z.enum(UNIT_STATUSES)
});

const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES)
});

const updateDonorSchema = z.object({
  weight_kg: z.number().min(45).optional(),
  is_available: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable()
});

const createAlertSchema = z.object({
  radius_km: z.number().positive().default(25),
  max_donors: z.number().int().positive().default(10)
});

const respondAlertSchema = z.object({
  response: z.enum(['ACCEPTED', 'DECLINED'])
});

module.exports = {
  BLOOD_GROUPS,
  COMPONENTS,
  UNIT_STATUSES,
  REQUEST_STATUSES,
  URGENCIES,
  TEST_TYPES,
  TEST_RESULTS,
  ALERT_RESPONSES,
  ROLES,
  registerDonorSchema,
  loginSchema,
  createUserSchema,
  createDonationSchema,
  createScreeningSchema,
  createRequestSchema,
  updateUnitStatusSchema,
  updateRequestStatusSchema,
  updateDonorSchema,
  createAlertSchema,
  respondAlertSchema
};
