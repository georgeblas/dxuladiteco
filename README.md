# Dxuladiteco — Tienda en línea

Chocolate artesanal del Istmo de Tehuantepec. Next.js 14 + Supabase + Vercel.

**Fase 1 (esta versión):** pedidos por WhatsApp con registro en base de datos. **Fase 2 (planeada):** pagos en línea con Mercado Pago — el esquema de BD ya está preparado (columna `canal`, estado `pendiente_pago`, función `reponer_stock`), así que activarla no requerirá migraciones.

## Arquitectura

```
Navegador ── Next.js (Vercel) ──┬── Supabase PostgreSQL (catálogo, pedidos, config)
                                ├── Supabase Storage    (fotos de productos)
                                └── Supabase Auth       (login del panel /admin)
Cliente ──── WhatsApp Business  (confirmación y cobro: transferencia/efectivo)
```

| Ruta | Qué es |
|---|---|
| `/` | Tienda (ISR, revalida cada 60 s) |
| `/admin` | Panel del negocio (requiere usuario de Supabase Auth) |
| `supabase/schema.sql` | Todo el esquema: tablas, semilla, RPCs, RLS, Storage |

## Objetos de base de datos

- Tablas: `categorias`, `productos`, `pedidos`, `configuracion`
- `crear_pedido(cliente, items, canal)` — RPC transaccional: valida stock, toma precios de la BD (el cliente nunca decide el total), descuenta inventario y genera folio `DXU-AAMMDD-0001`
- `reponer_stock(folio)` — regresa inventario de pedidos cancelados (en fase 1 puedes ejecutarla a mano desde SQL Editor si cancelas un pedido; en fase 2 la invocará el webhook de pagos)
- RLS: el público solo lee catálogo y configuración; los pedidos solo se crean vía RPC y solo el admin autenticado los lee/edita
- Bucket `productos` (público) para fotos, con subida restringida a usuarios autenticados

## Puesta en marcha local

1. **Requisitos**: Node 18+.
2. **Instalar**: `npm install`
3. **Supabase**: crea un proyecto en supabase.com → SQL Editor → pega y ejecuta `supabase/schema.sql` completo (crea tablas, datos de ejemplo, funciones, políticas y el bucket de fotos).
4. **Usuario admin**: Supabase → Authentication → Users → *Add user* (correo + contraseña). Con eso entras a `/admin`.
5. **Variables**: copia `.env.example` a `.env.local` y llena:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
6. **Correr**: `npm run dev` → http://localhost:3000

## Probar el flujo de pedidos

1. Agrega productos al carrito → *Continuar* → llena nombre/teléfono/dirección → *Enviar pedido por WhatsApp*.
2. Verifica: se abre WhatsApp con el mensaje armado (folio, productos, total) y el pedido aparece en `/admin` → Pedidos con estado `nuevo` y el stock ya descontado.
3. El cobro se acuerda por WhatsApp: transferencia, efectivo contra entrega o depósito.

## Deploy en Vercel

1. Sube el repo a GitHub (`git init && git add . && git commit -m "v1" && git push`).
2. vercel.com → *Add New Project* → importa el repo (detecta Next.js solo).
3. Environment Variables: las 3 del `.env.local`, con `NEXT_PUBLIC_SITE_URL=https://tudominio.mx`.
4. Deploy → obtienes `*.vercel.app` con SSL.
5. Dominio propio: Settings → Domains → agrega el dominio y crea en tu registrador el registro `A @ 76.76.21.21` y `CNAME www cname.vercel-dns.com`.

## Operación diaria

- Productos, fotos, categorías, pedidos y hasta los colores/textos del sitio se administran desde `/admin` en el celular.
- El catálogo público se refresca solo (ISR 60 s); no necesitas redeploy para cambios de contenido.
- Los pedidos entran con estado `nuevo`; tú los avanzas a `confirmado` → `enviado` → `entregado` desde el panel conforme cobras y entregas.

## Fase 2 (cuando decidas activar pagos en línea)

Lo que se agregará — sin tocar la base de datos, ya está lista:
1. Dependencia `mercadopago` + `MP_ACCESS_TOKEN` y `SUPABASE_SERVICE_ROLE_KEY` en variables de entorno.
2. `/api/checkout` (crea preferencia con `external_reference` = folio) y `/api/webhook` (confirma pagos y repone stock en rechazos con `reponer_stock`).
3. Botón "Pagar en línea" junto al de WhatsApp y páginas `/gracias` y `/pago-fallido`.
4. Aviso de privacidad y términos (obligatorio al cobrar en línea).

Después: facturación CFDI 4.0 con Facturapi y cotización de envíos (Skydropx/T1Envíos).
