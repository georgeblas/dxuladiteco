"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/format";
import { T, mkStyles, DEFAULT_COLORS, COLOR_LABELS } from "@/lib/theme";
import { CacaoIcon } from "@/components/Icons";
import ProductForm from "@/components/ProductForm";

const ESTADOS = ["nuevo", "confirmado", "enviado", "entregado", "cancelado"];

export default function AdminPanel() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [tab, setTab] = useState("productos");
  const [config, setConfig] = useState(null);
  const [cfgDraft, setCfgDraft] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [editP, setEditP] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  /* sesión */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const cargar = useCallback(async () => {
    const [{ data: conf }, { data: cats }, { data: prods }, { data: peds }, { data: vis }] = await Promise.all([
      supabase.from("configuracion").select("valor").eq("clave", "site").single(),
      supabase.from("categorias").select("*").order("orden"),
      supabase.from("productos").select("*").order("creado", { ascending: false }),
      supabase.from("pedidos").select("*").order("creado", { ascending: false }).limit(200),
      supabase.from("visitas").select("*").order("fecha", { ascending: false }).limit(14),
    ]);
    const c = conf?.valor || {};
    setConfig(c); setCfgDraft(c);
    setCategories(cats || []); setProducts(prods || []); setOrders(peds || []); setVisitas(vis || []);
  }, []);

  useEffect(() => { if (session) cargar(); }, [session, cargar]);

  const C = (config && config.colores) || DEFAULT_COLORS;
  const S = mkStyles(C);

  /* ---------- login ---------- */
  if (!session)
    return (
      <div style={{ minHeight: "100vh", background: DEFAULT_COLORS.fondo, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.body }}>
        <div style={{ ...S.card, width: 340, textAlign: "center" }}>
          <CacaoIcon size={40} color={C.oro} />
          <div style={{ fontFamily: T.display, fontSize: 20, color: C.crema, margin: "10px 0 16px", letterSpacing: ".05em", textTransform: "uppercase" }}>Panel del negocio</div>
          <input style={{ ...S.input, marginBottom: 10 }} type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={{ ...S.input, marginBottom: 12 }} type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={async (e) => { if (e.key === "Enter") { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setAuthError(error.message); } }} />
          {authError && <div style={{ color: "#B4231F", fontSize: 12, marginBottom: 10 }}>{authError}</div>}
          <button style={{ ...S.btn(C.crema, C.fondo), width: "100%" }}
            onClick={async () => { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setAuthError(error.message); }}>
            Entrar
          </button>
          <Link href="/" style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: C.crema + "88" }}>← Volver a la tienda</Link>
        </div>
      </div>
    );

  if (!config)
    return <div style={{ minHeight: "100vh", background: DEFAULT_COLORS.fondo, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.body, color: DEFAULT_COLORS.crema }}>Cargando…</div>;

  /* ---------- acciones ---------- */
  const guardarConfig = async () => {
    const { error } = await supabase.from("configuracion").update({ valor: cfgDraft }).eq("clave", "site");
    if (!error) { setConfig(cfgDraft); showToast("Configuración guardada"); } else showToast(error.message);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.fondo, fontFamily: T.body, color: C.crema }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontFamily: T.display, fontSize: 22, letterSpacing: ".05em", textTransform: "uppercase" }}>Panel · {config.nombre}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/" style={{ ...S.btn("transparent", C.crema, { border: `1px solid ${C.crema}44`, fontSize: 12 }), textDecoration: "none" }}>← Ver tienda</Link>
            <button style={S.btn("transparent", C.crema + "88", { border: `1px solid ${C.crema}22`, fontSize: 12 })} onClick={() => supabase.auth.signOut()}>Salir</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {[["productos", "Productos"], ["categorias", "Categorías"], ["pedidos", `Pedidos (${orders.length})`], ["reportes", "Reportes"], ["config", "Configuración"]].map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)}
              style={S.btn(tab === k ? C.crema : "transparent", tab === k ? C.fondo : C.crema, { border: `1px solid ${tab === k ? C.crema : C.crema + "33"}`, padding: "8px 16px", fontSize: 13 })}>
              {t}
            </button>
          ))}
        </div>

        {/* PRODUCTOS */}
        {tab === "productos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {editP ? (
              <ProductForm key={editP.id || "nuevo"} initial={editP} categories={categories} C={C} S={S}
                onSaved={() => { setEditP(null); cargar(); showToast("Producto guardado"); }}
                onCancel={() => setEditP(null)} />
            ) : (
              <button style={S.btn(C.bugambilia, "#FFF7EC", { alignSelf: "flex-start" })}
                onClick={() => setEditP({ nombre: "", precio: 0, stock: 0, categoria: categories[0]?.id || "", descripcion: "", imagen_url: "", destacado: false, mas_vendido: false, activo: true })}>
                + Nuevo producto
              </button>
            )}
            {products.map((p) => (
              <div key={p.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {p.nombre} {!p.activo && <span style={{ color: C.bugambilia, fontSize: 11 }}>(oculto)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.crema + "88" }}>
                    {categories.find((c) => c.id === p.categoria)?.nombre || "Sin categoría"} · {money(p.precio, config.moneda)} · Stock: {p.stock}
                  </div>
                </div>
                <button style={S.btn("transparent", C.oro, { border: `1px solid ${C.oro}55`, padding: "6px 14px", fontSize: 12 })} onClick={() => setEditP(p)}>Editar</button>
                <button style={S.btn("transparent", C.bugambilia, { border: `1px solid ${C.bugambilia}55`, padding: "6px 14px", fontSize: 12 })}
                  onClick={async () => {
                    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
                    const { error } = await supabase.from("productos").delete().eq("id", p.id);
                    if (!error) { cargar(); showToast("Producto eliminado"); } else showToast(error.message);
                  }}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CATEGORÍAS */}
        {tab === "categorias" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input style={S.input} placeholder="Nueva categoría…" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
              <button style={S.btn(C.bugambilia, "#FFF7EC")} onClick={async () => {
                if (!newCat.trim()) return;
                const id = newCat.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
                const { error } = await supabase.from("categorias").insert({ id, nombre: newCat.trim(), orden: categories.length + 1 });
                if (!error) { setNewCat(""); cargar(); showToast("Categoría creada"); } else showToast(error.message);
              }}>Agregar</button>
            </div>
            {categories.map((c) => (
              <div key={c.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{c.nombre}</div>
                <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={c.visible} onChange={async (e) => {
                    await supabase.from("categorias").update({ visible: e.target.checked }).eq("id", c.id); cargar();
                  }} /> Visible
                </label>
                <button style={S.btn("transparent", C.bugambilia, { border: `1px solid ${C.bugambilia}55`, padding: "6px 14px", fontSize: 12 })}
                  onClick={async () => {
                    if (!confirm(`¿Eliminar "${c.nombre}"? Sus productos quedarán sin categoría.`)) return;
                    await supabase.from("categorias").delete().eq("id", c.id); cargar();
                  }}>Eliminar</button>
              </div>
            ))}
          </div>
        )}

        {/* PEDIDOS */}
        {tab === "pedidos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {orders.length === 0 && <div style={{ color: C.crema + "99" }}>Aún no hay pedidos. Cuando un cliente complete su carrito, aparecerá aquí.</div>}
            {orders.map((o) => (
              <div key={o.id} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: C.oro }}>{o.folio} <span style={{ fontSize: 11, color: C.crema + "77" }}>({o.canal})</span></span>
                  <span style={{ fontSize: 12, color: C.crema + "88" }}>{new Date(o.creado).toLocaleString("es-MX")}</span>
                </div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  {o.cliente?.nombre} · {o.cliente?.telefono} · {o.cliente?.direccion}
                </div>
                <div style={{ fontSize: 13, color: C.crema + "CC", lineHeight: 1.7 }}>
                  {(o.items || []).map((i) => <div key={i.id}>{i.qty} × {i.nombre} — {money(i.precio * i.qty, config.moneda)}</div>)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontWeight: 700, color: C.oro }}>{money(o.total, config.moneda)}</span>
                  <select style={{ ...S.input, width: "auto", padding: "6px 10px", fontSize: 12 }} value={o.estado}
                    onChange={async (e) => { await supabase.from("pedidos").update({ estado: e.target.value }).eq("id", o.id); cargar(); }}>
                    {ESTADOS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* REPORTES */}
        {tab === "reportes" && (() => {
          const activos = orders.filter((o) => o.estado !== "cancelado");
          const totalVentas = activos.reduce((s, o) => s + Number(o.total), 0);
          const ticket = activos.length ? totalVentas / activos.length : 0;
          const porEstado = orders.reduce((m, o) => ({ ...m, [o.estado]: (m[o.estado] || 0) + 1 }), {});
          const unidades = {};
          activos.forEach((o) => (o.items || []).forEach((i) => { unidades[i.nombre] = (unidades[i.nombre] || 0) + i.qty; }));
          const top = Object.entries(unidades).sort((x, y) => y[1] - x[1]).slice(0, 5);
          const hoy = new Date();
          const dias = [...Array(7)].map((_, k) => { const d = new Date(hoy); d.setDate(hoy.getDate() - (6 - k)); return d.toISOString().slice(0, 10); });
          const ventasDia = dias.map((f) => activos.filter((o) => (o.creado || "").slice(0, 10) === f).reduce((s, o) => s + Number(o.total), 0));
          const visMapa = Object.fromEntries((visitas || []).map((v) => [String(v.fecha).slice(0, 10), v.total]));
          const visTotal7 = dias.reduce((s, f) => s + (visMapa[f] || 0), 0);
          const fmtDia = (f) => f.slice(8, 10) + "/" + f.slice(5, 7);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 680 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {[["Ventas (sin cancelados)", money(totalVentas, config.moneda)],
                  ["Pedidos", String(orders.length)],
                  ["Ticket promedio", money(ticket, config.moneda)],
                  ["Visitas últimos 7 días", String(visTotal7)]].map(([t, v]) => (
                  <div key={t} style={S.card}>
                    <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: C.oro, fontWeight: 700 }}>{t}</div>
                    <div style={{ fontFamily: T.display, fontSize: 22, marginTop: 6 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={S.label}>Ventas y visitas por día (últimos 7)</div>
                {dias.map((f, k) => (
                  <div key={f} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${C.crema}11` }}>
                    <span>{fmtDia(f)}</span>
                    <span style={{ color: C.oro, fontWeight: 700 }}>{money(ventasDia[k], config.moneda)}</span>
                    <span style={{ color: C.bugambilia, fontWeight: 600 }}>{visMapa[f] || 0} visitas</span>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={S.label}>Top 5 productos (unidades)</div>
                {top.length === 0 && <div style={{ fontSize: 13, color: C.crema + "99" }}>Aún no hay ventas registradas.</div>}
                {top.map(([n, q]) => (
                  <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                    <span>{n}</span><span style={{ fontWeight: 700, color: C.oro }}>{q}</span>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={S.label}>Pedidos por estado</div>
                {Object.entries(porEstado).map(([e, q]) => (
                  <div key={e} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                    <span>{e.replace("_", " ")}</span><span style={{ fontWeight: 700 }}>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* CONFIGURACIÓN */}
        {tab === "config" && cfgDraft && (
          <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 14, maxWidth: 620 }}>
            {[
              ["nombre", "Nombre del negocio"], ["tagline", "Tagline"], ["heroTitulo", "Título principal (hero)"],
              ["heroTexto", "Texto del hero"], ["whatsapp", "WhatsApp con 521 (ej. 5219711234567)"],
              ["telefono", "Teléfono mostrado"], ["email", "Correo"], ["direccion", "Dirección"],
              ["horario", "Horario"], ["mensajeEnvio", "Mensaje de envío (barra superior)"],
            ].map(([k, t]) => (
              <div key={k}><span style={S.label}>{t}</span><input style={S.input} value={cfgDraft[k] ?? ""} onChange={(e) => setCfgDraft({ ...cfgDraft, [k]: e.target.value })} /></div>
            ))}
            <div><span style={S.label}>Envío gratis a partir de (MXN)</span>
              <input style={S.input} type="number" value={cfgDraft.envioGratisDesde} onChange={(e) => setCfgDraft({ ...cfgDraft, envioGratisDesde: Number(e.target.value) })} /></div>
            <div>
              <span style={S.label}>Colores de la marca</span>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {Object.entries(cfgDraft.colores || DEFAULT_COLORS).map(([k, v]) => (
                  <label key={k} style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                    <input type="color" value={v}
                      onChange={(e) => setCfgDraft({ ...cfgDraft, colores: { ...cfgDraft.colores, [k]: e.target.value } })}
                      style={{ width: 44, height: 34, border: "none", background: "none", cursor: "pointer" }} />
                    {COLOR_LABELS[k] || k}
                  </label>
                ))}
              </div>
            </div>
            <button style={S.btn(C.crema, C.fondo)} onClick={guardarConfig}>Guardar configuración</button>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.crema, color: "#FFF9F0", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 999, zIndex: 100, boxShadow: "0 6px 24px #0004", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
