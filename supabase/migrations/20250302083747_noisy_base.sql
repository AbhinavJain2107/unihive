/*
  # Add admin management and chat system

  1. New Tables
    - `admins`
      - `id` (uuid, primary key, references profiles)
      - `is_master` (boolean)
      - `created_at` (timestamp with timezone)
      - `created_by` (uuid, references profiles)
    - `chats`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `buyer_id` (uuid, references profiles)
      - `seller_id` (uuid, references profiles)
      - `status` (text: 'pending', 'accepted', 'rejected', 'completed')
      - `created_at` (timestamp with timezone)
    - `messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats)
      - `sender_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamp with timezone)
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Create admins table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admins') THEN
    CREATE TABLE admins (
      id uuid REFERENCES profiles(id) PRIMARY KEY,
      is_master boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      created_by uuid REFERENCES profiles(id)
    );

    ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

    -- Only admins can view the admins table
    CREATE POLICY "Admins can view admins"
      ON admins FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM admins WHERE id = auth.uid()
        )
      );

    -- Only master admins can insert/update/delete admins
    CREATE POLICY "Master admins can manage admins"
      ON admins FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM admins WHERE id = auth.uid() AND is_master = true
        )
      );
      
    -- Insert the master admin
    INSERT INTO admins (id, is_master, created_by)
    SELECT 
      profiles.id, 
      true, 
      profiles.id
    FROM 
      profiles 
    WHERE 
      profiles.id = (SELECT id FROM auth.users WHERE email = '21bcs6987@cuchd.in')
    ON CONFLICT (id) DO UPDATE
    SET is_master = true;
  END IF;
END $$;

-- Create chats table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chats') THEN
    CREATE TABLE chats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid REFERENCES products(id) NOT NULL,
      buyer_id uuid REFERENCES profiles(id) NOT NULL,
      seller_id uuid REFERENCES profiles(id) NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

    -- Users can view their own chats
    CREATE POLICY "Users can view their own chats"
      ON chats FOR SELECT
      USING (auth.uid() IN (buyer_id, seller_id));

    -- Buyers can create chat requests
    CREATE POLICY "Buyers can create chat requests"
      ON chats FOR INSERT
      WITH CHECK (auth.uid() = buyer_id);

    -- Sellers can update chat status
    CREATE POLICY "Sellers can update chat status"
      ON chats FOR UPDATE
      USING (auth.uid() = seller_id);
  END IF;
END $$;

-- Create messages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    CREATE TABLE messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      chat_id uuid REFERENCES chats(id) NOT NULL,
      sender_id uuid REFERENCES profiles(id) NOT NULL,
      content text NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

    -- Chat participants can view messages
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

    -- Chat participants can send messages if chat is accepted
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