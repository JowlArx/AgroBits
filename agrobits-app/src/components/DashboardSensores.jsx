import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Flame, Droplet, Thermometer, Sun } from "lucide-react";

// Simulados para testeo
const mockSensors = [
  {
    tipo: "humedad",
    valor: 47,
    unidad: "%",
    cultivo: "albhaca",
    estado: "ok",
  },
  {
    tipo: "temperatura",
    valor: 32,
    unidad: "°C",
    cultivo: "albahaca",
    estado: "alerta",
  },
  {
    tipo: "luz",
    valor: 900,
    unidad: "lux",
    cultivo: "albahaca",
    estado: "ok",
  },
];

const iconos = {
  humedad: <Droplet className="text-blue-500" />,
  temperatura: <Thermometer className="text-red-500" />,
  luz: <Sun className="text-yellow-400" />,
};

export default function DashboardSensores() {
  const [sensores, setSensores] = useState([]);

  useEffect(() => {
    // Acá iría la lógica real desde Firestore
    setSensores(mockSensors);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-green-50 to-lime-100 p-4">
      <h1 className="text-3xl font-bold mb-4 text-green-900">
        Panel de sensores activos 🌱
      </h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensores.map((sensor, i) => (
          <Card
            key={i}
            className={`rounded-2xl shadow-md p-4 border-2 ${
              sensor.estado === "alerta"
                ? "border-red-400 bg-red-50"
                : "border-green-300 bg-white"
            }`}
          >
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xl font-semibold capitalize">
                  {sensor.tipo}
                </div>
                <div className="text-3xl">{iconos[sensor.tipo]}</div>
              </div>
              <div className="text-5xl font-bold">
                {sensor.valor}
                <span className="text-lg">{sensor.unidad}</span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Cultivo: <span className="font-medium">{sensor.cultivo}</span>
              </div>
              <div
                className={`mt-1 text-sm font-bold ${
                  sensor.estado === "alerta" ? "text-red-600" : "text-green-600"
                }`}
              >
                {sensor.estado === "alerta" ? "⚠️ Fuera de rango" : "✅ En rango"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
