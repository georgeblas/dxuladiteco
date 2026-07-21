export const money = (n, cur = "MXN") =>
  "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 }) + " " + cur;
