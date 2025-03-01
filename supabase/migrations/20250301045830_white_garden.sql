/*
  # Create essential tables for UniHive

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique)
      - `full_name` (text)
      - `avatar_url` (text, nullable)
      - `course` (text)
      - `created_at` (timestamp with timezone)
    - `products`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `price` (numeric)
      - `category` (text)
      - `image_url` (text)
      - `condition` (text)
      - `seller_id` (uuid, references profiles)
      - `created_at` (timestamp with timezone)
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Create profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE profiles (
      id uuid REFERENCES auth.users PRIMARY KEY,
      username text UNIQUE NOT NULL,
      full_name text NOT NULL,
      avatar_url text,
      course text NOT NULL,
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
  END IF;
END $$;

-- Create products table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
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
  END IF;
END $$;