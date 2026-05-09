-- 1. Cria/garante o plano "business" com limites altíssimos (efetivamente ilimitado)
INSERT INTO public.plans (name, slug, price_cents, max_instances, max_messages_per_day, max_contacts, features, active, sort_order)
VALUES (
  'Business',
  'business',
  0,
  9999,
  9999999,
  9999999,
  '["unlimited_messages","unlimited_instances","unlimited_contacts"]'::jsonb,
  true,
  100
)
ON CONFLICT (slug) DO UPDATE SET
  max_instances = EXCLUDED.max_instances,
  max_messages_per_day = EXCLUDED.max_messages_per_day,
  max_contacts = EXCLUDED.max_contacts,
  active = true;

-- 2. Atribui o plano business a TODOS os profiles existentes que ainda não têm plano
UPDATE public.profiles
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'business' LIMIT 1)
WHERE plan_id IS NULL;

-- 3. Atualiza o trigger handle_new_user para que TODO novo cadastro
--    já saia com plano business
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_plan_id UUID;
BEGIN
  SELECT id INTO _business_plan_id
  FROM public.plans
  WHERE slug = 'business'
  LIMIT 1;

  INSERT INTO public.profiles (id, email, full_name, plan_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _business_plan_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');

  RETURN NEW;
END;
$$;