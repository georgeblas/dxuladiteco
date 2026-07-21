-- ============================================================
-- DXULADITECO — Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase -> SQL Editor -> New query
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. TABLAS
-- ------------------------------------------------------------
create table if not exists categorias (
  id      text primary key,
  nombre  text not null,
  orden   int  not null default 0,
  visible boolean not null default true
);

create table if not exists productos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  categoria   text references categorias(id) on delete set null,
  precio      numeric(10,2) not null check (precio >= 0),
  descripcion text default '',
  imagen_url  text default '',
  stock       int not null default 0 check (stock >= 0),
  destacado   boolean not null default false,
  mas_vendido boolean not null default false,
  activo      boolean not null default true,
  creado      timestamptz not null default now()
);

create table if not exists pedidos (
  id      uuid primary key default gen_random_uuid(),
  folio   text unique not null,
  cliente jsonb not null,
  items   jsonb not null,
  total   numeric(10,2) not null,
  estado  text not null default 'nuevo'
          check (estado in ('nuevo','pendiente_pago','confirmado','enviado','entregado','cancelado')),
  canal   text not null default 'whatsapp' check (canal in ('whatsapp','mercadopago')),
  pago_id text,
  creado  timestamptz not null default now()
);

create table if not exists configuracion (
  clave text primary key,
  valor jsonb not null
);

create index if not exists idx_productos_categoria on productos(categoria) where activo;
create index if not exists idx_pedidos_estado on pedidos(estado);

-- ------------------------------------------------------------
-- 2. DATOS SEMILLA
-- ------------------------------------------------------------
insert into categorias (id, nombre, orden) values
  ('barras',     'Barras de Chocolate',   1),
  ('sinazucar',  'Chocolate Sin Azúcar',  2),
  ('reposteria', 'Repostería',            3),
  ('cacao',        'Cacao',                 4),
  ('concentrados', 'Concentrados',          5),
  ('moles',        'Moles',                 6),
  ('salsas',       'Salsas',                7)
on conflict (id) do nothing;

insert into productos (nombre, categoria, precio, descripcion, stock, destacado) values
  ('Tablilla clásica con canela 500g', 'barras',     145, 'Cacao tostado y molido en piedra con canela de Ceilán y azúcar. Para agua o leche.', 40, true),
  ('Barra 70% cacao istmeño 90g',      'barras',      95, 'Barra intensa de cacao criollo del Istmo, molienda gruesa tradicional.',             25, true),
  ('Barra con almendra 90g',           'barras',     105, 'Chocolate semiamargo con almendra tostada troceada.',                                18, false),
  ('Tablilla sin azúcar 500g',         'sinazucar',  175, 'Solo cacao y canela. Endulza a tu gusto o disfrútalo puro.',                         20, true),
  ('Barra 100% cacao 90g',             'sinazucar',  110, 'Cacao puro sin ningún endulzante. Para los que saben.',                              15, false),
  ('Cobertura para repostería 1kg',    'reposteria', 320, 'Chocolate semiamargo en trozo para fundir: pasteles, tamales y bebidas.',            12, true),
  ('Cocoa natural 250g',               'reposteria',  95, 'Polvo de cacao natural sin alcalinizar, ideal para hornear.',                        30, false),
  ('Cacao tostado en grano 500g',      'cacao',      190, 'Grano seleccionado, tostado en comal. Listo para moler o botanear.',                 22, true),
  ('Nibs de cacao 200g',               'cacao',        120, 'Cacao tostado y quebrado. Para licuados, avena o repostería.',                      28, false),
  ('Concentrado de horchata 1L',       'concentrados', 120, 'Horchata artesanal concentrada con canela; rinde hasta 5 litros.',                  15, false),
  ('Concentrado de jamaica 1L',        'concentrados', 110, 'Flor de jamaica concentrada, lista para diluir al gusto.',                          15, false),
  ('Mole negro istmeño 500g',          'moles',        220, 'Pasta de mole negro con chocolate del molino y chiles tostados en comal.',          10, true),
  ('Mole rojo 500g',                   'moles',        200, 'Mole rojo tradicional, listo para preparar con caldo.',                             10, false),
  ('Salsa de chile pasilla 250g',      'salsas',        85, 'Salsa artesanal de chile pasilla oaxaqueño, ahumada y con carácter.',               20, false);

update productos set mas_vendido = true
 where nombre in ('Tablilla clásica con canela 500g','Barra 70% cacao istmeño 90g',
                  'Tablilla sin azúcar 500g','Cacao tostado en grano 500g','Mole negro istmeño 500g');

insert into configuracion (clave, valor) values ('site', '{
  "nombre": "Dxuladiteco",
  "tagline": "Chocolate artesanal del Istmo de Tehuantepec",
  "heroTitulo": "Dxuladi: chocolate en zapoteco, de la piedra del molino a tu taza",
  "heroTexto": "Cacao, canela y las manos más expertas de Juchitán de las Flores, Oaxaca. Así se muele el orgullo del Istmo.",
  "whatsapp": "5219711234567",
  "telefono": "971 123 4567",
  "email": "hola@dxuladiteco.mx",
  "direccion": "Istmo de Tehuantepec, Oaxaca",
  "horario": "Lun a Sáb · 9am – 7pm",
  "envioGratisDesde": 800,
  "mensajeEnvio": "Envíos a todo México · Gratis arriba de $800 MXN",
  "moneda": "MXN",
  "colores": {
    "fondo": "#FFFDF9",
    "superficie": "#F6EFE3",
    "crema": "#4A2C17",
    "oro": "#B8862B",
    "bugambilia": "#2F7F72"
  }
}'::jsonb)
on conflict (clave) do nothing;

-- ------------------------------------------------------------
-- 3. FUNCIÓN TRANSACCIONAL: crear pedido + descontar stock
--    security definer: precios y stock se validan en servidor;
--    el cliente nunca decide el total.
-- ------------------------------------------------------------
create sequence if not exists pedidos_folio_seq;

create or replace function crear_pedido(p_cliente jsonb, p_items jsonb, p_canal text default 'whatsapp')
returns table (folio text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folio  text := 'DXU-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('pedidos_folio_seq')::text, 4, '0');
  v_total  numeric := 0;
  v_items  jsonb := '[]'::jsonb;
  itm      jsonb;
  v_prod   productos%rowtype;
  v_qty    int;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  for itm in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((itm->>'qty')::int, 1));

    select * into v_prod
    from productos
    where id = (itm->>'id')::uuid and activo
    for update;

    if not found then
      raise exception 'Producto no disponible';
    end if;
    if v_prod.stock < v_qty then
      raise exception 'Stock insuficiente para %', v_prod.nombre;
    end if;

    update productos set stock = stock - v_qty where id = v_prod.id;

    v_total := v_total + v_prod.precio * v_qty;
    v_items := v_items || jsonb_build_object(
      'id', v_prod.id, 'nombre', v_prod.nombre,
      'qty', v_qty, 'precio', v_prod.precio
    );
  end loop;

  insert into pedidos (folio, cliente, items, total, canal, estado)
  values (v_folio, p_cliente, v_items, v_total, p_canal,
          case when p_canal = 'mercadopago' then 'pendiente_pago' else 'nuevo' end);

  return query select v_folio, v_total;
end;
$$;

grant execute on function crear_pedido(jsonb, jsonb, text) to anon, authenticated;


-- Repone el stock de un pedido cancelado (idempotente por estado)
create or replace function reponer_stock(p_folio text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  itm jsonb;
  v_items jsonb;
begin
  select items into v_items from pedidos where folio = p_folio;
  if v_items is null then return; end if;
  for itm in select * from jsonb_array_elements(v_items) loop
    update productos
       set stock = stock + (itm->>'qty')::int
     where id = (itm->>'id')::uuid;
  end loop;
end;
$$;
-- Solo la usa el servidor (service_role); no se otorga a anon.

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table categorias    enable row level security;
alter table productos     enable row level security;
alter table pedidos       enable row level security;
alter table configuracion enable row level security;

create policy "cat_lectura_publica"  on categorias    for select using (visible);
create policy "prod_lectura_publica" on productos     for select using (activo);
create policy "conf_lectura_publica" on configuracion for select using (true);

create policy "cat_admin"  on categorias    for all to authenticated using (true) with check (true);
create policy "prod_admin" on productos     for all to authenticated using (true) with check (true);
create policy "conf_admin" on configuracion for all to authenticated using (true) with check (true);
create policy "ped_admin"  on pedidos       for all to authenticated using (true) with check (true);
-- El público NO lee ni escribe pedidos directamente;
-- solo mediante crear_pedido() (security definer).

-- ------------------------------------------------------------
-- 5. STORAGE: bucket público para fotos de productos
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

create policy "fotos_lectura_publica" on storage.objects
  for select using (bucket_id = 'productos');
create policy "fotos_admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'productos') with check (bucket_id = 'productos');

-- ------------------------------------------------------------
-- 6. USUARIO ADMIN
-- Crear en: Supabase -> Authentication -> Users -> Add user
-- (correo + contraseña; con eso inicias sesión en /admin)
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 7. MIGRACIÓN (solo si ya habías ejecutado este esquema antes):
--    textos nuevos del hero. Descomenta y ejecuta:
-- update configuracion
--    set valor = valor
--        || jsonb_build_object('heroTitulo', 'Dxuladi: chocolate en zapoteco, de la piedra del molino a tu taza')
--        || jsonb_build_object('heroTexto', 'Cacao, canela y las manos más expertas de Juchitán de las Flores, Oaxaca. Así se muele el orgullo del Istmo.')
--  where clave = 'site';
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 8. MIGRACIÓN — nuevas líneas de producto (solo si ya habías
--    ejecutado el esquema). Las categorías usan upsert; los
--    productos se insertan una sola vez:
-- insert into categorias (id, nombre, orden) values
--   ('concentrados','Concentrados',5),('moles','Moles',6),('salsas','Salsas',7)
-- on conflict (id) do nothing;
-- insert into productos (nombre, categoria, precio, descripcion, stock, destacado)
-- select * from (values
--   ('Concentrado de horchata 1L','concentrados',120::numeric,'Horchata artesanal concentrada con canela; rinde hasta 5 litros.',15,false),
--   ('Concentrado de jamaica 1L','concentrados',110,'Flor de jamaica concentrada, lista para diluir al gusto.',15,false),
--   ('Mole negro istmeño 500g','moles',220,'Pasta de mole negro con chocolate del molino y chiles tostados en comal.',10,true),
--   ('Mole rojo 500g','moles',200,'Mole rojo tradicional, listo para preparar con caldo.',10,false),
--   ('Salsa de chile pasilla 250g','salsas',85,'Salsa artesanal de chile pasilla oaxaqueño, ahumada y con carácter.',20,false)
-- ) as v(nombre,categoria,precio,descripcion,stock,destacado)
-- where not exists (select 1 from productos p where p.nombre = v.nombre);
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 9. MIGRACIÓN — "más vendidos" en la cinta (solo si ya habías
--    ejecutado el esquema):
-- alter table productos add column if not exists mas_vendido boolean not null default false;
-- update productos set mas_vendido = true
--  where nombre in ('Tablilla clásica con canela 500g','Barra 70% cacao istmeño 90g',
--                   'Tablilla sin azúcar 500g','Cacao tostado en grano 500g','Mole negro istmeño 500g');
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 10. ILUSTRACIONES DE EJEMPLO (idempotente; asigna la ilustración
--     solo si el producto aún no tiene foto propia):
-- update productos set imagen_url = '/img/tablilla-clasica.svg' where nombre = 'Tablilla clásica con canela 500g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/barra-70.svg' where nombre = 'Barra 70% cacao istmeño 90g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/barra-almendra.svg' where nombre = 'Barra con almendra 90g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/tablilla-sin-azucar.svg' where nombre = 'Tablilla sin azúcar 500g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/barra-100.svg' where nombre = 'Barra 100% cacao 90g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/cobertura.svg' where nombre = 'Cobertura para repostería 1kg' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/cocoa.svg' where nombre = 'Cocoa natural 250g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/cacao-grano.svg' where nombre = 'Cacao tostado en grano 500g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/nibs.svg' where nombre = 'Nibs de cacao 200g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/horchata.svg' where nombre = 'Concentrado de horchata 1L' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/jamaica.svg' where nombre = 'Concentrado de jamaica 1L' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/mole-negro.svg' where nombre = 'Mole negro istmeño 500g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/mole-rojo.svg' where nombre = 'Mole rojo 500g' and (imagen_url is null or imagen_url = '');
-- update productos set imagen_url = '/img/salsa-pasilla.svg' where nombre = 'Salsa de chile pasilla 250g' and (imagen_url is null or imagen_url = '');
-- Descomenta y ejecuta este bloque una vez. Cuando subas fotos
-- reales desde el panel, simplemente las reemplazan.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 11. VISITAS — contador diario (idempotente; sirve igual para
--     esquemas nuevos o ya ejecutados):
create table if not exists visitas (
  fecha date primary key,
  total int not null default 0
);
alter table visitas enable row level security;
drop policy if exists "visitas_admin" on visitas;
create policy "visitas_admin" on visitas for select to authenticated using (true);

create or replace function registrar_visita()
returns void
language sql
security definer
set search_path = public
as $$
  insert into visitas (fecha, total) values (current_date, 1)
  on conflict (fecha) do update set total = visitas.total + 1;
$$;
grant execute on function registrar_visita() to anon, authenticated;
-- ------------------------------------------------------------
