# Configuración del Proyecto en Visual Studio Code

## Extensiones Recomendadas

Para trabajar con este proyecto de manera óptima en Visual Studio Code, instala las siguientes extensiones:

### Esenciales

1. **ES7+ React/Redux/React-Native snippets**
   - ID: `dsznajder.es7-react-js-snippets`
   - Proporciona snippets útiles para React y TypeScript

2. **Tailwind CSS IntelliSense**
   - ID: `bradlc.vscode-tailwindcss`
   - Autocompletado inteligente para clases de Tailwind CSS

3. **ESLint**
   - ID: `dbaeumer.vscode-eslint`
   - Linting en tiempo real para JavaScript/TypeScript

4. **Prettier - Code formatter**
   - ID: `esbenp.prettier-vscode`
   - Formateo automático de código

5. **TypeScript Vue Plugin (Volar)**
   - ID: `Vue.vscode-typescript-vue-plugin`
   - Mejor soporte para TypeScript en proyectos Next.js

### Recomendadas

6. **Path Intellisense**
   - ID: `christian-kohler.path-intellisense`
   - Autocompletado de rutas de archivos

7. **Auto Rename Tag**
   - ID: `formulahendry.auto-rename-tag`
   - Renombra automáticamente las etiquetas HTML/JSX emparejadas

8. **GitLens**
   - ID: `eamodio.gitlens`
   - Mejora la integración con Git

9. **Error Lens**
   - ID: `usernamehw.errorlens`
   - Muestra errores y advertencias inline

10. **Console Ninja**
    - ID: `WallabyJs.console-ninja`
    - Visualización mejorada de console.log

## Instalación de Dependencias

### Requisitos Previos

- **Node.js**: Versión 18.17 o superior
- **npm** o **pnpm** o **yarn**

### Pasos de Instalación

1. **Clonar o descargar el proyecto**
   \`\`\`bash
   # Si usas Git
   git clone <url-del-repositorio>
   cd auditorio
   \`\`\`

2. **Instalar dependencias**
   \`\`\`bash
   # Con npm
   npm install

   # Con pnpm (recomendado)
   pnpm install

   # Con yarn
   yarn install
   \`\`\`

3. **Configurar variables de entorno** (cuando se conecte la base de datos)
   \`\`\`bash
   # Crear archivo .env.local
   cp .env.example .env.local
   
   # Editar .env.local con tus credenciales
   \`\`\`

## Ejecutar el Proyecto

### Modo Desarrollo

\`\`\`bash
# Con npm
npm run dev

# Con pnpm
pnpm dev

# Con yarn
yarn dev
\`\`\`

El proyecto estará disponible en: `http://localhost:3000`

### Modo Producción

\`\`\`bash
# Construir el proyecto
npm run build

# Ejecutar en producción
npm start
\`\`\`

## Configuración Recomendada de VS Code

Crea o actualiza `.vscode/settings.json` en la raíz del proyecto:

\`\`\`json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\$$([^)]*)\$$", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "editor.quickSuggestions": {
    "strings": true
  }
}
\`\`\`

## Estructura del Proyecto

\`\`\`
auditorio/
├── app/                    # Rutas y páginas (Next.js App Router)
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página principal
│   └── globals.css        # Estilos globales
├── components/            # Componentes React
│   ├── ui/               # Componentes de UI (shadcn)
│   ├── formulario-reserva.tsx
│   ├── vista-calendario.tsx
│   ├── lista-reservas.tsx
│   ├── estado-auditorio.tsx
│   ├── vista-asistente.tsx
│   └── menu-seleccion-usuario.tsx
├── lib/                   # Utilidades y helpers
│   ├── utils.ts
│   └── validacion-reservas.ts
├── scripts/               # Scripts SQL para base de datos
│   ├── 01-schema-database.sql
│   └── 02-seed-data.sql
├── docs/                  # Documentación
│   ├── database-schema.md
│   └── setup-vscode.md
└── public/               # Archivos estáticos
\`\`\`

## Comandos Útiles

\`\`\`bash
# Linting
npm run lint

# Formatear código
npm run format

# Verificar tipos TypeScript
npm run type-check

# Limpiar caché de Next.js
rm -rf .next
\`\`\`

## Solución de Problemas Comunes

### Error: "Module not found"
\`\`\`bash
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Error de TypeScript
\`\`\`bash
# Reiniciar el servidor TypeScript en VS Code
# Presiona: Ctrl+Shift+P (Cmd+Shift+P en Mac)
# Escribe: "TypeScript: Restart TS Server"
\`\`\`

### Tailwind CSS no funciona
\`\`\`bash
# Verificar que globals.css esté importado en layout.tsx
# Reiniciar el servidor de desarrollo
\`\`\`

## Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [Documentación de shadcn/ui](https://ui.shadcn.com)
- [Documentación de TypeScript](https://www.typescriptlang.org/docs)
