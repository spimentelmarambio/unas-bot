# Uñas Bot

Bot de WhatsApp para que alguien que hace servicios de manicure/pedicura pueda avisar por WhatsApp cuánto cobró por cada servicio, y preguntar cuánto lleva ganado en el mes — sin usar ninguna app nueva.

Es un proyecto separado del tracker de gastos personal "Lukas", pero reutiliza la misma base de datos Neon Postgres para no pagar/crear otra. Vive en su propio schema de Postgres (`unas_bot`, separado del `public` que usa Lukas) - **importante**: la URL de conexión tiene que llevar `?schema=unas_bot` (ver `.env.example`), o Prisma va a intentar administrar el schema `public` completo de Lukas y puede ofrecer borrar sus tablas al detectar que no las declara este proyecto.

## Cómo funciona

1. La persona le escribe al número de WhatsApp del bot, ej: `"hice una manicure de 15000"` o `"¿cuánto llevo este mes?"`.
2. Meta reenvía el mensaje al webhook (`app/api/webhook/whatsapp/route.ts`), que:
   - Verifica la firma del webhook y que el número esté en la allowlist.
   - Le pasa el texto a Claude (`lib/claude.ts`), que devuelve un intent estructurado: registrar un ingreso, consultar el resumen del mes, u otro.
   - Ejecuta la acción correspondiente contra la base de datos (`lib/income.ts`).
   - Responde por WhatsApp (`lib/whatsapp.ts`).

## Setup

### 1. Variables de entorno

Copiá `.env.example` a `.env` y completá:

- `DATABASE_URL` / `DIRECT_URL`: las mismas de Lukas (mismo proyecto Neon), pero agregando `&schema=unas_bot` al final de cada una.
- `ANTHROPIC_API_KEY`: puede ser la misma que usa Lukas.
- Las variables `WHATSAPP_*` (ver siguiente sección).

### 2. Crear la app de WhatsApp en Meta

1. Andá a [Meta for Developers](https://developers.facebook.com/) y creá una app de tipo "Business".
2. Agregale el producto **WhatsApp**.
3. En "API Setup" vas a ver un número de prueba gratis, un `Phone Number ID`, y un token de acceso temporal (24h) para probar. Para algo permanente, generá un token de "usuario del sistema" (System User) con permiso `whatsapp_business_messaging`.
4. En "API Setup" -> "To" -> agregá el número de WhatsApp de la persona que va a usar el bot como destinatario de prueba (Meta permite hasta 5 números sin verificar el negocio - más que suficiente para uso personal).
5. Copiá el `Phone Number ID` y el token a `.env` (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`).
6. En "App settings" -> "Basic", copiá el `App secret` a `WHATSAPP_APP_SECRET`.
7. Elegí cualquier string como `WHATSAPP_VERIFY_TOKEN` (lo vas a usar también al configurar el webhook).
8. Poné el número de WhatsApp de la persona (formato `56912345678`, sin `+`) en `WHATSAPP_ALLOWED_FROM`.

### 3. Deploy y conectar el webhook

1. Deployá este repo en Vercel (proyecto nuevo, separado de Lukas) con las variables de entorno cargadas.
2. En Meta, "WhatsApp" -> "Configuration" -> "Webhook", poné:
   - Callback URL: `https://<tu-proyecto>.vercel.app/api/webhook/whatsapp`
   - Verify token: el mismo valor que pusiste en `WHATSAPP_VERIFY_TOKEN`.
3. Suscribite al campo `messages`.

### 4. Probar

Local: exponé `localhost:3000` con `ngrok http 3000` y usá esa URL temporalmente en el webhook de Meta mientras probás.

Escribile al número de prueba: `"hice una manicure de 15000"` y confirmá que responde y que se creó el registro (`npx prisma studio`). Después probá `"¿cuánto llevo este mes?"`.

## Desarrollo

```bash
npm install
npx prisma migrate dev   # crea la tabla NailIncomeEntry (no toca las de Lukas)
npm run dev
```
