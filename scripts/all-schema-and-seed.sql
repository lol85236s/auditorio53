-- ==========================
-- 01 - Schema
-- ==========================
-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('organizador', 'asistente')),
  telefono VARCHAR(20),
  departamento VARCHAR(50),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de auditorios
CREATE TABLE IF NOT EXISTS auditorios (
  id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  capacidad_total INTEGER NOT NULL,
  descripcion TEXT,
  equipamiento TEXT[],
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asientos
CREATE TABLE IF NOT EXISTS asientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_auditorio VARCHAR(10) NOT NULL REFERENCES auditorios(id) ON DELETE CASCADE,
  numero_asiento INTEGER NOT NULL,
  fila VARCHAR(5) NOT NULL,
  seccion VARCHAR(50) NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id_auditorio, numero_asiento)
);

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_auditorio VARCHAR(10) NOT NULL REFERENCES auditorios(id),
  id_organizador UUID NOT NULL REFERENCES usuarios(id),
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  asistentes_esperados INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'confirmado' CHECK (estado IN ('confirmado', 'cancelado', 'pendiente')),
  tipo_evento VARCHAR(50),
  carrera VARCHAR(50),
  requiere_equipo BOOLEAN DEFAULT FALSE,
  notas_adicionales TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de registros de asistentes
CREATE TABLE IF NOT EXISTS registros_asistentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  asistente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado VARCHAR(20) DEFAULT 'confirmado' CHECK (estado IN ('confirmado', 'pendiente', 'cancelado')),
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(evento_id, asistente_id)
);

-- Tabla de archivos de eventos
CREATE TABLE IF NOT EXISTS archivos_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_evento UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_archivo VARCHAR(50),
  ruta_archivo TEXT NOT NULL,
  cargado_por UUID NOT NULL REFERENCES usuarios(id),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de enlaces mágicos para registro y reset de sesión
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(100) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('registro', 'login', 'reset')),
  nombre VARCHAR(100),
  tipo_usuario VARCHAR(20),
  data_json JSONB,
  usado BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_expiracion TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  fecha_uso TIMESTAMP WITH TIME ZONE
);

-- Índice para búsquedas rápidas por token
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_usuario_id ON magic_links(usuario_id);

-- ==========================
-- Compatibilidad con esquema anterior (renombrar columnas si existen)
DO $$
BEGIN
  -- asientos.auditorio_id -> asientos.id_auditorio
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asientos' AND column_name = 'auditorio_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asientos' AND column_name = 'id_auditorio'
  ) THEN
    EXECUTE 'ALTER TABLE asientos RENAME COLUMN auditorio_id TO id_auditorio';
  END IF;

  -- eventos.auditorio_id -> eventos.id_auditorio
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eventos' AND column_name = 'auditorio_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eventos' AND column_name = 'id_auditorio'
  ) THEN
    EXECUTE 'ALTER TABLE eventos RENAME COLUMN auditorio_id TO id_auditorio';
  END IF;

  -- eventos.organizador_id -> eventos.id_organizador
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eventos' AND column_name = 'organizador_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eventos' AND column_name = 'id_organizador'
  ) THEN
    EXECUTE 'ALTER TABLE eventos RENAME COLUMN organizador_id TO id_organizador';
  END IF;

  -- registros_asistentes.usuario_id -> registros_asistentes.asistente_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_asistentes' AND column_name = 'usuario_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_asistentes' AND column_name = 'asistente_id'
  ) THEN
    EXECUTE 'ALTER TABLE registros_asistentes RENAME COLUMN usuario_id TO asistente_id';
  END IF;

  -- archivos_evento.evento_id -> archivos_evento.id_evento
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'archivos_evento' AND column_name = 'evento_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'archivos_evento' AND column_name = 'id_evento'
  ) THEN
    EXECUTE 'ALTER TABLE archivos_evento RENAME COLUMN evento_id TO id_evento';
  END IF;

  -- registros_asistentes.evento_id -> registros_asistentes.id_evento
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_asistentes' AND column_name = 'evento_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_asistentes' AND column_name = 'id_evento'
  ) THEN
    EXECUTE 'ALTER TABLE registros_asistentes RENAME COLUMN evento_id TO id_evento';
  END IF;

  -- registros_asistentes.asistente_id -> registros_asistentes.id_asistente
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_asistentes' AND column_name = 'asistente_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_asistentes' AND column_name = 'id_asistente'
  ) THEN
    EXECUTE 'ALTER TABLE registros_asistentes RENAME COLUMN asistente_id TO id_asistente';
  END IF;

  -- notificaciones_enviadas.evento_id -> notificaciones_enviadas.id_evento
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notificaciones_enviadas' AND column_name = 'evento_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notificaciones_enviadas' AND column_name = 'id_evento'
  ) THEN
    EXECUTE 'ALTER TABLE notificaciones_enviadas RENAME COLUMN evento_id TO id_evento';
  END IF;

  -- historial_cambios.usuario_id -> historial_cambios.id_usuario
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historial_cambios' AND column_name = 'usuario_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historial_cambios' AND column_name = 'id_usuario'
  ) THEN
    EXECUTE 'ALTER TABLE historial_cambios RENAME COLUMN usuario_id TO id_usuario';
  END IF;
END;
$$;

-- Función para verificar si un usuario es organizador de un evento
DROP FUNCTION IF EXISTS es_organizador_evento(uuid, uuid);
CREATE OR REPLACE FUNCTION es_organizador_evento(
  p_id_usuario UUID,
  p_id_evento UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM eventos
    WHERE id = p_id_evento AND id_organizador = p_id_usuario
  );
END;
$$ LANGUAGE plpgsql;

-- Función para eliminar evento (solo organizadores)
DROP FUNCTION IF EXISTS eliminar_evento(uuid, uuid);
CREATE OR REPLACE FUNCTION eliminar_evento(
  p_id_evento UUID,
  p_id_usuario UUID
) RETURNS BOOLEAN AS $$
BEGIN
  IF NOT es_organizador_evento(p_id_usuario, p_id_evento) THEN
    RAISE EXCEPTION 'Solo el organizador puede eliminar este evento';
  END IF;

  DELETE FROM eventos WHERE id = p_id_evento;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar asientos automáticamente en orden
DROP FUNCTION IF EXISTS asignar_asiento_automatico(uuid, uuid);
CREATE OR REPLACE FUNCTION asignar_asiento_automatico(
  p_id_evento UUID,
  p_id_asistente UUID
) RETURNS UUID AS $$
DECLARE
  v_id_asiento UUID;
  v_numero_orden INTEGER;
  v_id_auditorio VARCHAR(1);
BEGIN
  SELECT id_auditorio INTO v_id_auditorio
  FROM eventos
  WHERE id = p_id_evento;

  SELECT COALESCE(MAX(numero_orden), 0) + 1 INTO v_numero_orden
  FROM registros_asistentes
  WHERE id_evento = p_id_evento;

  SELECT id INTO v_id_asiento
  FROM asientos
  WHERE id_auditorio = v_id_auditorio
    AND id NOT IN (
      SELECT id_asiento 
      FROM registros_asistentes 
      WHERE id_evento = p_id_evento AND id_asiento IS NOT NULL
    )
  ORDER BY numero_asiento
  LIMIT 1;

  INSERT INTO registros_asistentes (id_evento, id_asistente, id_asiento, numero_orden)
  VALUES (p_id_evento, p_id_asistente, v_id_asiento, v_numero_orden);

  RETURN v_id_asiento;
END;
$$ LANGUAGE plpgsql;

-- Función de búsqueda avanzada de eventos
DROP FUNCTION IF EXISTS buscar_eventos(
  text,
  varchar,
  date,
  date,
  varchar,
  uuid,
  varchar,
  varchar,
  integer,
  integer
);
CREATE OR REPLACE FUNCTION buscar_eventos(
  p_texto_busqueda TEXT DEFAULT NULL,
  p_id_auditorio VARCHAR(1) DEFAULT NULL,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL,
  p_tipo_evento VARCHAR(50) DEFAULT NULL,
  p_id_organizador UUID DEFAULT NULL,
  p_estado VARCHAR(20) DEFAULT NULL,
  p_carrera VARCHAR(100) DEFAULT NULL,
  p_limite INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  titulo VARCHAR(255),
  descripcion TEXT,
  id_auditorio VARCHAR(1),
  id_organizador UUID,
  nombre_organizador VARCHAR(255),
  fecha DATE,
  hora_inicio TIME,
  hora_fin TIME,
  asistentes_esperados INTEGER,
  asistentes_registrados BIGINT,
  estado VARCHAR(20),
  tipo_evento VARCHAR(50),
  carrera VARCHAR(100),
  cantidad_archivos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.titulo,
    e.descripcion,
    e.id_auditorio,
    e.id_organizador,
    u.nombre as nombre_organizador,
    e.fecha,
    e.hora_inicio,
    e.hora_fin,
    e.asistentes_esperados,
    COUNT(DISTINCT ra.id) as asistentes_registrados,
    e.estado,
    e.tipo_evento,
    e.carrera,
    COUNT(DISTINCT af.id) as cantidad_archivos
  FROM eventos e
  INNER JOIN usuarios u ON e.id_organizador = u.id
  LEFT JOIN registros_asistentes ra ON e.id = ra.id_evento AND ra.estado = 'confirmado'
  LEFT JOIN archivos_evento af ON e.id = af.id_evento
  WHERE
    (p_texto_busqueda IS NULL OR 
     to_tsvector('spanish', e.titulo || ' ' || COALESCE(e.descripcion, '')) @@ plainto_tsquery('spanish', p_texto_busqueda))
    AND (p_id_auditorio IS NULL OR e.id_auditorio = p_id_auditorio)
    AND (p_fecha_inicio IS NULL OR e.fecha >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR e.fecha <= p_fecha_fin)
    AND (p_tipo_evento IS NULL OR e.tipo_evento = p_tipo_evento)
    AND (p_id_organizador IS NULL OR e.id_organizador = p_id_organizador)
    AND (p_estado IS NULL OR e.estado = p_estado)
    AND (p_carrera IS NULL OR e.carrera = p_carrera)
  GROUP BY e.id, u.nombre
  ORDER BY e.fecha DESC, e.hora_inicio DESC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar fecha_actualizacion automáticamente
DROP TRIGGER IF EXISTS trigger_actualizar_usuarios ON usuarios;
DROP TRIGGER IF EXISTS trigger_actualizar_eventos ON eventos;

DROP FUNCTION IF EXISTS actualizar_timestamp();
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_usuarios
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trigger_actualizar_eventos
BEFORE UPDATE ON eventos
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp();

-- Trigger para auditoría de eliminaciones (solo organizadores)
DROP TRIGGER IF EXISTS trigger_auditar_eliminacion_evento ON eventos;
DROP FUNCTION IF EXISTS auditar_eliminacion_evento();
CREATE OR REPLACE FUNCTION auditar_eliminacion_evento()
RETURNS TRIGGER AS $$
DECLARE
  reg_col TEXT;
  usr_col TEXT;
  cols TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historial_cambios' AND column_name = 'registro_id') THEN
    reg_col := 'registro_id';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historial_cambios' AND column_name = 'id_registro') THEN
    reg_col := 'id_registro';
  ELSE
    reg_col := 'registro_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historial_cambios' AND column_name = 'usuario_id') THEN
    usr_col := 'usuario_id';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historial_cambios' AND column_name = 'id_usuario') THEN
    usr_col := 'id_usuario';
  ELSE
    usr_col := 'usuario_id';
  END IF;

  cols := format('tabla_afectada, %I, accion, %I, datos_anteriores', reg_col, usr_col);

  EXECUTE format('INSERT INTO historial_cambios (%s) VALUES ($1,$2,$3,$4,$5)', cols)
  USING 'eventos', OLD.id, 'eliminar', OLD.id_organizador, row_to_json(OLD);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auditar_eliminacion_evento
BEFORE DELETE ON eventos
FOR EACH ROW
EXECUTE FUNCTION auditar_eliminacion_evento();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_auditorio_fecha ON eventos(id_auditorio, fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_organizador ON eventos(id_organizador);
CREATE INDEX IF NOT EXISTS idx_registros_evento ON registros_asistentes(id_evento);

-- Tabla para rastrear notificaciones enviadas
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_evento UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  correo_destinatario TEXT NOT NULL,
  fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id_evento, tipo, correo_destinatario)
);

-- Migración: Agregar columnas de asientos a registros_asistentes
ALTER TABLE IF EXISTS registros_asistentes
  ADD COLUMN IF NOT EXISTS id_asiento uuid REFERENCES asientos(id);

ALTER TABLE IF EXISTS registros_asistentes
  ADD COLUMN IF NOT EXISTS numero_orden integer;

CREATE INDEX IF NOT EXISTS idx_registros_asiento ON registros_asistentes(id_asiento);

-- ==========================
-- 02 - Seed data
-- ==========================
-- Insertar auditorios
INSERT INTO auditorios (id, nombre, capacidad_total, descripcion, equipamiento) VALUES
('A', 'Auditorio A', 168, 'Auditorio principal con capacidad para 168 personas (18 filas x 9 columnas)', ARRAY['proyector', 'sistema_audio', 'microfono', 'pizarra_digital']),
('B', 'Auditorio B', 168, 'Auditorio secundario con capacidad para 168 personas (18 filas x 9 columnas)', ARRAY['proyector', 'sistema_audio', 'microfono']),
('1', 'Auditorio 1', 100, 'Auditorio adicional con capacidad para 100 personas', ARRAY['proyector', 'sistema_audio']),
('2', 'Auditorio 2', 120, 'Auditorio adicional con capacidad para 120 personas', ARRAY['proyector', 'sistema_audio', 'microfono'])
ON CONFLICT (id) DO NOTHING;

-- Insertar asientos para Auditorio A (168 asientos: 18 filas x 9 columnas)
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..168 LOOP
    INSERT INTO asientos (id_auditorio, numero_asiento, fila, seccion)
    VALUES (
      'A',
      i,
      CHR(65 + ((i - 1) / 9)),
      'General'
    )
    ON CONFLICT (id_auditorio, numero_asiento) DO NOTHING;
  END LOOP;
END $$;

-- Insertar asientos para Auditorio B (168 asientos: 18 filas x 9 columnas)
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..168 LOOP
    INSERT INTO asientos (id_auditorio, numero_asiento, fila, seccion)
    VALUES (
      'B',
      i,
      CHR(65 + ((i - 1) / 9)), 
      'General' 
    )
    ON CONFLICT (id_auditorio, numero_asiento) DO NOTHING;
  END LOOP;
END $$;

-- Crear un índice único para prevenir inscripciones duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_evento_asistente_confirmado
  ON registros_asistentes(id_evento, id_asistente)
  WHERE estado = 'confirmado';

-- Insertar usuarios de ejemplo (solo asistentes)
INSERT INTO usuarios (nombre, email, tipo_usuario, telefono, departamento) VALUES
('Ana Martínez', 'ana.martinez@universidad.edu', 'asistente', '555-0201', 'Estudiante'),
('Luis Rodríguez', 'luis.rodriguez@universidad.edu', 'asistente', '555-0202', 'Estudiante'),
('Sofia Torres', 'sofia.torres@universidad.edu', 'asistente', '555-0203', 'Estudiante')
ON CONFLICT (email) DO NOTHING;

-- End of combined SQL

-- Tabla para conteos en tiempo real de asientos
CREATE TABLE IF NOT EXISTS asientos_conteo (
  id_evento UUID PRIMARY KEY,
  datos JSONB NOT NULL,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
