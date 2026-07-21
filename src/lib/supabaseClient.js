import { createClient } from "@supabase/supabase-js";

// Cliente para el navegador y componentes de servidor (clave anon, respeta RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// FASE 2: cuando se activen pagos en linea, aqui se agregara
// supabaseAdmin() con SUPABASE_SERVICE_ROLE_KEY para las API routes.
