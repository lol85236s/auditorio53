# Nuevas Características de Base de Datos

## 1. Control de Permisos de Eliminación

Solo los organizadores pueden eliminar eventos que ellos crearon. Esto se implementa mediante:

- Función `es_organizador_evento()`: Verifica si un usuario es el organizador de un evento
- Función `eliminar_evento()`: Valida permisos antes de eliminar
- Trigger de auditoría: Registra todas las eliminaciones en el historial

### Uso
\`\`\`sql
-- Eliminar un evento (lanza excepción si no es organizador)
SELECT eliminar_evento('evento_uuid', 'usuario_uuid');
\`\`\`

## 2. Adjuntar Archivos PDF

Los organizadores pueden adjuntar presentaciones en PDF a sus eventos:

- Tabla `archivos_evento`: Almacena metadatos de archivos
- Constraint `solo_organizador_sube`: Solo el organizador puede subir archivos
- Tipo de archivo: Solo PDF (`application/pdf`)
- Tamaño máximo recomendado: 10 MB

### Estructura
\`\`\`sql
- id: UUID del archivo
- evento_id: Referencia al evento
- usuario_id: Usuario que subió el archivo (debe ser organizador)
- nombre_archivo: Nombre original del archivo
- url_archivo: URL de almacenamiento (Vercel Blob, S3, etc.)
- tipo_mime: Siempre 'application/pdf'
- tamano_bytes: Tamaño del archivo
- descripcion: Descripción opcional
\`\`\`

## 3. Búsqueda y Filtros Avanzados

Función `buscar_eventos()` con múltiples criterios:

### Parámetros de búsqueda
- **p_texto_busqueda**: Búsqueda de texto completo en título y descripción
- **p_auditorio_id**: Filtrar por auditorio (A o B)
- **p_fecha_inicio**: Eventos desde esta fecha
- **p_fecha_fin**: Eventos hasta esta fecha
- **p_tipo_evento**: Filtrar por tipo de evento
- **p_organizador_id**: Filtrar por organizador específico
- **p_estado**: Filtrar por estado (pendiente, confirmado, cancelado, completado)
- **p_limite**: Número máximo de resultados (default: 50)
- **p_offset**: Para paginación

### Ejemplo de uso
\`\`\`sql
-- Buscar eventos de conferencias en Auditorio A para diciembre
SELECT * FROM buscar_eventos(
  p_texto_busqueda := 'conferencia',
  p_auditorio_id := 'A',
  p_fecha_inicio := '2024-12-01',
  p_fecha_fin := '2024-12-31',
  p_estado := 'confirmado',
  p_limite := 20
);
\`\`\`

### Resultados incluyen
- Información completa del evento
- Nombre del organizador
- Conteo de asistentes registrados
- Conteo de archivos adjuntos

## 4. Índices de Búsqueda

Se agregaron índices GIN para búsqueda de texto completo:

- `idx_eventos_titulo`: Búsqueda rápida en títulos
- `idx_eventos_descripcion`: Búsqueda rápida en descripciones
- `idx_archivos_evento`: Búsqueda rápida de archivos por evento

Estos índices mejoran significativamente el rendimiento de búsquedas en español.

## 5. Auditoría de Cambios

Todas las eliminaciones se registran automáticamente:

\`\`\`sql
-- Ver historial de eliminaciones
SELECT * FROM historial_cambios 
WHERE accion = 'eliminar' 
ORDER BY timestamp DESC;
\`\`\`

## Consideraciones de Seguridad

1. **Validación de permisos**: Siempre usar las funciones de validación antes de operaciones críticas
2. **Sanitización de entrada**: Usar parámetros preparados para prevenir SQL injection
3. **Límite de tamaño**: Validar tamaño de archivos en el cliente antes de subir
4. **Tipos de archivo**: Solo permitir PDF, validar en cliente y servidor
5. **Auditoría**: Todas las acciones críticas se registran para trazabilidad
