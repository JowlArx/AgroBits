// Plantilla OPCIONAL de sobrescritura para DESARROLLO LOCAL.
//
// El firmware de producción NO necesita este archivo: usa include/backend.h y la
// configuración (WiFi y token) que el cliente introduce en el portal cautivo y que
// se guarda en la NVS del ESP32.
//
// Copia este archivo a include/secrets.h solo si necesitas cambiar constantes del backend.
// NO pongas aquí WiFi ni tokens de dispositivo: esos valores se introducen en el portal.
//
// #define SUPABASE_URL "https://fxiukidjxdcsrhyiphmu.supabase.co"
// #define SUPABASE_FUNCTION_PATH "/functions/v1/ingesta"
// #define SUPABASE_ANON_KEY "sb_publishable_..."
//
// Para sobrescribir la CA, define AGROBITS_CA_EXTERNA y tu propio AGROBITS_CA_PEM:
// #define AGROBITS_CA_EXTERNA
// static const char AGROBITS_CA_PEM[] = R"EOF(
// -----BEGIN CERTIFICATE-----
// ...
// -----END CERTIFICATE-----
// )EOF";
// #define PORTAL_PASSWORD "CAMBIAR_POR_CONTRASENA_LOCAL"
