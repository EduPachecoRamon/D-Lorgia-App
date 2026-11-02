import { loadEnv } from './utils/env.js';
loadEnv();

export const config = {
  port: Number(process.env.PORT || 3000),
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  appSecret: process.env.META_APP_SECRET || '',
  graphVersion: process.env.META_GRAPH_API_VERSION || 'v26.0',
  publicBotNumber: process.env.PUBLIC_BOT_NUMBER || '',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  website: process.env.DLORGIA_WEBSITE || 'https://www.dlorgia.com/',
  evaluationUrl: process.env.DLORGIA_EVALUATION_URL || 'https://www.dlorgia.com/reserva-tu-cita/',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  adminEmails: String(process.env.DLORGIA_ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
};
