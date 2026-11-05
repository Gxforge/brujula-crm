# Brújula CRM nativo · Flutter (inicio de migración)

Este directorio inicia la nueva app nativa. No reemplaza todavía la app publicada: es una base modular con navegación adaptable, tema completo claro/oscuro, texto no seleccionable por defecto y panel de sincronización que advierte el estado real del servicio actual.

## Ejecutar

Requiere Flutter SDK instalado. Desde este directorio:

```sh
flutter pub get
flutter run
```

## Estado actual

- Shell nativo responsive (NavigationRail en escritorio y NavigationBar en móvil).
- Tema Material 3 con paletas coordinadas de fondo, superficie, texto y controles.
- Inicio vacío; no importa ni precarga los datos de ejemplo de la app antigua.
- Selección/copias accidentales de texto desactivadas a nivel de interfaz.
- Clientes y proyectos: alta, edición, búsqueda y eliminación, con persistencia local vacía de fábrica.
- Importación/exportación de clientes en XLSX con mapeo básico de encabezados.
- Tema claro/oscuro/sistema persiste; selección accidental de texto desactivada.
- Cuenta de sincronización con registro/inicio de sesión y token guardado en almacén seguro. La API Worker incorpora cuentas aisladas por usuario, hash de contraseña PBKDF2 y sincronización de clientes/proyectos por última actualización.
- Respaldos/restauración de clientes y proyectos en JSON, con confirmación antes de reemplazar datos.
- CI para producir APK Flutter y paquete Windows desde los archivos fuente.
- Aún pendientes de validar: ejecución `flutter analyze` y builds (SDK ausente aquí); desplegar el Worker actualizado (workflow manual requiere secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`); pruebas Android real/Windows; migración de todos los campos de la app anterior.

## Próximo trabajo necesario

1. Añadir autenticación real con cuenta, contraseña protegida, recuperación y aislamiento de datos por usuario en el Worker/DB.
2. Implementar almacenamiento local y migración/importación controlada de datos existentes.
3. Migrar vistas y capacidades de forma modular, validando edición de campos y sincronización en Android físico y Windows.
4. Configurar CI Flutter y producir APK/instalador después de pruebas reales.
