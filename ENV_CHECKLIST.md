# ✅ Checklist de Variables de Entorno - AudiTec

## Variables Críticas (IMPRESCINDIBLES - Sin estas NO funciona)

### Supabase (Base de Datos)
- [ ] `SUPABASE_URL` - URL de tu proyecto Supabase
- [ ] `SUPABASE_ANON_KEY` - Clave anónima (pública) de Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Clave de servicio (privada) de Supabase

### Autenticación
- [ ] `AUTH_SECRET` - Secreto para firmar JWTs (o `JWT_SECRET` como fallback)
- [ ] `NEXT_PUBLIC_APP_URL` - URL pública de la app (ej: https://auditec.netlify.app)

### Email (Para enviar enlaces mágicos y notificaciones)
**Elige UNO de estos dos sistemas:**

#### Opción A: MailerSend (Recomendado)
- [ ] `MAILERSEND_API_TOKEN` - Token API de MailerSend
- [ ] `EMAIL_FROM` - Email remitente (ej: noreply@auditec.netlify.app)

#### Opción B: SMTP Fallback
- [ ] `SMTP_HOST` - Servidor SMTP (ej: smtp.gmail.com)
- [ ] `SMTP_PORT` - Puerto SMTP (587 o 465)
- [ ] `SMTP_USER` - Usuario SMTP
- [ ] `SMTP_PASS` - Contraseña SMTP
- [ ] `SMTP_SECURE` - true/false (usa true para puerto 465)
- [ ] `SMTP_FROM` - Email remitente

**ALTERNATIVA (Legacy):**
- [ ] `MAILJET_API_KEY` - Clave API de Mailjet (si usas este)
- [ ] `MAILJET_SECRET_KEY` - Clave secreta de Mailjet (si usas este)

## Variables Opcionales

### API URLs
- [ ] `NEXT_PUBLIC_API_URL` - URL base para llamadas API (default: http://localhost:3000)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Override para Supabase URL en cliente
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Override para Supabase key en cliente

### Pruebas
- [ ] `TEST_EMAIL` - Email para pruebas (default: isma.zitl16@gmail.com)
- [ ] `NODE_ENV` - 'production' o 'development'

---

## 🔍 Dónde están configuradas en Netlify

1. **Netlify Dashboard** → Tu sitio → **Settings**
2. **Build & deploy** → **Environment**
3. Aquí puedes agregar todas las variables de arriba

---

## 🚨 Problemas Comunes (404 / Not Found)

### ¿Por qué te da 404?

Tu sitio está compilado pero sin las variables de entorno necesarias:

1. **Sin `SUPABASE_URL` o `SUPABASE_ANON_KEY`** 
   - ✗ Las APIs no pueden conectarse a la BD
   - ✗ Las rutas `/api/*` fallan silenciosamente
   - ✗ Las páginas que dependen de datos no renderean

2. **Sin `AUTH_SECRET` o `NEXT_PUBLIC_APP_URL`**
   - ✗ La autenticación no funciona
   - ✗ Los enlaces mágicos no son válidos

3. **Sin variables de Email**
   - ✗ No puedes registrarte o loguearte
   - ✗ Los recordatorios no se envían

---

## 📋 Pasos para Arreglarlo

### 1. Obtén tus credenciales de Supabase

```bash
# Supabase Dashboard → Tu proyecto → Settings → API
# Necesitas:
# - Project URL
# - Project API Key (anon, public)
# - Service Role Key (privado, usar solo en servidor)
```

### 2. Configura en Netlify

```bash
# 1. Ve a https://app.netlify.com → Tu sitio → Settings
# 2. Build & deploy → Environment
# 3. Agrega estas variables:

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
AUTH_SECRET=tu-secreto-super-largo-y-aleatorio
NEXT_PUBLIC_APP_URL=https://auditec.netlify.app

# Para Email (MailerSend recomendado):
MAILERSEND_API_TOKEN=tu-token-aqui
EMAIL_FROM=noreply@auditec.netlify.app
```

### 3. Rebuild en Netlify

```bash
# Después de agregar las variables:
# 1. Netlify Dashboard → Deploys
# 2. Haz clic en "Trigger deploy" → "Deploy site"
# O simplemente haz push a main
```

---

## 🔧 Variables de Entorno Usadas en el Código

### En `/lib/auth.ts`
```typescript
AUTH_SECRET || JWT_SECRET  // Firmar JWTs
NODE_ENV                   // Para cookies seguras
```

### En `/lib/supabaseClient.js`
```javascript
SUPABASE_URL      // Conexión a BD
SUPABASE_ANON_KEY // Credencial pública
```

### En `/lib/socketServer.js`
```javascript
SUPABASE_URL                    // Socket.IO
SUPABASE_SERVICE_ROLE_KEY       // Fallback Supabase
NEXT_PUBLIC_API_URL             // CORS origin
```

### En `/lib/send-magic-link.ts`
```typescript
NEXT_PUBLIC_APP_URL  // URL del enlace mágico
EMAIL_FROM           // Remitente
MAILJET_API_KEY      // Legacy (no usar)
MAILJET_SECRET_KEY   // Legacy (no usar)
```

### En `/lib/notifications-simple.js`
```javascript
MAILERSEND_API_TOKEN // API de email
EMAIL_FROM           // Remitente
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  // Fallback
```

---

## 💡 Recomendaciones

1. **Usa MailerSend** sobre SMTP para mayor confiabilidad
2. **Nunca expongas** `SUPABASE_SERVICE_ROLE_KEY` en el cliente (solo servidor)
3. **AUTH_SECRET** debe ser una cadena aleatoria larga (mínimo 32 caracteres)
4. **Prueba localmente** primero con `pnpm dev` antes de deployar
5. **Verifica los logs** de build en Netlify si algo sigue fallando

---

## 🧪 Cómo Probar

### Localmente
```bash
# Copia tu .env.local con las variables correctas
pnpm dev

# Visita http://localhost:3000/api/test-email-smtp
# Debe devolver JSON con éxito/error
```

### En Netlify
```bash
# Ver logs de build:
# 1. Netlify Dashboard → Tu sitio → Deploys
# 2. Haz clic en el último deploy
# 3. Haz clic en "Deploy log" para ver qué pasó
```
