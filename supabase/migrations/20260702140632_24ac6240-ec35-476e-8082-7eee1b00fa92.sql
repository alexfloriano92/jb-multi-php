CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;

-- cars policies
DROP POLICY IF EXISTS "Admins delete cars" ON public.cars;
DROP POLICY IF EXISTS "Admins insert cars" ON public.cars;
DROP POLICY IF EXISTS "Admins update cars" ON public.cars;

CREATE POLICY "Admins delete cars" ON public.cars
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins insert cars" ON public.cars
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update cars" ON public.cars
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage policies
DROP POLICY IF EXISTS "Admins upload car images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update car images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete car images" ON storage.objects;

CREATE POLICY "Admins upload car images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'car-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update car images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'car-images' AND private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'car-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete car images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'car-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
