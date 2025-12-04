# Configuración de MailerSend - Sistema de Notificaciones

## 📧 Descripción General

El sistema AudiTec ahora usa **MailerSend** como proveedor principal de emails transaccionales. MailerSend es una API confiable, rápida y ofrece un plan gratuito generoso para proyectos en desarrollo.

## 🔑 Credenciales Configuradas

- **API Token**: `mlsn.eafcba45b5df487575d97db6668bfb56e0b380ed8459be33049d254fbd4377e9`
- **Email FROM**: `noreply@auditorios.tecpue.com`
- **Librería**: `mailersend` (npm package)

## ⚙️ Configuración Actual

### Variables de Entorno (.env.local)

```env
MAILERSEND_API_TOKEN=mlsn.eafcba45b5df487575d97db6668bfb56e0b380ed8459be33049d254fbd4377e9
EMAIL_FROM=noreply@auditorios.tecpue.com
```

### Stack de Notificaciones

El sistema intenta enviar emails en este orden:

1. **MailerSend** (Principal) ✅ Configurado
2. **SMTP** (Fallback) - Si MailerSend falla

## 📤 Funcionalidades Implementadas

### 1. Confirmación de Registro de Asistentes

- **Cuándo**: Cuando un asistente se registra en un evento
- **Destinatario**: Email del asistente
- **Contenido**:
  - Confirmación de registro
  - Número de asiento asignado
  - Fecha y hora del evento
  - Enlace a detalles del evento

### 2. Email de Prueba

- **Endpoint**: `POST /api/test-email`
- **Body** (opcional):
  ```json
  {
    "to": "test@example.com",
    "subject": "Mi asunto personalizado",
    "text": "Texto del email",
    "html": "<h1>HTML del email</h1>",
    "tipo": "test"
  }
  ```
- **Respuesta**: `{ ok: true, result: {...} }`

## 🧪 Pruebas

### Prueba 1: Email de Prueba Directo

```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "tu-email@example.com"}'
```

### Prueba 2: Registrar un Asistente (Genera Email)

1. Accede a http://localhost:3000
2. Selecciona "Modo: Asistente"
3. Busca un evento disponible
4. Completa el registro con nombre y correo
5. Deberías recibir un email de confirmación

## 📝 Logs

Los logs de MailerSend aparecen en la consola del servidor:

```
[Notification] MailerSend enviado: <message-id>
```

Si hay error:

```
[Notification] MailerSend falló, intentando SMTP fallback: <error-message>
```

## 🔗 Dashboard MailerSend

Para monitorear emails enviados:

1. Accede a https://app.mailersend.com/
2. Inicia sesión con tus credenciales
3. Navega a "Activity" para ver historial de emails
4. Revisa entregas fallidas, bounces, etc.

## 🚀 Planes MailerSend

- **Gratuito**: 3,000 emails/mes
- **Pro**: Desde $25/mes
- **Enterprise**: Soporte dedicado

Para más detalles: https://www.mailersend.com/pricing

## 🔧 Personalización

### Cambiar Email FROM

Edita `.env.local`:

```env
EMAIL_FROM=tu-email@tu-dominio.com
```

Nota: El dominio debe estar verificado en MailerSend.

### Cambiar Templates

Edita `/lib/notifications.js` para personalizar los templates HTML de emails.

## ⚠️ Notas Importantes

1. **API Token**: Mantén el token seguro. No lo compartas públicamente.
2. **Rate Limiting**: MailerSend permite hasta 100 requests/segundo en plan gratuito.
3. **Verificación de Dominio**: Para producción, verifica el dominio en MailerSend.
4. **Bounce Management**: MailerSend detecta automáticamente emails inválidos.

## 🐛 Troubleshooting

### Email no se envía

1. Verifica que `MAILERSEND_API_TOKEN` esté configurado
2. Revisa los logs: `[Notification]`
3. Intenta el endpoint de prueba: `/api/test-email`
4. Verifica el dashboard de MailerSend para errores

### Email llega a Spam

1. Verifica que el dominio esté verificado en MailerSend
2. Agrega SPF/DKIM records a tu dominio
3. Personaliza el "FROM" name

### Rate Limit excedido

MailerSend limita los emails gratuitos a 3,000/mes. Si se alcanza:

1. Espera al próximo mes
2. Actualiza a plan de pago
3. O implementa colas de emails (Bull, RabbitMQ)

## 📚 Referencias

- [MailerSend Documentation](https://www.mailersend.com/docs)
- [NPM Package](https://www.npmjs.com/package/mailersend)
- [API Reference](https://developers.mailersend.com/)

---

**Última actualización**: Noviembre 30, 2025
**Status**: ✅ Configurado y funcional
