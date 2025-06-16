
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Reemplazá con el nombre correcto de tu archivo de clave

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const data = require("./data.json");

async function importData() {
  for (const userId in data.usuarios) {
    const user = data.usuarios[userId];
    await db.collection("usuarios").doc(userId).set({
      nombre: user.nombre
    });

    // Cultivos del usuario
    if (user.cultivos) {
      for (const cultivoId in user.cultivos) {
        const cultivo = user.cultivos[cultivoId];
        await db
          .collection("usuarios")
          .doc(userId)
          .collection("cultivos")
          .doc(cultivoId)
          .set(cultivo);
      }
    }

    // Sensores del usuario
    if (user.sensores) {
      for (const sensorId in user.sensores) {
        const sensor = user.sensores[sensorId];
        await db
          .collection("usuarios")
          .doc(userId)
          .collection("sensores")
          .doc(sensorId)
          .set(sensor);
      }
    }
  }

  // Cultivos globales
  for (const cultivoId in data.cultivos) {
    const cultivoData = data.cultivos[cultivoId];
    await db.collection("cultivos").doc(cultivoId).set(cultivoData);
  }

  console.log("✅ Datos importados exitosamente a Firestore.");
}

importData().catch(console.error);
