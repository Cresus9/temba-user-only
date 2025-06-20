-- Create new admin user
DO $$
BEGIN
  -- Create admin user if not exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@moofon.com'
  ) THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@moofon.com',
      crypt('Thierry1995', gen_salt('bf')),
      now(),
      '{"name":"Admin User","role":"ADMIN"}'::jsonb,
      now(),
      now()
    );

    -- Create profile for admin
    INSERT INTO public.profiles (
      user_id,
      email,
      name,
      role
    )
    SELECT
      id,
      email,
      raw_user_meta_data->>'name',
      'ADMIN'
    FROM auth.users
    WHERE email = 'admin@moofon.com'
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'ADMIN';
  END IF;
END $$;