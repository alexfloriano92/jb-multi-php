
CREATE POLICY "Public read car images"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-images');

CREATE POLICY "Admins upload car images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'car-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update car images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'car-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete car images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'car-images' AND public.has_role(auth.uid(), 'admin'));
