import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

export const isValidCUEmail = (email: string) => {
  return email.endsWith('@cuchd.in');
};

// Create necessary tables if they don't exist
export const setupDatabase = async () => {
  try {
    // Create profiles table
    await supabase.rpc('create_profiles_if_not_exists');
    
    // Create products table
    await supabase.rpc('create_products_if_not_exists');
    
    // Create admins table
    await supabase.rpc('create_admins_if_not_exists');
    
    // Create chats table
    await supabase.rpc('create_chats_if_not_exists');
    
    // Create messages table
    await supabase.rpc('create_messages_if_not_exists');
    
    console.log('Database setup complete');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
};

// Initialize database functions
export const initDatabaseFunctions = async () => {
  try {
    // Create function to create profiles table
    await supabase.rpc('create_function_profiles');
    
    // Create function to create products table
    await supabase.rpc('create_function_products');
    
    // Create function to create admins table
    await supabase.rpc('create_function_admins');
    
    // Create function to create chats table
    await supabase.rpc('create_function_chats');
    
    // Create function to create messages table
    await supabase.rpc('create_function_messages');
    
    console.log('Database functions initialized');
  } catch (error) {
    console.error('Error initializing database functions:', error);
  }
};