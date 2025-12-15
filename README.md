
# 📘 Documentación del Proyecto AgroBits

## 🧠 Idea principal
AgroBits es un sistema de monitoreo en tiempo real para cultivos mediante sensores físicos conectados a ESP32 y gestionados a través de Firebase. Su objetivo es ofrecer recomendaciones y alertas automáticas según las necesidades específicas de cada cultivo.

---

## 🔧 Tecnologías utilizadas

- Firebase Firestore (base de datos en tiempo real)
- Firebase Admin SDK (importación de datos)
- React (interfaz frontend)
- Node.js (script de importación)
- JavaScript (conexión Firebase + lógica)
- JSON (estructura inicial de datos)
- Arduino/ESP32 (hardware sensores, próximamente)

---

## 🧱 Estructura de Firestore

### Colecciones principales:
- `usuarios/`
  - Cada usuario tiene subcolecciones:
    - `cultivos/`
    - `sensores/`
- `cultivos/` (valores ideales de cada cultivo)

### Ejemplo:
```
usuarios/
  joel123/
    ├── nombre: "Joel"
    ├── cultivos/
         lechuga/
           sensoresVinculados: ["sensorH01"]
    ├── sensores/
         sensorH01/
           tipo: "humedad"
           valor: 47
           cultivos: ["lechuga", "albahaca"]
```

---

## ⚙️ Script de importación

- Se utiliza un script Node.js llamado `import.js` que importa usuarios, sensores y cultivos desde un archivo JSON.
- Parámetros disponibles:
  - `DATA_FILE` (opcional): ruta al archivo de datos. Por defecto usa `firebase-backend/data.json`.
  - `SERVICE_ACCOUNT_PATH` (opcional): ruta al archivo de credenciales del servicio. Por defecto usa `firebase-backend/serviceAccountKey.json`.
- Ejemplo de ejecución segura (manteniendo las credenciales fuera del repo):
  ```bash
  cd firebase-backend
  DATA_FILE=./data.json SERVICE_ACCOUNT_PATH=./serviceAccountKey.json node import.js
  ```
- El script realiza la escritura en lotes para evitar límites de Firestore y falla con código de salida distinto de cero si ocurre algún error.

---

## 🌐 App Web Mock

Creada con React:

- Conexión a Firestore
- Lectura de sensores del usuario `joel123`
- Comparación automática con valores ideales de cada cultivo
- Alertas visuales si algún valor está fuera de rango

---

## ✅ Estado actual

- Firebase configurado y funcionando
- Estructura de base de datos lista
- Datos importados exitosamente
- App React conectada y mostrando datos
- Lógica de alertas funcional

---

## 📌 Siguientes pasos sugeridos

1. Añadir más tipos de sensores: pH, luz, temperatura
2. Diseño visual con Tailwind o UI components
3. Sistema de autenticación (Firebase Auth)
4. Guardado de alertas como historial
5. Control de riego automatizado (hardware + lógica)

---
