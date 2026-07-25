"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/format";
import { T, mkStyles } from "@/lib/theme";
import { Greca, CacaoIcon, BagIcon, WhatsIcon } from "@/components/Icons";
import ProductMarquee from "@/components/ProductMarquee";

const CART_KEY = "dxu-cart";

export default function StoreFront({ config, categories, products }) {
  const C = config.colores;
  const S = mkStyles(C);

  const [catFilter, setCatFilter] = useState("todo");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [cliente, setCliente] = useState({ nombre: "", telefono: "", direccion: "", notas: "" });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");

  /* carrito persistente en el navegador */
  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(CART_KEY) || "[]")); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
  }, [cart]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  const addToCart = (id) => {
    setCart((c) => {
      const f = c.find((i) => i.id === id);
      return f ? c.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { id, qty: 1 }];
    });
    showToast("Agregado al carrito");
  };
  const setQty = (id, qty) =>
    setCart((c) => (qty <= 0 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, qty } : i))));

  const cartItems = cart.map((i) => ({ ...i, prod: products.find((p) => p.id === i.id) })).filter((i) => i.prod);
  const cartTotal = cartItems.reduce((s, i) => s + i.prod.precio * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const visible = useMemo(() => {
    let l = products;
    if (catFilter !== "todo") l = l.filter((p) => p.categoria === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter((p) => (p.nombre + " " + (p.descripcion || "")).toLowerCase().includes(q));
    }
    return l;
  }, [products, catFilter, search]);

  /* ---- Pedido por WhatsApp: RPC transaccional + wa.me ---- */
  const pedirPorWhatsApp = async () => {
    setSending(true);
    const { data, error } = await supabase.rpc("crear_pedido", {
      p_cliente: cliente,
      p_items: cartItems.map((i) => ({ id: i.id, qty: i.qty })),
      p_canal: "whatsapp",
    });
    setSending(false);
    if (error) { showToast(error.message || "No se pudo registrar el pedido"); return; }
    const { folio, total } = data[0];
    const lineas = cartItems.map((i) => `• ${i.qty} x ${i.prod.nombre} — ${money(i.prod.precio * i.qty, config.moneda)}`).join("\n");
    const envio = total >= config.envioGratisDesde ? "Envío GRATIS" : "Envío por cotizar";
    const msg = `Hola ${config.nombre} 👋\nPedido *${folio}*\n\n${lineas}\n\nTotal: *${money(total, config.moneda)}*\n${envio}\n\nNombre: ${cliente.nombre}\nTel: ${cliente.telefono}\nEntrega: ${cliente.direccion}\n${cliente.notas ? "Notas: " + cliente.notas : ""}`;
    window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    setCart([]); setCheckout(false); setCartOpen(false);
    setCliente({ nombre: "", telefono: "", direccion: "", notas: "" });
    showToast("Pedido " + folio + " registrado");
  };

  const productCard = (p) => (
    <div key={p.id}
      style={{ background: "#FFFFFF", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", border: `1px solid ${C.crema}1A`, cursor: "pointer", boxShadow: "0 2px 10px rgba(74,44,23,.05)" }}
      onClick={() => setDetail(p)}>
      <div style={{ aspectRatio: "1", background: `linear-gradient(140deg, ${C.superficie}, ${C.fondo})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {p.imagen_url
          ? <img src={p.imagen_url} alt={p.nombre} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
          : <CacaoIcon size={64} color={C.oro + "88"} />}
        {p.destacado && (
          <span style={{ position: "absolute", top: 10, left: 10, background: C.bugambilia, color: "#FFF7EC", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", padding: "4px 10px", borderRadius: 999, fontFamily: T.body }}>DESTACADO</span>
        )}
        {p.stock <= 0 && (
          <span style={{ position: "absolute", inset: 0, background: "#000a", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.body, fontWeight: 700, letterSpacing: ".1em" }}>AGOTADO</span>
        )}
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ fontFamily: T.display, fontSize: 16, color: C.crema, lineHeight: 1.3 }}>{p.nombre}</div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontFamily: T.body, fontWeight: 700, color: C.oro, fontSize: 15 }}>{money(p.precio, config.moneda)}</span>
          <button style={S.btn(C.crema, C.fondo, { padding: "8px 14px", fontSize: 12, opacity: p.stock <= 0 ? 0.5 : 1 })}
            disabled={p.stock <= 0}
            onClick={(e) => { e.stopPropagation(); addToCart(p.id); }}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.fondo, fontFamily: T.body, color: C.crema }}>
      {/* barra de anuncio */}
      <div style={{ background: C.bugambilia, color: "#FFF7EC", textAlign: "center", fontFamily: T.body, fontSize: 12, fontWeight: 600, letterSpacing: ".06em", padding: "7px 12px" }}>
        {config.mensajeEnvio}
      </div>

      {/* header */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: C.fondo + "F5", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.crema}1A`, boxShadow: "0 1px 8px rgba(74,44,23,.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: T.display, fontSize: 20, letterSpacing: ".14em", textTransform: "uppercase", color: C.crema, lineHeight: 1.1, whiteSpace: "nowrap" }}>{config.nombre}</div>
              <svg width="158" height="9" viewBox="0 0 158 9" aria-hidden="true" style={{ display: "block", marginTop: 3 }}>
                <path d="M1 7 H7 V2 H15 V7 H23 V2 H31 V7 H39 V2 H47 V7 H55 V2 H63 V7 H71 V2 H79 V7 H87 V2 H95 V7 H103 V2 H111 V7 H119 V2 H127 V7 H135 V2 H143 V7 H151 V2 H157" fill="none" stroke={C.oro} strokeWidth="1.8" />
              </svg>
            </div>
          </div>
          <a href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hola " + config.nombre + ", quiero hacer un pedido")}`} target="_blank" rel="noreferrer"
             aria-label="Pedir por WhatsApp" title="WhatsApp" style={{ display: "flex", padding: 4 }}>
            <WhatsIcon size={26} />
          </a>
          <button onClick={() => setCartOpen(true)} aria-label="Abrir carrito" title="Carrito"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <BagIcon count={cartCount} color={C.crema} accent={C.oro} />
          </button>
        </div>
      </header>

      {/* cinta de productos en movimiento — protagonista bajo el header */}
      <ProductMarquee grande products={products} config={config} onPick={(p) => setDetail(p)} />

      {/* separador decorativo (hero de texto removido a solicitud de pruebas; campos heroTitulo/heroTexto siguen en /admin) */}
      <div style={{ background: C.fondo, padding: "22px 0" }}>
        <Greca id="hero" color={C.oro} />
      </div>

      {/* catálogo */}
      <section id="catalogo" style={{ maxWidth: 1100, margin: "0 auto", padding: "34px 18px 60px" }}>
        <h2 style={{ ...S.h(24), marginBottom: 18 }}>Productos</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "18px 0 14px" }}>
          {[{ id: "todo", nombre: "Ver todo" }, ...categories].map((c) => (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              style={S.btn(catFilter === c.id ? C.crema : "transparent", catFilter === c.id ? C.fondo : C.crema, {
                border: `1px solid ${catFilter === c.id ? C.crema : C.crema + "33"}`, padding: "8px 16px", fontSize: 13,
              })}>
              {c.nombre}
            </button>
          ))}
        </div>
        <input style={{ ...S.input, maxWidth: 340, marginBottom: 22 }} placeholder="Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} />

        {visible.length === 0 ? (
          <div style={{ color: C.crema + "99", padding: "40px 0" }}>No hay productos en esta categoría todavía.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 14 }}>
            {visible.map(productCard)}
          </div>
        )}
      </section>

      {/* historia */}
      <section style={{ background: C.superficie }}>
        <Greca id="h1" color={C.bugambilia} />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 18px", display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {[
            ["Molido en piedra", "Tostamos y molemos el cacao como se ha hecho por generaciones en el Istmo."],
            ["Ingredientes de origen", "Cacao seleccionado y canela de Ceilán. Nada de saborizantes ni rellenos."],
            ["Del Istmo para México", config.mensajeEnvio],
          ].map(([t, d]) => (
            <div key={t}>
              <div style={{ fontFamily: T.display, fontSize: 19, color: C.oro, marginBottom: 8, letterSpacing: ".04em" }}>{t}</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: C.crema + "CC" }}>{d}</div>
            </div>
          ))}
        </div>
        <Greca id="h2" color={C.bugambilia} />
      </section>

      {/* footer */}
      <footer style={{ padding: "36px 18px 90px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div>
            <div style={S.h(20)}>{config.nombre}</div>
            <div style={{ fontSize: 13, color: C.crema + "99", marginTop: 6 }}>{config.tagline}</div>
          </div>
          <div style={{ fontSize: 13, color: C.crema + "CC", lineHeight: 1.9 }}>
            <div style={S.label}>Contacto</div>
            WhatsApp: {config.telefono}<br />{config.email}<br />{config.direccion}<br />{config.horario}
          </div>
          <div>
            <div style={S.label}>Administración</div>
            <Link href="/admin" style={{ ...S.btn("transparent", C.crema + "88", { border: `1px solid ${C.crema}22`, fontSize: 12, padding: "8px 14px" }), textDecoration: "none", display: "inline-block" }}>
              Panel del negocio
            </Link>
          </div>
        </div>
      </footer>

      {/* detalle de producto */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#000a", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setDetail(null)}>
          <div style={{ background: C.fondo, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", background: `linear-gradient(140deg, ${C.superficie}, ${C.fondo})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              {detail.imagen_url ? <img src={detail.imagen_url} alt={detail.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <CacaoIcon size={80} color={C.oro + "88"} />}
            </div>
            <div style={{ fontFamily: T.display, fontSize: 24, letterSpacing: ".03em" }}>{detail.nombre}</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: C.oro, margin: "8px 0" }}>{money(detail.precio, config.moneda)}</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: C.crema + "CC" }}>{detail.descripcion}</p>
            <div style={{ fontSize: 12, color: C.crema + "88", marginBottom: 16 }}>
              {detail.stock > 0 ? `Disponibles: ${detail.stock}` : "Agotado por el momento"}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.btn(C.crema, C.fondo), flex: 1, opacity: detail.stock <= 0 ? 0.5 : 1 }} disabled={detail.stock <= 0}
                onClick={() => { addToCart(detail.id); setDetail(null); }}>
                Agregar al carrito
              </button>
              <button style={S.btn("transparent", C.crema, { border: `1px solid ${C.crema}44` })} onClick={() => setDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* carrito */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "#000a", display: "flex", justifyContent: "flex-end" }} onClick={() => { setCartOpen(false); setCheckout(false); }}>
          <div style={{ background: C.fondo, width: "100%", maxWidth: 420, height: "100%", display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.crema}22` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.crema}18`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: T.display, fontSize: 20, letterSpacing: ".04em" }}>Tu carrito</span>
              <button style={S.btn("transparent", C.crema, { border: "none", fontSize: 20, padding: 4 })} onClick={() => { setCartOpen(false); setCheckout(false); }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {cartItems.length === 0 && (
                <div style={{ color: C.crema + "99", fontSize: 14 }}>Tu carrito está vacío. Échale un ojo al catálogo, el chocolate no se pide solo.</div>
              )}
              {cartItems.map((i) => (
                <div key={i.id} style={{ display: "flex", gap: 12, alignItems: "center", background: C.superficie, borderRadius: 12, padding: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 10, background: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                    {i.prod.imagen_url ? <img src={i.prod.imagen_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <CacaoIcon size={26} color={C.oro} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.prod.nombre}</div>
                    <div style={{ fontSize: 13, color: C.oro, fontWeight: 700 }}>{money(i.prod.precio * i.qty, config.moneda)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button style={S.btn("#FFF", C.crema, { border: `1px solid ${C.crema}33`, padding: "4px 11px" })} onClick={() => setQty(i.id, i.qty - 1)}>−</button>
                    <span style={{ minWidth: 16, textAlign: "center" }}>{i.qty}</span>
                    <button style={S.btn("#FFF", C.crema, { border: `1px solid ${C.crema}33`, padding: "4px 10px" })} onClick={() => setQty(i.id, Math.min(i.qty + 1, i.prod.stock))}>+</button>
                  </div>
                </div>
              ))}

              {checkout && cartItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
                  <div><span style={S.label}>Tu nombre</span><input style={S.input} value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} /></div>
                  <div><span style={S.label}>Teléfono</span><input style={S.input} value={cliente.telefono} onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })} /></div>
                  <div><span style={S.label}>Dirección o punto de entrega</span><input style={S.input} value={cliente.direccion} onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })} /></div>
                  <div><span style={S.label}>Notas (opcional)</span><input style={S.input} value={cliente.notas} onChange={(e) => setCliente({ ...cliente, notas: e.target.value })} /></div>
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div style={{ padding: 20, borderTop: `1px solid ${C.crema}18` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Total</span><span style={{ fontWeight: 700, color: C.oro }}>{money(cartTotal, config.moneda)}</span>
                </div>
                <div style={{ fontSize: 12, color: cartTotal >= config.envioGratisDesde ? C.bugambilia : C.crema + "88", marginBottom: 12 }}>
                  {cartTotal >= config.envioGratisDesde
                    ? "✓ Tu pedido califica para envío gratis"
                    : `Te faltan ${money(config.envioGratisDesde - cartTotal, config.moneda)} para envío gratis`}
                </div>
                {!checkout ? (
                  <button style={{ ...S.btn(C.crema, C.fondo), width: "100%" }} onClick={() => setCheckout(true)}>Continuar</button>
                ) : (
                  <button
                    style={{ ...S.btn("#25D366", "#0b2b16"), width: "100%", opacity: cliente.nombre && cliente.direccion && !sending ? 1 : 0.5 }}
                    disabled={!cliente.nombre || !cliente.direccion || sending}
                    onClick={pedirPorWhatsApp}>
                    {sending ? "Registrando…" : "Enviar pedido por WhatsApp"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.crema, color: "#FFF9F0", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 999, zIndex: 100, boxShadow: "0 6px 24px #0004", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
