# Uñas Bot

Bot de WhatsApp para que alguien que hace servicios de manicure/pedicura pueda avisar por WhatsApp cuánto cobró por cada servicio o cuánto gastó en insumos, y preguntar cuánto lleva ganado/gastado/neto en el mes — sin usar ninguna app nueva. Incluye un dashboard web (`/dashboard`, protegido con contraseña) para ver el historial.

Es un proyecto separado del tracker de gastos personal "Lukas", pero reutiliza la misma base de datos Neon Postgres para no pagar/crear otra. Vive en su propio schema de Postgres (`unas_bot`, separado del `public` que usa Lukas) - **importante**: la URL de conexión tiene que llevar `?schema=unas_bot` (ver `.env.example`), o Prisma va a intentar administrar el schema `public` completo de Lukas y puede ofrecer borrar sus tablas al detectar que no las declara este proyecto.

## Cómo funciona

1. La persona le escribe al número de WhatsApp del bot, ej: `"hice una manicure de 15000"` o `"¿cuánto llevo este mes?"`.
2. Meta reenvía el mensaje al webhook (`app/api/webhook/whatsapp/route.ts`), que:
   - Verifica la firma del webhook y que el número esté en la allowlist.
   - Le pasa el texto a Claude (`lib/claude.ts`), que devuelve un intent estructurado: registrar un ingreso, registrar un gasto, consultar el resumen del mes, u otro.
   - Ejecuta la acción correspondiente contra la base de datos (`lib/transactions.ts`).
   - Responde por WhatsApp (`lib/whatsapp.ts`).
3. `/dashboard` muestra el resumen del mes (ingresos, gastos, neto) y el historial de movimientos - protegido con HTTP Basic Auth (`proxy.ts` + `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`).
4. (Opcional) Si está configurada `BOOKLY_CALENDAR_ICS_URL`, el dashboard también muestra cuántas citas se agendaron en Bookly ese mes, el promedio histórico, y los compara contra los ingresos registrados por WhatsApp (`lib/calendar.ts`, vía la librería `node-ical`) - útil para detectar servicios hechos que no se anotaron.

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
4. **Paso fácil de saltarse:** guardar la URL del webhook NO alcanza para que lleguen mensajes reales - también hay que suscribir explícitamente la app a tu WhatsApp Business Account (WABA). Sin este paso, solo funciona el botón "Enviar al servidor" de prueba de Meta (que manda un payload de ejemplo), pero un mensaje real de WhatsApp nunca dispara el webhook. Con el `WABA_ID` (visible en "API Setup", como "WhatsApp Business Account ID") y el access token, corré:
   ```bash
   curl -X POST "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
     -H "Authorization: Bearer <WHATSAPP_ACCESS_TOKEN>"
   ```
   Debería responder `{"success":true}`.

### 4. Probar

Local: exponé `localhost:3000` con `ngrok http 3000` y usá esa URL temporalmente en el webhook de Meta mientras probás.

Escribile al número de prueba: `"hice una manicure de 15000"` y confirmá que responde y que se creó el registro (`npx prisma studio`). Después probá `"¿cuánto llevo este mes?"`.

### 5. (Opcional) Conectar las citas de Bookly

Para que el dashboard compare las citas agendadas contra los ingresos registrados, necesitás un feed de solo lectura en formato iCalendar. Bookly tiene uno nativo: en el panel de WordPress, **Staff Members → editar a la persona → pestaña "Avanzado" → "Fuente de ICalendar"** → activarla y copiar la URL (incluye un token secreto, no la compartas). Pegala en `BOOKLY_CALENDAR_ICS_URL`. Si no la configurás, el dashboard funciona igual, solo sin esa sección.

## Desarrollo

```bash
npm install
npx prisma migrate dev   # crea la tabla NailIncomeEntry (no toca las de Lukas)
npm run dev
```
// Sidebar ready
