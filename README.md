# Empire Nutrition 🏋️‍♂️

Ecommerce moderno de suplementos deportivos construido con **Next.js 16**, **Supabase** y **OpenPay**.

> Potencia tu rendimiento con una experiencia de compra rápida, segura y enfocada en resultados.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.106.2-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?logo=vercel)](https://casaempire-next.vercel.app)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 🔗 Live Demo

**Producción:** https://casaempire-next.vercel.app

## 🖼️ Preview

![Preview](docs/preview.png)

> Coloca tu captura o GIF en `docs/preview.png` (o actualiza la ruta de la imagen en esta sección).

## ✨ Funcionalidades

- Catálogo de productos con categorías, ofertas y búsqueda.
- Carrito persistente en cliente (Zustand) con cálculo de subtotal, envío y total.
- Cupones (`percentage`, `fixed`, `free_shipping`) con validación en frontend y backend.
- Checkout seguro con tokenización en cliente mediante OpenPay.js.
- Procesamiento de pagos con OpenPay desde API Routes.
- Webhooks de OpenPay con revalidación del estado real de la transacción.
- Autenticación con Supabase (login y sesión para rutas protegidas).
- Panel de administración para productos, categorías, cupones, órdenes, reseñas, blog, medios y configuración.
- Seguimiento de pedidos para clientes por correo + número de orden.
- Formulario de contacto con persistencia en Supabase y envío de correo con Resend (si está configurado).

## 🧰 Tech Stack

| Área | Tecnología |
|---|---|
| Framework | Next.js `16.2.6` |
| UI | React `19.2.4` |
| Lenguaje | TypeScript `^5` |
| Estilos | Tailwind CSS `^4` |
| Base de datos/Auth/Storage | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Pagos | OpenPay (API + OpenPay.js) |
| Estado global | Zustand |
| Email transaccional | Resend |
| Linting | ESLint 9 + `eslint-config-next` |

## 🚀 Instalación y uso local

### Prerrequisitos

- Node.js **20+** (recomendado para Next.js 16)
- npm (se usa `package-lock.json`)

### Pasos

```bash
git clone https://github.com/Pablolsd25/casaempire-next.git
cd casaempire-next
npm install
npm run dev
```

Abre `http://localhost:3000`.

## 🔐 Variables de entorno

Crea un archivo `.env.local` en la raíz. Ejemplo:

```bash
# Supabase (app)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# OpenPay
NEXT_PUBLIC_OPENPAY_MERCHANT_ID=YOUR_OPENPAY_MERCHANT_ID
NEXT_PUBLIC_OPENPAY_PUBLIC_KEY=YOUR_OPENPAY_PUBLIC_KEY
OPENPAY_PRIVATE_KEY=YOUR_OPENPAY_PRIVATE_KEY
NEXT_PUBLIC_OPENPAY_SANDBOX=true

# Admin/Auth
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# Email (opcional)
RESEND_API_KEY=YOUR_RESEND_API_KEY
RESEND_FROM_EMAIL=Empire Nutrition <onboarding@resend.dev>

# Scripts de migración/sync (opcionales)
WIX_API_KEY=YOUR_WIX_API_KEY
WIX_SITE_ID=YOUR_WIX_SITE_ID
WIX_ACCOUNT_ID=YOUR_WIX_ACCOUNT_ID
```

## 📜 Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run migrate:api
npm run import:media
npm run migrate:csv
npm run migrate:images
npm run migrate:images:dry
npm run sync:stock
npm run migrate:orders
npm run fix:offers
npm run backfill:orders
npm run backfill:items
npm run sync:fulfillment
npm run migrate:categories
npm run migrate:contacts
npm run migrate:reviews
npm run import:missing-products
npm run consolidate:categories
npm run backfill:order-items
```

## 🗂️ Estructura del proyecto

```text
casaempire-next/
├─ src/
│  ├─ app/               # Rutas App Router (tienda, checkout, admin, APIs)
│  ├─ components/        # Componentes de UI y dominio
│  ├─ lib/               # Supabase clients, store, utilidades
│  ├─ supabase/          # Schema SQL
│  └─ types/             # Tipos TypeScript
├─ scripts/              # Migraciones/importaciones/sincronizaciones
├─ supabase/migrations/  # Migraciones SQL
├─ public/               # Assets estáticos
└─ package.json
```

## ▲ Deployment

Este proyecto está desplegado en **Vercel**:

- https://casaempire-next.vercel.app

## 📄 Licencia

Distribuido bajo licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE).

## 👤 Autor

**Pablolsd25**  
GitHub: https://github.com/Pablolsd25
