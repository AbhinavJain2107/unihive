/*
  # Initial Schema for UniHive Marketplace

  1. New Tables
    - profiles
      - id (uuid, references auth.users)
      - username (text, unique)
      - full_name (text)
      - avatar_url (text, optional)
      - course (text)
      - semester (integer)
      - created_at (timestamp)
    
    - products
      - id (uuid)
      - title (text)
      - description (text)
      - price (numeric)
      - category (text)
      - image_url (text)
      - condition (text)
      - seller_id (uuid, references profiles)
      - created_at (timestamp)
    
    - chats
      - id (uuid)
      - product_id (uuid, references products)
      - buyer_id (uuid, references profiles)
      - seller_id (uuid, references profiles)
      - created_at (timestamp)
    
    - messages
      - id (uuid)
      - chat_id (uuid, references chats)
      - sender_id (uuid, references profiles)
      - content (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  course text NOT NULL,
  semester integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create products table
CREATE TABLE products (
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

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = seller_id);

-- Create chats table
CREATE TABLE chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  buyer_id uuid REFERENCES profiles(id) NOT NULL,
  seller_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (auth.uid() IN (buyer_id, seller_id));

CREATE POLICY "Buyers can create chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) NOT NULL,
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND auth.uid() IN (buyer_id, seller_id)
    )
  );

CREATE POLICY "Chat participants can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_id
      AND auth.uid() IN (buyer_id, seller_id)
    )
  );