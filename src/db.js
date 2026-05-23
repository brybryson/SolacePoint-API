const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;

if (supabaseUrl && supabaseKey && supabaseKey !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
  // Use the service_role key to safely bypass Row Level Security (RLS) on our secure backend server
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });
  console.log('✅ Database Engine: Supabase Client initialized successfully.');
} else {
  console.warn('⚠️ WARNING: Supabase Service Role Key is missing or using placeholder in .env. Database operations will fail until configured.');
}

module.exports = {
  supabase
};
