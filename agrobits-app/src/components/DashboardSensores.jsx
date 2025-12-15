import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Flame, Droplet, Thermometer, Sun } from "lucide-react";

const mockSensors = [
  {
    id: "humedad-albahaca",
    tipo: "humedad",
    valor: 47,
    unidad: "%",
    cultivo: "albahaca",
    estado: "ok",
  },
  {
    id: "temp-albahaca",
    tipo: "temperatura",
    valor: 32,
    unidad: "°C",
    cultivo: "albahaca",
    estado: "alerta",
  },
  {
    id: "luz-albahaca",
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

const estadoCopy = {
  alerta: "⚠️ Fuera de rango",
  ok: "✅ En rango",
  desconocido: "ℹ️ Sin datos",
};

function getEstado(sensorEstado) {
  if (!sensorEstado) return "desconocido";
  return ["ok", "alerta"].includes(sensorEstado) ? sensorEstado : "desconocido";
}

export default function DashboardSensores() {
  const [sensores, setSensores] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarSensores() {
      try {
        setCargando(true);
        setError(null);
        // Aquí se puede reemplazar por la consulta real a Firestore
        setSensores(mockSensors);
      } catch (err) {
        setError("No se pudieron cargar los sensores");
      } finally {
        setCargando(false);
      }
    }

    cargarSensores();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-green-50 to-lime-100 p-4">
        <h1 className="text-3xl font-bold mb-4 text-green-900">Panel de sensores activos 🌱</h1>
        <p className="text-green-800">Cargando sensores…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-green-50 to-lime-100 p-4">
        <h1 className="text-3xl font-bold mb-4 text-green-900">Panel de sensores activos 🌱</h1>
        <p className="text-red-700 font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-green-50 to-lime-100 p-4">
      <h1 className="text-3xl font-bold mb-4 text-green-900">Panel de sensores activos 🌱</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensores.map((sensor) => {
          const estado = getEstado(sensor.estado);
          return (
            <Card
              key={sensor.id || `${sensor.tipo}-${sensor.cultivo}`}
              className={`rounded-2xl shadow-md p-4 border-2 ${
                estado === "alerta"
                  ? "border-red-400 bg-red-50"
                  : estado === "ok"
                  ? "border-green-300 bg-white"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xl font-semibold capitalize">{sensor.tipo}</div>
                  <div className="text-3xl">{iconos[sensor.tipo] ?? <Flame />}</div>
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
                    estado === "alerta"
                      ? "text-red-600"
                      : estado === "ok"
                      ? "text-green-600"
                      : "text-gray-700"
                  }`}
                >
                  {estadoCopy[estado]}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
