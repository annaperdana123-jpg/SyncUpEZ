const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Validate that we have the required environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  // Optional: Add any additional configuration here
  auth: {
    // Automatically refresh tokens when they expire
    autoRefreshToken: true,
    // Persist session data in localStorage
    persistSession: true,
    // Detect session from URL parameters
    detectSessionInUrl: true
  }
});

module.exports = supabase;