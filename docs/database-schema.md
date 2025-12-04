# Esquema de Base de Datos - Sistema de Reservas de Auditorios

## Descripción General

Este esquema soporta dos tipos de usuarios y flujos de trabajo:

1. **Organizadores** (maestros, investigadores): Pueden rentar auditorios completos para eventos
2. **Asistentes** (estudiantes, público): Se registran para asistir a eventos y se les asignan asientos automáticamente en orden de llegada

## Tablas Principales

### usuarios
Almacena información de todos los usuarios del sistema.
- `tipo_usuario`: 'organizador' o 'asistente'
- Los organizadores pueden crear eventos
- Los asistentes pueden registrarse para eventos

### auditorios
Define los auditorios disponibles (A y B) con sus capacidades y equipamiento.

### asientos
Cada auditorio tiene asientos numerados que se asignan automáticamente a los asistentes.
- Auditorio A: 200 asientos
- Auditorio B: 150 asientos

### eventos
Reservas completas de auditorios creadas por organizadores.
- Incluye fecha, hora, título, descripción
- Constraint para evitar solapamiento de horarios

### registros_asistentes
Registros de personas que asisten a eventos.
- Se asignan asientos automáticamente en orden de llegada
- `numero_orden`: Indica el orden de registro (1, 2, 3...)
- Función `asignar_asiento_automatico()` maneja la lógica

### historial_cambios
Auditoría de todos los cambios en el sistema.

## Flujos de Trabajo

### Flujo 1: Organizador Renta Auditorio
1. Organizador crea un evento en la tabla `eventos`
2. Especifica fecha, hora, auditorio, número esperado de asistentes
3. Sistema valida disponibilidad y capacidad
4. Evento queda confirmado

### Flujo 2: Asistente se Registra para Evento
1. Asistente selecciona un evento existente
2. Sistema llama a `asignar_asiento_automatico(evento_id, asistente_id)`
3. Se asigna el siguiente asiento disponible en orden numérico
4. Se registra el número de orden (primera persona = 1, segunda = 2, etc.)
5. Asistente recibe confirmación con su número de asiento

## Validaciones Implementadas

### Middleware de Validación (lib/validacion-reservas.ts)

1. **Horarios de negocio**: 7 AM - 5 PM
2. **Restricción de 4 PM**: Después de las 4 PM no se pueden hacer reservas para el mismo día
3. **Fechas futuras**: No se permiten reservas en el pasado
4. **Disponibilidad**: Verifica conflictos de horario
5. **Capacidad**: Valida que no se exceda la capacidad del auditorio
6. **Formato**: Valida formato de hora (HH:MM)

## Próximos Pasos

Para conectar la base de datos:
1. Configurar integración con Supabase o Neon
2. Ejecutar scripts de schema (01-schema-database.sql)
3. Ejecutar scripts de seed (02-seed-data.sql)
4. Actualizar componentes para usar datos de BD en lugar de estado local
5. Implementar autenticación de usuarios
6. Crear interfaces separadas para organizadores y asistentes
