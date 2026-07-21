"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { T } from "@/lib/theme";

export default function ProductForm({ initial, categories, C, S, onSaved, onCancel }) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const f = (k) => (e) => setD({ ...d, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });

  /* Sube la foto al bucket 'productos' y guarda la URL pública */
  const subirFoto = async (file) => {
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/\s+/g, "-").toLowerCase()}`;
    const { error } = await supabase.storage.from("productos").upload(path, file, { upsert: false });
    if (!error) {
      const { data } = supabase.storage.from("productos").getPublicUrl(path);
      setD((x) => ({ ...x, imagen_url: data.publicUrl }));
    }
    setUploading(false);
  };

  const guardar = async () => {
    setSaving(true);
    const row = {
      nombre: d.nombre, categoria: d.categoria, precio: d.precio, stock: d.stock,
      descripcion: d.descripcion, imagen_url: d.imagen_url || "",
      destacado: !!d.destacado, mas_vendido: !!d.mas_vendido, activo: d.activo !== false,
    };
    const q = d.id
      ? supabase.from("productos").update(row).eq("id", d.id)
      : supabase.from("productos").insert(row);
    const { error } = await q;
    setSaving(false);
    if (!error) onSaved();
    else alert(error.message);
  };

  return (
    <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: T.display, letterSpacing: ".04em", color: C.crema }}>{d.id ? "Editar producto" : "Nuevo producto"}</div>
      <div><span style={S.label}>Nombre</span><input style={S.input} value={d.nombre} onChange={f("nombre")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><span style={S.label}>Precio</span><input style={S.input} type="number" value={d.precio} onChange={f("precio")} /></div>
        <div><span style={S.label}>Stock</span><input style={S.input} type="number" value={d.stock} onChange={f("stock")} /></div>
      </div>
      <div>
        <span style={S.label}>Categoría</span>
        <select style={S.input} value={d.categoria || ""} onChange={f("categoria")}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <div><span style={S.label}>Descripción</span><textarea style={{ ...S.input, minHeight: 70 }} value={d.descripcion || ""} onChange={f("descripcion")} /></div>
      <div>
        <span style={S.label}>Foto del producto</span>
        <input type="file" accept="image/*" onChange={(e) => subirFoto(e.target.files?.[0])} style={{ fontFamily: T.body, fontSize: 13, color: C.crema }} />
        {uploading && <div style={{ fontSize: 12, color: C.oro }}>Subiendo…</div>}
        {d.imagen_url && <img src={d.imagen_url} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10, marginTop: 8 }} />}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.crema }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={!!d.destacado} onChange={(e) => setD({ ...d, destacado: e.target.checked })} /> Destacado
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={!!d.mas_vendido} onChange={(e) => setD({ ...d, mas_vendido: e.target.checked })} /> Más vendido (cinta)
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={d.activo !== false} onChange={(e) => setD({ ...d, activo: e.target.checked })} /> Visible en tienda
        </label>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn(C.crema, C.fondo), flex: 1, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={guardar}>{saving ? "Guardando…" : "Guardar"}</button>
        <button style={S.btn("transparent", C.crema, { border: `1px solid ${C.crema}44` })} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
