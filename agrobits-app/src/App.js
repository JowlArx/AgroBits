import React, { useEffect, useState } from "react";
import { leerCultivos, leerSensoresPorUsuario, obtenerCultivoGlobal } from "./services/firebaseService";

function App() {
  const [cultivos, setCultivos] = useState([]);
  const [sensores, setSensores] = useState([]);
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const cultivosUser = await leerCultivos("joel123");
      const sensoresUser = await leerSensoresPorUsuario("joel123");

      // Comparar valores con los ideales
      let nuevasAlertas = [];

      for (const sensor of sensoresUser) {
        for (const cultivoId of sensor.cultivos) {
          const cultivoIdeal = await obtenerCultivoGlobal(cultivoId);

          if (!cultivoIdeal) continue;

          if (sensor.tipo === "humedad") {
            if (sensor.valor < cultivoIdeal.humedadMin || sensor.valor > cultivoIdeal.humedadMax) {
              nuevasAlertas.push({
                cultivo: cultivoId,
                sensor: sensor.tipo,
                valor: sensor.valor,
                estado: "⚠️ Fuera de rango"
              });
            } else {
              nuevasAlertas.push({
                cultivo: cultivoId,
                sensor: sensor.tipo,
                valor: sensor.valor,
                estado: "✅ OK"
              });
            }
          }

          // Acá podés repetir la lógica para temperatura, luz, pH...
        }
      }

      setCultivos(cultivosUser);
      setSensores(sensoresUser);
      setAlertas(nuevasAlertas);
    }

    fetchData();
  }, []);
  useEffect(() => {
  console.log("Cultivos cargados:", cultivos);
  console.log("Sensores cargados:", sensores);
  console.log("Alertas generadas:", alertas);
}, [cultivos, sensores, alertas]);

  return (
    <div>
      <h1>AgroBits - Sensores en tiempo real 🌿</h1>

      <h2>Cultivos</h2>
      <ul>
        {cultivos.map(c => (
          <li key={c.id}>🌱 {c.id}</li>
        ))}
      </ul>

      <h2>Alertas de sensores</h2>
      <ul>
        {alertas.map((a, i) => (
          <li key={i}>
            {a.cultivo} | Sensor: {a.sensor} → Valor: {a.valor} → {a.estado}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
