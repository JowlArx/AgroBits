import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export async function leerCultivos(userId) {
  const cultivosRef = collection(db, `usuarios/${userId}/cultivos`);
  const snapshot = await getDocs(cultivosRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function leerSensoresPorUsuario(userId) {
  const sensoresRef = collection(db, `usuarios/${userId}/sensores`);
  const snapshot = await getDocs(sensoresRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function obtenerCultivoGlobal(cultivoId) {
  const docRef = doc(db, "cultivos", cultivoId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}
