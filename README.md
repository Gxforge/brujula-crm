# Brújula CRM · Prospección Comercial y Catálogos

Sistema modular de gestión comercial (CRM) diseñado para importar tablas de investigación en Excel (`.xlsx`), `.csv` o `.json`, administrar prospectos en vista Tabla o Kanban, y enviar propuestas personalizadas por WhatsApp.

## Descargas Directas (Android y PC Windows)

Cada cambio en la rama `main` compila automáticamente mediante **GitHub Actions**:

- **Android (`.apk` firmado e instalable):** `Brujula-CRM-Android.apk`
- **Windows PC Portable (`.exe` sin instalación):** `Brujula-CRM-PC-Portable.exe`
- **Windows PC Instalador (`.exe` con acceso directo):** `Brujula-CRM-PC-Setup.exe`

Puedes descargar los instaladores listos desde la sección **Releases** o desde los artefactos del flujo en la pestaña **Actions**.

## Características principales

- **Importador universal `.xlsx` / `.csv` / `.json` + Pegado directo:** Compatible con libros de `openpyxl`, Microsoft Excel, Google Sheets y tablas Markdown, con mapeador visual de hojas y columnas.
- **Base precargada opcional:** Incluye 35 negocios reales verificados en las 15 provincias de Cuba + Isla de la Juventud (filtrados contra `elyerromenu.com`).
- **Vista Dual Tabla + Kanban:** Cambio rápido de etapa comercial, acciones en lote y botón Deshacer.
- **Asistente de Venta por WhatsApp:** Plantillas dinámicas con variables `{negocio}`, `{contacto}`, `{provincia}` y `{rubro}`.
- **Exportación nativa:** Descarga en Excel real (`.xlsx`), `.csv` (UTF-8) o respaldo completo `.json`.

## Arquitectura modular (< 300 líneas por archivo)

```text
├── index.html                  # Shell semántico principal
├── styles/                     # Módulos CSS desacoplados (layout, dashboard, clients, import, modals)
├── src/
│   ├── main.js                 # Punto de entrada y navegación
│   ├── core/                   # Estado reactivo (store.js) y utilidades (utils.js)
│   ├── data/                   # Semilla verificada de Cuba (seed-cuba.js)
│   ├── services/               # Lector OOXML .xlsx, importador tabular y exportador .xlsx/.csv
│   └── ui/                     # Vistas modulares (dashboard, clients, import, modals)
├── electron/main.cjs           # Contenedor de escritorio para Windows (protocolo seguro app://)
├── capacitor.config.json       # Configuración nativa para Android APK
└── .github/workflows/          # Pipeline CI/CD para compilar APK + EXE y publicar Release
```
