# AgroBits — Constitution

## 1. Misión

Desarrollar una plataforma accesible de monitoreo agrícola que transforme las mediciones de sensores en información comprensible y útil para el cuidado de los cultivos.

## 2. Principios

1. Simplicidad: priorizar una solución pequeña que funcione y pueda verificarse.
2. Bajo costo: favorecer alternativas económicas y controlar los costes de infraestructura. Para el MVP se fija un objetivo de coste mensual de ~0 € (tier gratuito); cualquier servicio facturable requiere aprobación previa.
3. Modularidad: separar la interfaz, los datos, la lógica de negocio y el firmware.
4. Seguridad: proteger las cuentas, los datos y las credenciales desde el diseño.
5. Trazabilidad: documentar decisiones, cambios y resultados de las pruebas.
6. Validación: no aceptar funcionalidades únicamente porque parecen funcionar.
7. Supervisión humana: las decisiones arquitectónicas y los cambios críticos requieren aprobación.

## 3. Alcance inicial

El MVP buscará permitir que un usuario consulte sus cultivos, visualice mediciones asociadas a sensores y reciba alertas basadas en criterios definidos.

La integración con hardware se realizará después de validar el flujo de datos mediante simulaciones.

## 4. Calidad

Toda funcionalidad debe contar con criterios de aceptación verificables. La arquitectura debe favorecer pruebas automatizadas y mantenimiento sencillo.

## 5. Seguridad y privacidad

Se aplicará el principio de mínimo privilegio. Ninguna regla de acceso público indiscriminado será aceptable para datos privados de usuarios.

Las claves privadas y credenciales no deben incluirse en el repositorio.

## 6. Gestión de cambios

Los cambios de arquitectura, modelo de datos, dependencias y seguridad deben justificarse y aprobarse antes de implementarse.

## 7. Idioma

La documentación del proyecto se redacta en español, conservando en inglés los nombres técnicos convencionales.

## 8. Criterio de finalización

Una tarea solo se considera terminada cuando cumple sus criterios de aceptación, se han ejecutado las verificaciones pertinentes y se documentan las limitaciones pendientes.