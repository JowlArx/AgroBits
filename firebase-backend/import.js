const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const SERVICE_ACCOUNT_PATH =
  process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, "serviceAccountKey.json");
const DATA_PATH = process.env.DATA_FILE || path.join(__dirname, "data.json");
const BATCH_LIMIT = 450; // Leave headroom under Firestore's 500 write limit

function loadJson(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} no encontrado en la ruta: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const serviceAccount = loadJson(SERVICE_ACCOUNT_PATH, "Archivo de credenciales");
const dataset = loadJson(DATA_PATH, "Archivo de datos");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function commitWrites(writes) {
  for (const batchWrites of chunk(writes, BATCH_LIMIT)) {
    const batch = db.batch();
    for (const { ref, payload } of batchWrites) {
      batch.set(ref, payload);
    }
    await batch.commit();
  }
}

async function importData() {
  const writes = [];

  for (const userId in dataset.usuarios) {
    const user = dataset.usuarios[userId];
    writes.push({
      ref: db.collection("usuarios").doc(userId),
      payload: { nombre: user.nombre }
    });

    if (user.cultivos) {
      for (const cultivoId in user.cultivos) {
        writes.push({
          ref: db
            .collection("usuarios")
            .doc(userId)
            .collection("cultivos")
            .doc(cultivoId),
          payload: user.cultivos[cultivoId]
        });
      }
    }

    if (user.sensores) {
      for (const sensorId in user.sensores) {
        writes.push({
          ref: db
            .collection("usuarios")
            .doc(userId)
            .collection("sensores")
            .doc(sensorId),
          payload: user.sensores[sensorId]
        });
      }
    }
  }

  for (const cultivoId in dataset.cultivos) {
    writes.push({
      ref: db.collection("cultivos").doc(cultivoId),
      payload: dataset.cultivos[cultivoId]
    });
  }

  await commitWrites(writes);
  console.log(`✅ Datos importados exitosamente a Firestore (${writes.length} documentos).`);
}

importData().catch((error) => {
  console.error("❌ Error al importar datos:", error);
  process.exitCode = 1;
});
