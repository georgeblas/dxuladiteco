// Tipografía: las variables CSS las define next/font en layout.js
export const T = {
  display: "var(--font-display), 'Times New Roman', serif",
  body: "var(--font-body), system-ui, sans-serif",
};

export const DEFAULT_COLORS = {
  fondo: "#FFFDF9",
  superficie: "#F6EFE3",
  crema: "#4A2C17", // color de texto principal (chocolate)
  oro: "#B8862B",
  bugambilia: "#2F7F72", // acento jade
};

export const COLOR_LABELS = {
  fondo: "Fondo",
  superficie: "Paneles",
  crema: "Texto",
  oro: "Dorado",
  bugambilia: "Acento",
};

export const mkStyles = (C) => ({
  btn: (bg, fg, extra = {}) => ({
    background: bg, color: fg, border: "none", borderRadius: 999,
    padding: "12px 22px", fontFamily: T.body, fontWeight: 600, fontSize: 14,
    cursor: "pointer", letterSpacing: ".02em", ...extra,
  }),
  input: {
    width: "100%", boxSizing: "border-box", background: "#FFFFFF",
    border: `1px solid ${C.crema}33`, borderRadius: 10, color: C.crema,
    padding: "10px 12px", fontFamily: T.body, fontSize: 14, outline: "none",
  },
  label: {
    fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
    color: C.oro, fontFamily: T.body, fontWeight: 600, display: "block", marginBottom: 6,
  },
  card: {
    background: C.superficie, borderRadius: 14, padding: 16,
    border: `1px solid ${C.crema}14`,
  },
  h: (size) => ({
    fontFamily: T.display, fontWeight: 400, letterSpacing: ".06em",
    textTransform: "uppercase", color: C.crema, fontSize: size, margin: 0,
  }),
});
