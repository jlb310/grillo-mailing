# Grillo Mailing

Plataforma de email marketing para agencias. Sub-marca de [Grillo](https://grillo.click).

## Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **Prisma ORM** (SQLite dev / PostgreSQL prod)
- **NextAuth v4** (Credentials)
- **Resend** (Email delivery)
- **TinyMCE** (WYSIWYG editor)

## Features

- Multi-tenant (organizaciones/clientes)
- Gestión de dominios con Resend
- Editor WYSIWYG de templates
- Campañas: envío inmediato, programado, o borrador
- Import CSV de contactos (email, nombre, teléfono, empresa)
- Listas de contactos
- Analytics (opens, clicks, delivered)
- Webhooks de Resend
- Unsubscribe automático

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Base de datos
npx prisma migrate dev
npx prisma generate

# Seed admin
npx tsx prisma/seed.ts

# Servidor de desarrollo
npm run dev
```

### Credenciales por defecto
- **Email:** `admin@grillo.click`
- **Password:** `admin123`

## Deploy

### Docker (recomendado)

```bash
# Build y run
docker-compose up -d --build
```

### Configurar cron para envíos programados

Las campañas programadas requieren un cron que llame al endpoint cada minuto:

**Opción A - Crontab del sistema:**
```bash
* * * * * curl -s https://tu-dominio.com/api/campaigns/scheduled/send
```

**Opción B - Script incluido:**
```bash
# Editar scripts/send-scheduled.sh con tu URL
chmod +x scripts/send-scheduled.sh
# Agregar a crontab
* * * * * /ruta/a/scripts/send-scheduled.sh
```

**Opción C - Servicio cron en Docker:**
Descomenta la sección `cron` en `docker-compose.yml`.

### Variables de entorno obligatorias

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | PostgreSQL: `postgresql://usuario:clave@host:5432/base` |
| `NEXTAUTH_SECRET` | Clave secreta para JWT (generar con `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL base de la app (ej: `https://correo.grillo.click`) |
| `RESEND_API_KEY` | API key de Resend (obtener en [resend.com](https://resend.com)) |

### Configurar Resend

1. Crear cuenta en [resend.com](https://resend.com)
2. Obtener API key y ponerla en `RESEND_API_KEY`
3. Agregar y verificar dominios en Resend
4. Configurar webhook de eventos apuntando a: `https://tu-dominio/api/webhooks/resend`

## Estructura

```
├── src/
│   ├── app/
│   │   ├── api/           # API routes (REST)
│   │   ├── auth/login/    # Login
│   │   ├── dashboard/     # Admin panel
│   │   └── unsubscribe/   # Página pública de baja
│   ├── components/ui/     # shadcn/ui components
│   └── lib/
│       ├── auth.ts        # NextAuth config
│       └── prisma.ts      # Prisma client
├── prisma/
│   ├── schema.prisma      # Modelos de datos
│   └── seed.ts            # Admin user seed
├── scripts/
│   └── send-scheduled.sh  # Cron script
├── Dockerfile
└── docker-compose.yml
```

## Licencia

Privado - Grillo / Spacehost
