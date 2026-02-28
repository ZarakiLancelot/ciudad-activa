# CiudadActiva 🏙️

**[🇪🇸 Leer en Español / Read in Spanish](./README.es.md)**

> A civic reporting platform that empowers citizens to report urban problems directly to their municipality — with photos, exact location, and community support.

Built for the [DEV Weekend Challenge](https://dev.to/challenges/weekend-2026-02-28) 🏆

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ciudad--activa--gt.vercel.app-16a34a?style=for-the-badge)](https://ciudad-activa-gt.vercel.app)

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?style=flat-square&logo=vercel)

---

## 🌎 The Problem

In municipalities like San José Pinula, Guatemala, citizens have no efficient way to report urban issues (potholes, broken streetlights, water leaks, etc.) to local authorities. Reports get lost in WhatsApp groups or never reach the right people. Problems go unfixed for months.

**CiudadActiva** bridges that gap — giving every citizen a direct, visual, geolocated channel to communicate with their municipality, and giving municipalities a real-time dashboard to manage and respond to issues.

---

## ✨ Features

### For Citizens

- 📍 **Report issues** with photo/video, category, and exact GPS location
- 🗺️ **View all reports** on an interactive public map
- ❤️ **"This affects me too"** — support existing reports with one tap
- 🔗 **Share reports** on social media to increase visibility
- 👤 **Anonymous or registered** — no barriers to reporting

### For Municipalities

- 📋 **Admin dashboard** with all reports filterable by municipality and status
- 🔄 **Update report status** — Pending → In Progress → Resolved
- 📊 **At-a-glance stats** — total, pending, in progress, resolved

### Platform

- 🏙️ **Multi-municipality** — currently San José Pinula, Mixco, Guatemala, Fraijanes, Santa Catarina Pinula, Villa Canales, and Villa Nueva
- 📱 **Mobile-first** — optimized for smartphones, with direct camera access
- 🔒 **Row Level Security** — data access enforced at the database level

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router v7 |
| Backend | Supabase (Auth, Database, Storage) |
| Database | PostgreSQL (via Supabase) |
| Maps | Leaflet.js + React Leaflet + OpenStreetMap |
| Hosting | Vercel |

> No custom backend server. Supabase handles authentication, database, file storage, and REST API automatically.

---

## 🗂️ Project Structure

```bash
src/
├── assets/          # Municipality logos
├── components/      # Reusable components
├── lib/
│   ├── supabase.ts  # Supabase client
│   └── i18n.ts      # i18next configuration
├── locales/
│   ├── en.json      # English translations
│   └── es.json      # Spanish translations
├── pages/
│   ├── MapPage.tsx             # Main map view
│   ├── NewReportPage.tsx       # Create report form
│   ├── ReportDetailPage.tsx    # Report detail view
│   ├── AuthPage.tsx            # Login / Register
│   └── AdminPage.tsx           # Municipality dashboard
└── types/
    └── index.ts     # TypeScript types
```

---

## 🗄️ Database Schema

```bash
municipalities   id, name, slug, created_at
profiles         id, display_name, is_anonymous, is_admin, municipality_id, created_at
reports          id, title, description, category, status, photo_url,
                 lat, lng, address, user_id, municipality_id, created_at
affected         id, report_id, user_id, created_at
```

**Report categories:** `pothole` · `accident` · `lighting` · `water` · `trash` · `other`

**Report statuses:** `pending` · `in_progress` · `resolved`

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) account (free tier)

### 1. Clone the repository

```bash
git clone https://github.com/ZarakiLancelot/ciudad-activa.git
cd ciudad-activa
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

Create a new Supabase project and run the following SQL in the **SQL Editor**:

```sql
-- Municipalities
create table municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

insert into municipalities (name, slug) values
  ('San José Pinula',       'san-jose-pinula'),
  ('Mixco',                 'mixco'),
  ('Guatemala',             'guatemala'),
  ('Fraijanes',             'fraijanes'),
  ('Santa Catarina Pinula', 'santa-catarina-pinula'),
  ('Villa Canales',         'villa-canales'),
  ('Villa Nueva',           'villa-nueva');

-- Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_anonymous boolean default false,
  is_admin boolean default false,
  municipality_id uuid references municipalities(id),
  created_at timestamptz default now()
);

-- Reports
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

-- Affected ("this affects me too")
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

-- Auto-create profile on signup
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

Create a **public storage bucket** named `report-photos` and add these policies:

```sql
create policy "public read" on storage.objects for select to public using (bucket_id = 'report-photos');
create policy "authenticated upload" on storage.objects for insert to authenticated with check (bucket_id = 'report-photos');
```

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Find these values in your Supabase project under **Settings → API**.

### 5. Enable Anonymous Auth

In Supabase, go to **Authentication → Providers → Anonymous** and enable it.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Creating an Admin User

1. Register a user through the app
2. Find their UUID in Supabase → **Authentication → Users**
3. Run in SQL Editor:

```sql
update profiles set is_admin = true where id = 'USER_UUID_HERE';
```

The admin user will see a **Panel** button in the map header, giving access to the municipality dashboard.

---

## 📦 Deployment

This project is deployed on [Vercel](https://vercel.com). To deploy your own instance:

1. Push the repository to GitHub
2. Import the project in Vercel
3. Add the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

---

## 🗺️ Roadmap

- [ ] Municipality dashboard with analytics and charts
- [ ] Push notifications when report status changes
- [ ] PWA with offline support
- [x] Multi-language UI (English / Spanish)
- [ ] Municipality self-service onboarding
- [ ] Mobile app (React Native)
- [ ] Duplicate report detection by proximity
- [ ] Integration with official government open data APIs

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT © 2026 — Built with ❤️ for the [DEV Weekend Challenge](https://dev.to/challenges/weekend-2026-02-28)
