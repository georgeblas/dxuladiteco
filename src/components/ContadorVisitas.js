"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ContadorVisitas() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("dxu-visita")) return;
      sessionStorage.setItem("dxu-visita", "1");
    } catch {}
    supabase.rpc("registrar_visita").then(() => {}, () => {});
  }, []);
  return null;
}
