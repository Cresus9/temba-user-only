-- Create admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'admin@afritix.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"role": "ADMIN", "name": "Admin User"}'::jsonb
);

-- Ensure profile is created with admin role
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
WHERE email = 'admin@afritix.com'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'ADMIN';