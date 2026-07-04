
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Cars table
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  km INT NOT NULL DEFAULT 0,
  price NUMERIC(12,2),
  color TEXT,
  fuel TEXT,
  transmission TEXT,
  category TEXT NOT NULL DEFAULT 'seminovo',
  image_url TEXT,
  description TEXT,
  sold BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cars TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view cars" ON public.cars FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert cars"  ON public.cars FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update cars"  ON public.cars FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete cars"  ON public.cars FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER cars_updated_at BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed the 6 cars from the original page
INSERT INTO public.cars (brand, model, year, km, category, color, fuel, transmission, image_url, sort_order) VALUES
('Chevrolet','Onix Plus LTZ',2023,18500,'seminovo','Prata','Flex','Automático','/assets/images/car_onix.png',1),
('Hyundai','HB20 Vision',2022,32000,'seminovo','Vermelho','Flex','Manual','/assets/images/car_hb20.png',2),
('Toyota','Hilux SRX 4x4',2023,25000,'pickup','Branca','Diesel','Automático','/assets/images/car_hilux.png',3),
('Jeep','Renegade Longitude',2022,41000,'suv','Azul','Flex','Automático','/assets/images/car_renegade.png',4),
('Fiat','Strada Volcano',2024,0,'novo pickup','Cinza','Flex','CVT',NULL,5),
('Volkswagen','Polo Track',2024,0,'novo','Preto','Flex','Automático',NULL,6);
