"use client";
import { money } from "@/lib/format";
import { T } from "@/lib/theme";
import { CacaoIcon } from "@/components/Icons";

/*
  Cinta infinita de productos (estilo marquee):
  - La pista contiene la lista duplicada; al desplazarse -50% el loop es
    imperceptible y continuo.
  - Cada pieza además "flota" con su propia animación (duración y delay
    distintos por índice) para dar movimiento individual.
  - Se pausa al pasar el cursor/dedo y se desactiva con
    prefers-reduced-motion (regla global en globals.css).
*/
export default function ProductMarquee({ products, config, onPick, grande = false }) {
  const R = grande ? { circulo: 200, item: 210, icono: 90, fuente: 13, pad: "26px 0 34px" }
                   : { circulo: 120, item: 130, icono: 56, fuente: 12, pad: "38px 0 30px" };
  const C = config.colores;
  const disponibles = products.filter((p) => p.stock > 0);
  const masVendidos = disponibles.filter((p) => p.mas_vendido);
  const items = (masVendidos.length >= 3 ? masVendidos : disponibles).slice(0, 12);
  if (items.length < 3) return null;
  const track = [...items, ...items]; // duplicado para loop continuo

  return (
    <section aria-label="Nuestros productos en movimiento" style={{ background: C.fondo, padding: R.pad, overflow: "hidden" }}>
      <div style={{ textAlign: "center", fontFamily: T.body, fontSize: 12, letterSpacing: ".2em", color: C.oro, fontWeight: 700, textTransform: "uppercase", marginBottom: 22 }}>
        El cacao molido como lo hacían nuestras abuelas
      </div>

      <div className="dxu-marquee" style={{ display: "flex", width: "max-content" }}>
        {track.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onPick && onPick(p)}
            aria-label={p.nombre}
            className="dxu-float"
            style={{
              animationDuration: `${3.2 + (idx % 5) * 0.55}s`,
              animationDelay: `${(idx % 7) * 0.35}s`,
              background: "none", border: "none", cursor: "pointer",
              margin: "0 14px", padding: 0, textAlign: "center", width: R.item, flexShrink: 0,
            }}
          >
            <div style={{
              width: R.circulo, height: R.circulo, borderRadius: "50%", overflow: "hidden", margin: "0 auto",
              background: `linear-gradient(140deg, ${C.superficie}, #FFFFFF)`,
              border: `2px solid ${C.oro}55`, boxShadow: "0 8px 20px rgba(74,44,23,.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {p.imagen_url
                ? <img src={p.imagen_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <CacaoIcon size={R.icono} color={C.oro} />}
            </div>
            <div style={{ fontFamily: T.body, fontSize: R.fuente, fontWeight: 600, color: C.crema, marginTop: 10, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {p.nombre}
            </div>
            <div style={{ fontFamily: T.body, fontSize: R.fuente, fontWeight: 700, color: C.oro, marginTop: 2 }}>
              {money(p.precio, config.moneda)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
