# CiudadActiva 🏙️

**[🇬🇧🇺🇸 Read in English / Leer en Inglés](./README.md)**

> Una plataforma de reportes ciudadanos que empodera a los vecinos para reportar problemas urbanos directamente a su municipalidad — con fotos, ubicación exacta y respaldo de la comunidad.

Desarrollado para el [DEV Weekend Challenge](https://dev.to/devteam/happening-now-dev-weekend-challenge-submissions-due-march-2-at-759am-utc-5fg8?) 🏆

[![Demo en Vivo](https://img.shields.io/badge/Demo%20en%20Vivo-ciudad--activa--gt.vercel.app-16a34a?style=for-the-badge)](https://ciudad-activa-gt.vercel.app)

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Desplegado%20en-Vercel-000?style=flat-square&logo=vercel)

---

## 🌎 El Problema

En municipios como San José Pinula, Guatemala, los vecinos no tienen una forma eficiente de reportar problemas urbanos (baches, alumbrado dañado, fugas de agua, etc.) a las autoridades locales. Los reportes se pierden en grupos de WhatsApp o nunca llegan a las personas correctas. Los problemas quedan sin atención durante meses.

**CiudadActiva** cierra esa brecha — dando a cada ciudadano un canal directo, visual y geolocalizado para comunicarse con su municipalidad, y a las municipalidades un panel en tiempo real para gestionar y responder los problemas.

---

## ✨ Funcionalidades

### Para ciudadanos

- 📍 **Reportar problemas** con foto/video, categoría y ubicación GPS exacta
- 🗺️ **Ver todos los reportes** en un mapa público interactivo
- ❤️ **"A mí también me afecta"** — respalda reportes existentes con un toque
- 🔗 **Compartir reportes** en redes sociales para aumentar su visibilidad
- 👤 **Anónimo o registrado** — sin barreras para reportar

### Para municipalidades

- 📋 **Panel de administración** con todos los reportes filtrables por estado
- 🔄 **Actualizar estado del reporte** — Pendiente → En proceso → Resuelto
- 📊 **Estadísticas de un vistazo** — total, pendientes, en proceso, resueltos

### Plataforma

- 🏙️ **Multi-municipalidad** — actualmente San José Pinula, Mixco y Guatemala
- 📱 **Mobile-first** — optimizado para smartphones, con acceso directo a la cámara
- 🔒 **Row Level Security** — acceso a datos reforzado a nivel de base de datos

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router v7 |
| Backend | Supabase (Auth, Base de datos, Storage) |
| Base de datos | PostgreSQL (vía Supabase) |
| Mapas | Leaflet.js + React Leaflet + OpenStreetMap |
| Hosting | Vercel |

> Sin servidor backend personalizado. Supabase gestiona autenticación, base de datos, almacenamiento de archivos y API REST de forma automática.

---

## 🗂️ Estructura del Proyecto

```bash
src/
├── assets/          # Logos de municipalidades
├── components/      # Componentes reutilizables
├── hooks/           # Custom hooks de React
├── lib/
│   └── supabase.ts  # Cliente de Supabase
├── pages/
│   ├── MapPage.tsx             # Vista del mapa principal
│   ├── NewReportPage.tsx       # Formulario de nuevo reporte
│   ├── ReportDetailPage.tsx    # Detalle del reporte
│   ├── AuthPage.tsx            # Login / Registro
│   └── AdminPage.tsx           # Panel municipal
└── types/
    └── index.ts     # Tipos TypeScript
```

---

## 🗄️ Esquema de Base de Datos

```bash
municipalities   id, name, slug, created_at
profiles         id, display_name, is_anonymous, is_admin, municipality_id, created_at
reports          id, title, description, category, status, photo_url,
                 lat, lng, address, user_id, municipality_id, created_at
affected         id, report_id, user_id, created_at
```

**Categorías de reporte:** `pothole` · `accident` · `lighting` · `water` · `trash` · `other`

**Estados de reporte:** `pending` · `in_progress` · `resolved`

---

## 🚀 Instalación Local

### Requisitos

- Node.js 20+
- Una cuenta en [Supabase](https://supabase.com) (tier gratuito)

### 1. Clonar el repositorio

```bash
git clone https://github.com/ZarakiLancelot/ciudad-activa.git
cd ciudad-activa
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

Crea un nuevo proyecto en Supabase y ejecuta el siguiente SQL en el **Editor SQL**:

```sql
-- Municipalidades
create table municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

insert into municipalities (name, slug) values
  ('San José Pinula', 'san-jose-pinula'),
  ('Mixco', 'mixco'),
  ('Guatemala', 'guatemala');

-- Perfiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_anonymous boolean default false,
  is_admin boolean default false,
  municipality_id uuid references municipalities(id),
  created_at timestamptz default now()
);

-- Reportes
create table reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('pothole','accident','lighting','water','trash','other')),
  status text not null default 'pending' check (status in ('pending','in_progress','resolved')),
  photo_url text,
  lat double precision not null,
  lng double precision not null,
  address text,
  user_id uuid references profiles(id) on delete set null,
  municipality_id uuid references municipalities(id) not null,
  created_at timestamptz default now()
);

-- Afectados ("a mí también me afecta")
create table affected (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  constraint affected_report_user_unique unique (report_id, user_id)
);

-- Row Level Security
alter table municipalities enable row level security;
alter table profiles enable row level security;
alter table reports enable row level security;
alter table affected enable row level security;

create policy "public read" on municipalities for select using (true);
create policy "public read" on profiles for select using (true);
create policy "own insert" on profiles for insert with check (auth.uid() = id);
create policy "own update" on profiles for update using (auth.uid() = id);
create policy "public read" on reports for select using (true);
create policy "auth insert" on reports for insert with check (auth.uid() is not null);
create policy "admin update" on reports for update using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "public read" on affected for select using (true);
create policy "auth insert" on affected for insert with check (auth.uid() is not null);
create policy "own delete" on affected for delete using (auth.uid() = user_id);

-- Trigger para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, is_anonymous, municipality_id)
  values (
    new.id,
    coalesce(new.email, 'Anónimo'),
    (new.raw_user_meta_data->>'is_anonymous')::boolean,
    (select id from public.municipalities where slug = 'san-jose-pinula' limit 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Crea un **bucket público** llamado `report-photos` en Storage y agrega estas políticas:

```sql
create policy "public read" on storage.objects for select to public using (bucket_id = 'report-photos');
create policy "authenticated upload" on storage.objects for insert to authenticated with check (bucket_id = 'report-photos');
```

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_project_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

Encuéntralos en tu proyecto de Supabase en **Settings → API**.

### 5. Habilitar Auth Anónimo

En Supabase ve a **Authentication → Providers → Anonymous** y actívalo.

### 6. Correr el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 🔑 Crear un Usuario Admin

1. Regístrate como usuario desde la app
2. Copia tu UUID desde Supabase → **Authentication → Users**
3. Ejecuta en el SQL Editor:

```sql
update profiles set is_admin = true where id = 'UUID_DEL_USUARIO';
```

El usuario admin verá un botón **Panel** en el header del mapa con acceso al panel municipal.

---

## 📦 Despliegue

Este proyecto está desplegado en [Vercel](https://vercel.com). Para desplegar tu propia instancia:

1. Sube el repositorio a GitHub
2. Importa el proyecto en Vercel
3. Agrega las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Despliega

---

## 🗺️ Próximos Pasos

- [ ] Panel municipal con analíticas y gráficos
- [ ] Notificaciones push cuando cambia el estado de un reporte
- [ ] PWA con soporte offline
- [ ] UI multilenguaje (inglés / español)
- [ ] Onboarding self-service de nuevas municipalidades
- [ ] App móvil (React Native)
- [ ] Detección de reportes duplicados por proximidad
- [ ] Integración con APIs de datos abiertos del gobierno

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor abre un issue primero para discutir los cambios que deseas hacer.

---

## 📄 Licencia

MIT © 2026 — Hecho con ❤️ para el [DEV Weekend Challenge](https://dev.to/devteam/happening-now-dev-weekend-challenge-submissions-due-march-2-at-759am-utc-5fg8?)
