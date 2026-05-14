import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://thjnchjstlcryjbkcxqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoam5jaGpzdGxjcnlqYmtjeHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTAxOTgsImV4cCI6MjA5NDEyNjE5OH0.rQhZIlgyc2Ny_CwkwnH0-Q4qAVT6vPW-z8JXZjDTFUw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}