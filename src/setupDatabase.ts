import { supabase } from './lib/supabase';

// Create necessary database tables and functions
export const setupDatabase = async () => {
  try {
    console.log('Setting up database...');
    
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
    
    console.log('Database setup complete');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
};

// Ensure master admin exists
export const ensureMasterAdmin = async () => {
  try {
    console.log('Ensuring master admin exists...');
    
    // Get all users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error listing users:', authError);
      return;
    }
    
    // Find the master admin user
    const masterAdminEmail = '21bcs6987@cuchd.in';
    const masterAdminUser = authData?.users?.find(user => user.email === masterAdminEmail);
    
    if (!masterAdminUser) {
      console.log(`Master admin user with email ${masterAdminEmail} not found`);
      return;
    }
    
    const userId = masterAdminUser.id;
    
    // Check if user exists in profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      await supabase.from('profiles').insert({
        id: userId,
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
        id: userId,
        is_master: true,
        created_by: userId,
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