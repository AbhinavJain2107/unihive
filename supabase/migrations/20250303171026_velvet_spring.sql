/*
  # Create master admin for 21bcs6987@cuchd.in

  This migration ensures that the user with email 21bcs6987@cuchd.in
  is set as a master admin in the system.
*/

-- First, make sure the user exists in profiles
DO $$ 
BEGIN
  -- Get the user ID from auth.users
  DECLARE user_id uuid;
  SELECT id INTO user_id FROM auth.users WHERE email = '21bcs6987@cuchd.in';
  
  -- If user exists in auth but not in profiles, create a profile
  IF user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    INSERT INTO profiles (id, username, full_name, course, created_at)
    VALUES (user_id, '21bcs6987', '21bcs6987', 'Not specified', now());
  END IF;
  
  -- Make the user a master admin
  IF user_id IS NOT NULL THEN
    INSERT INTO admins (id, is_master, created_by, created_at)
    VALUES (user_id, true, user_id, now())
    ON CONFLICT (id) DO UPDATE
    SET is_master = true;
  END IF;
END $$;