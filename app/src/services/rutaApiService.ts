export type Coordenada = [number, number]; // latitud, longitud
export interface RutaCalculada {
  puntos: Coordenada[];
  distancia: number;
  duracion: number;
}

const cache = new Map<string, RutaCalculada>();

// OSRM calcula el recorrido por calles en el orden solicitado.
export async function calcularRuta(paradas: Coordenada[], signal: AbortSignal): Promise<RutaCalculada> {
  const coordenadas = paradas.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const guardada = cache.get(coordenadas);
  if (guardada) return guardada;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=full&geometries=geojson`,
    { signal }
  );
  if (!response.ok) throw new Error('El servicio de rutas no está disponible.');
  const data = await response.json();
  const ruta = data.routes?.[0];
  if (data.code !== 'Ok' || !ruta?.geometry?.coordinates?.length) {
    throw new Error('No se encontró un recorrido por calles para estas ubicaciones.');
  }
  const resultado: RutaCalculada = {
    puntos: ruta.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]),
    distancia: ruta.distance,
    duracion: ruta.duration,
  };
  if (cache.size >= 20) cache.delete(cache.keys().next().value!);
  cache.set(coordenadas, resultado);
  return resultado;
}
