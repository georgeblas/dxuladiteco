import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_COLORS } from "@/lib/theme";
import StoreFront from "@/components/StoreFront";
import ContadorVisitas from "@/components/ContadorVisitas";

// Revalida el catálogo cada 60 s (ISR): rápido para el cliente,
// fresco para ti sin redeployar.
export const revalidate = 60;

export default async function Home() {
  const [{ data: conf }, { data: cats }, { data: prods }] = await Promise.all([
    supabase.from("configuracion").select("valor").eq("clave", "site").single(),
    supabase.from("categorias").select("*").order("orden"),
    supabase.from("productos").select("*").order("destacado", { ascending: false }).order("creado"),
  ]);

  const config = { colores: DEFAULT_COLORS, ...(conf?.valor || {}) };
  return (
    <>
      <ContadorVisitas />
      <StoreFront config={config} categories={cats || []} products={prods || []} />
    </>
  );
}
