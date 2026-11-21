// Constantes del backend de AgroBits. ESTE ARCHIVO SÍ SE VERSIONA.
//
// La anon key de Supabase es PÚBLICA por diseño: viaja en el bundle de la web
// (VITE_SUPABASE_ANON_KEY en web/.env.local) y solo permite lo que RLS autoriza.
// El secreto real del dispositivo es el token de dispositivo: el cliente lo introduce
// en el portal cautivo, se guarda en la NVS del ESP32 y nunca se versiona.
//
// Desarrollo local: include/secrets.h (no versionado) puede sobrescribir cualquier
// constante de este archivo. Ver include/secrets.example.h.
#pragma once

#if __has_include("secrets.h")
#include "secrets.h"
#endif

#ifndef SUPABASE_URL
#define SUPABASE_URL "https://fxiukidjxdcsrhyiphmu.supabase.co"
#endif

#ifndef SUPABASE_FUNCTION_PATH
#define SUPABASE_FUNCTION_PATH "/functions/v1/ingesta"
#endif

#ifndef SUPABASE_ANON_KEY
#define SUPABASE_ANON_KEY "sb_publishable_-Qp9IAQCOUad9yEb44he7w_acXYEy90"
#endif

// Cadena observada el 30/10/2026: supabase.co ← WE1 ← GTS Root R4 ← GlobalSign Root CA.
// Se ancla en GTS Root R4 (raíz autofirmada de Google Trust Services, válida hasta 2036),
// que es la que emite el intermedio WE1. Si Supabase cambia de CA, hay que sustituir este bloque.
#if !defined(AGROBITS_CA_EXTERNA)
static const char AGROBITS_CA_PEM[] = R"EOF(
-----BEGIN CERTIFICATE-----
MIICCTCCAY6gAwIBAgINAgPlwGjvYxqccpBQUjAKBggqhkjOPQQDAzBHMQswCQYD
VQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEUMBIG
A1UEAxMLR1RTIFJvb3QgUjQwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAwMDAw
WjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2Vz
IExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjQwdjAQBgcqhkjOPQIBBgUrgQQAIgNi
AATzdHOnaItgrkO4NcWBMHtLSZ37wWHO5t5GvWvVYRg1rkDdc/eJkTBa6zzuhXyi
QHY7qca4R9gq55KRanPpsXI5nymfopjTX15YhmUPoYRlBtHci8nHc8iMai/lxKvR
HYqjQjBAMA4GA1UdDwEB/wQEAwIBhjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQW
BBSATNbrdP9JNqPV2Py1PsVq8JQdjDAKBggqhkjOPQQDAwNpADBmAjEA6ED/g94D
9J+uHXqnLrmvT/aDHQ4thQEd0dlq7A/Cr8deVl5c1RxYIigL9zC2L7F8AjEA8GE8
p/SgguMh1YQdc4acLa/KNJvxn7kjNuK8YAOdgLOaVsjh4rsUecrNIdSUtUlD
-----END CERTIFICATE-----
)EOF";
#endif
