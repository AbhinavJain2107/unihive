import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase, setupDatabase, initDatabaseFunctions } from './lib/supabase.ts';

// Initialize database
const initDatabase = async () => {
  try {
    // First create the functions
    await initDatabaseFunctions();
    
    // Then use the functions to create tables
    await setupDatabase();
    
    // Create tables directly if functions fail
    await createTablesDirectly();
    
    // Ensure master admin exists
    await ensureMasterAdmin();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Create tables directly if functions approach fails
const createTablesDirectly = async () => {
  try {
    // Create profiles table
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id uuid REFERENCES auth.users PRIMARY KEY,
        username text UNIQUE NOT NULL,
        full_name text NOT NULL,
        avatar_url text,
        course text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
      
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
        ) THEN
          CREATE POLICY "Public profiles are viewable by everyone"
            ON profiles FOR SELECT
            USING (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
        ) THEN
          CREATE POLICY "Users can insert their own profile"
            ON profiles FOR INSERT
            WITH CHECK (auth.uid() = id);
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
        ) THEN
          CREATE POLICY "Users can update own profile"
            ON profiles FOR UPDATE
            USING (auth.uid() = id);
        END IF;
      END $$;
    `);
    
    // Create products table
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        description text NOT NULL,
        price numeric NOT NULL,
        category text NOT NULL,
        image_url text NOT NULL,
        condition text NOT NULL,
        seller_id uuid REFERENCES profiles(id) NOT NULL,
        created_at timestamptz DEFAULT now()
      );
      
      ALTER TABLE products ENABLE ROW LEVEL SECURITY;
      
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'products' AND policyname = 'Products are viewable by everyone'
        ) THEN
          CREATE POLICY "Products are viewable by everyone"
            ON products FOR SELECT
            USING (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'products' AND policyname = 'Authenticated users can insert products'
        ) THEN
          CREATE POLICY "Authenticated users can insert products"
            ON products FOR INSERT
            WITH CHECK (auth.uid() = seller_id);
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can update own products'
        ) THEN
          CREATE POLICY "Users can update own products"
            ON products FOR UPDATE
            USING (auth.uid() = seller_id);
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can delete own products'
        ) THEN
          CREATE POLICY "Users can delete own products"
            ON products FOR DELETE
            USING (auth.uid() = seller_id);
        END IF;
      END $$;
    `);
    
    // Create admins table
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id uuid REFERENCES profiles(id) PRIMARY KEY,
        is_master boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        created_by uuid REFERENCES profiles(id)
      );
      
      ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
      
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Admins can view admins'
        ) THEN
          CREATE POLICY "Admins can view admins"
            ON admins FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM admins WHERE id = auth.uid()
              )
            );
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Master admins can manage admins'
        ) THEN
          CREATE POLICY "Master admins can manage admins"
            ON admins FOR ALL
            USING (
              EXISTS (
                SELECT 1 FROM admins WHERE id = auth.uid() AND is_master = true
              )
            );
        END IF;
      END $$;
    `);
    
    // Create chats table
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id uuid REFERENCES products(id) NOT NULL,
        buyer_id uuid REFERENCES profiles(id) NOT NULL,
        seller_id uuid REFERENCES profiles(id) NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz DEFAULT now()
      );
      
      ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
      
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can view their own chats'
        ) THEN
          CREATE POLICY "Users can view their own chats"
            ON chats FOR SELECT
            USING (auth.uid() IN (buyer_id, seller_id));
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Buyers can create chat requests'
        ) THEN
          CREATE POLICY "Buyers can create chat requests"
            ON chats FOR INSERT
            WITH CHECK (auth.uid() = buyer_id);
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Sellers can update chat status'
        ) THEN
          CREATE POLICY "Sellers can update chat status"
            ON chats FOR UPDATE
            USING (auth.uid() = seller_id);
        END IF;
      END $$;
    `);
    
    // Create messages table
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id uuid REFERENCES chats(id) NOT NULL,
        sender_id uuid REFERENCES profiles(id) NOT NULL,
        content text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
      
      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
      
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Chat participants can view messages'
        ) THEN
          CREATE POLICY "Chat participants can view messages"
            ON messages FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM chats
                WHERE chats.id = messages.chat_id
                AND auth.uid() IN (buyer_id, seller_id)
                AND status = 'accepted'
              )
            );
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Chat participants can send messages'
        ) THEN
          CREATE POLICY "Chat participants can send messages"
            ON messages FOR INSERT
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM chats
                WHERE chats.id = chat_id
                AND auth.uid() IN (buyer_id, seller_id)
                AND status = 'accepted'
              )
            );
        END IF;
      END $$;
    `);
    
    console.log('Tables created directly');
  } catch (error) {
    console.error('Error creating tables directly:', error);
  }
};

// Ensure master admin exists
const ensureMasterAdmin = async () => {
  try {
    // Get the user ID from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return;
    }
    
    // Find the master admin user
    const masterAdminUser = userData?.users?.find(user => user.email === '21bcs6987@cuchd.in');
    
    if (!masterAdminUser) {
      console.log('Master admin user not found');
      return;
    }
    
    // Check if user exists in profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', masterAdminUser.id)
      .single();
    
    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      await supabase.from('profiles').insert({
        id: masterAdminUser.id,
        username: '21bcs6987',
        full_name: '21bcs6987',
        course: 'Not specified',
        created_at: new Date().toISOString()
      });
      
      console.log('Created profile for master admin');
    }
    
    // Make the user a master admin
    const { error: adminError } = await supabase
      .from('admins')
      .upsert({
        id: masterAdminUser.id,
        is_master: true,
        created_by: masterAdminUser.id,
        created_at: new Date().toISOString()
      });
    
    if (adminError) {
      console.error('Error making user master admin:', adminError);
      return;
    }
    
    console.log('Master admin ensured');
  } catch (error) {
    console.error('Error ensuring master admin:', error);
  }
};

// Initialize database
initDatabase();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);