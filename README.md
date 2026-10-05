# customer-web

Portal de reservas para visitantes de un negocio turístico. Permite conocer la oferta del negocio, consultar horarios y tarifas y organizar una visita desde una computadora, una tableta o un teléfono.

## Qué ofrece

- Información del negocio y sus servicios.
- Consulta de fechas disponibles y horarios.
- Tarifas y desglose del importe de la visita.
- Formulario de reserva y revisión antes de confirmar.
- Confirmación con código y detalles de la reserva.
- Opciones de idioma en español, inglés y portugués.
- Visualización de importes en colones, dólares estadounidenses y reales brasileños.

Las conversiones de moneda son informativas; el importe de la reserva se determina en colones costarricenses.

## Experiencia de reserva

El visitante elige una fecha, indica los datos de su grupo y revisa el detalle de la reserva antes de confirmarla. La disponibilidad, los horarios y las tarifas dependen de la configuración del negocio.

## Parte del sistema

Este proyecto es la cara pública del sistema de gestión turística. Se complementa con admin-web, destinado al personal, y business-api, que centraliza la información del negocio.

## Compilación para publicación

Ejecuta npm ci y npm run build con las versiones de Node y npm indicadas en package.json. Publica el contenido de dist/customer-web/browser/ en la raíz del sitio. La compilación de producción usa https://reserva.api.atenix.net/api/v1, definida en src/environments/environment.production.ts. npm start conserva la conexión local mediante /api/v1 y proxy.conf.json. Los archivos .env no configuran automáticamente Angular.

La API necesita su dominio HTTPS activo y permitir el origen de este sitio mediante CORS. Guía completa: https://github.com/AtenixCr/reserv-web-base-backend/blob/main/docs/render-deployment.md
