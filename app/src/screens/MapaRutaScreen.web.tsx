// Mapa web con datos actuales de las entregas.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/AppNavigator';
import { Entrega } from '../data/mockData';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calcularRuta, RutaCalculada } from '../services/rutaApiService';
import { useEntregas } from '../hooks/useEntregas';
import FiltroFechaEntregas from '../components/FiltroFechaEntregas';
import { COLORS } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'MapaRuta'>;

const ZONA_COORDS: Record<string, [number, number]> = {
  'Zona 1':  [14.6434, -90.5132],
  'Zona 2':  [14.6387, -90.5008],
  'Zona 3':  [14.6406, -90.5074],
  'Zona 4':  [14.6321, -90.5181],
  'Zona 5':  [14.6272, -90.5089],
  'Zona 6':  [14.6456, -90.5034],
  'Zona 7':  [14.6347, -90.5389],
  'Zona 8':  [14.6192, -90.5250],
  'Zona 9':  [14.6155, -90.5172],
  'Zona 10': [14.6041, -90.5069],
  'Zona 11': [14.6113, -90.5322],
  'Zona 12': [14.5924, -90.5250],
  'Zona 13': [14.5838, -90.5275],
  'Zona 15': [14.5991, -90.4862],
  'Zona 18': [14.6699, -90.4779],
  'Zona 21': [14.5693, -90.5389],
};

const BODEGA: [number, number] = [14.6300, -90.5200];

const STATUS_COLORS: Record<string, string> = {
  confirmado: '#F59E0B',
  despachado: '#3B82F6',
  entregado:  '#10B981',
  cancelado:  '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  confirmado: 'Pendiente',
  despachado: 'En camino',
  entregado:  'Entregado',
  cancelado:  'No entregado',
};

function getCoords(e: Entrega, idx: number): [number, number] {
  // Usa coordenadas reales si el cliente tiene lat/lng asignados
  if (e.cliente_lat != null && e.cliente_lng != null) {
    return [Number(e.cliente_lat), Number(e.cliente_lng)];
  }
  const base = ZONA_COORDS[e.cliente_zona] ?? BODEGA;
  return [base[0] + idx * 0.0009, base[1] + idx * 0.0007];
}

export default function MapaRutaScreen({ route }: Props) {
  const navigation = useNavigation();
  const { entregas, cargando, error, cargarEntregas } = useEntregas();
  const [ruta, setRuta] = useState<RutaCalculada | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  const paradas = entregas.map((entrega, indice) => ({ entrega, indice }))
    .filter(({ entrega }) => entrega.estado === 'confirmado' || entrega.estado === 'despachado')
    .sort((a, b) => Number(b.entrega.estado === 'despachado') - Number(a.entrega.estado === 'despachado'));
  const aproximadas = paradas.some(({ entrega }) => entrega.cliente_lat == null || entrega.cliente_lng == null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<any>(null);


  const counts = {
    confirmado: entregas.filter(e => e.estado === 'confirmado').length,
    despachado: entregas.filter(e => e.estado === 'despachado').length,
    entregado:  entregas.filter(e => e.estado === 'entregado').length,
    cancelado:  entregas.filter(e => e.estado === 'cancelado').length,
  };

  useEffect(() => {
    const controller = new AbortController();
    let activo = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setRuta(null);
    setErrorRuta(null);
    setCalculando(paradas.length > 0);
    {
      if (!L || !mapDivRef.current || mapRef.current) return;

      const map = L.map(mapDivRef.current).setView(BODEGA, 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Marcador de bodega
      L.marker(BODEGA, {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#1E293B;color:white;border-radius:8px;
            padding:5px 10px;font-weight:700;font-size:12px;white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid white;">
            &#127981; Bodega</div>`,
          iconAnchor: [36, 14],
        }),
      }).addTo(map).bindPopup('<strong>Bodega Central</strong><br>RutaExpress GT — punto de partida');

      // Marcadores por entrega
      entregas.forEach((e, idx) => {
        const coords = getCoords(e, idx);
        const color  = STATUS_COLORS[e.estado] ?? '#888';
        const num    = idx + 1;

        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};color:white;border-radius:50%;
            width:34px;height:34px;display:flex;align-items:center;justify-content:center;
            font-weight:800;font-size:14px;border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);">${num}</div>`,
          iconSize:    [34, 34],
          iconAnchor:  [17, 17],
          popupAnchor: [0, -22],
        });

        const coordTag = e.cliente_lat != null
          ? `<div style="font-size:10px;color:#aaa;margin-top:2px">${Number(e.cliente_lat).toFixed(4)}, ${Number(e.cliente_lng).toFixed(4)}</div>`
          : `<div style="font-size:10px;color:#aaa;margin-top:2px">coords aprox. de ${e.cliente_zona}</div>`;

        L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:200px;font-family:sans-serif;line-height:1.5">
              <div style="font-weight:800;font-size:14px;margin-bottom:4px">${num}. ${e.cliente_nombre}</div>
              <div style="color:#555;font-size:12px">${e.cliente_zona} &mdash; ${e.cliente_direccion}</div>
              ${coordTag}
              <div style="color:#555;font-size:12px;margin-bottom:8px">&#128222; ${e.cliente_telefono}</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="background:${color}22;color:${color};font-weight:700;
                  font-size:11px;border-radius:20px;padding:3px 8px">${STATUS_LABELS[e.estado]}</span>
                <span style="font-weight:800;font-size:15px;color:#1E293B">
                  Q ${Number(e.total).toFixed(2)}</span>
              </div>
              <div style="margin-top:6px;border-top:1px solid #eee;padding-top:6px;font-size:11px;color:#888">
                ${e.items.length} producto${e.items.length !== 1 ? 's' : ''} &nbsp;|&nbsp;
                ${e.items.map(i => i.producto_nombre).slice(0, 2).join(', ')}${e.items.length > 2 ? '…' : ''}
              </div>
            </div>`);
      });
      if (entregas.length) map.fitBounds(L.latLngBounds([BODEGA, ...entregas.map(getCoords)]), { padding: [35, 35], maxZoom: 15 });
      if (paradas.length) {
        timeout = setTimeout(() => controller.abort(), 15000);
        calcularRuta([BODEGA, ...paradas.map(({ entrega, indice }) => getCoords(entrega, indice))], controller.signal)
          .then(resultado => {
            if (!activo) return;
            setRuta(resultado);
            const linea = L.polyline(resultado.puntos, { color: '#2563EB', weight: 5, opacity: 0.85 }).addTo(map);
            linea.bindTooltip('Recorrido por calles desde la bodega');
            map.fitBounds(linea.getBounds(), { padding: [35, 35], maxZoom: 15 });
          })
          .catch(err => {
            if (activo) setErrorRuta(err.name === 'AbortError' ? 'El cálculo tardó demasiado. Intenta de nuevo.' : err.message);
          })
          .finally(() => {
            clearTimeout(timeout);
            if (activo) setCalculando(false);
          });
      }

    }

    return () => {
      activo = false;
      clearTimeout(timeout);
      controller.abort();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [entregas, reintento]);

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mapa de ruta</Text>
        <View style={{ width: 38 }} />
      </View>

      <FiltroFechaEntregas />
      <View style={{ paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 8 }}>
        <Text style={{ flex: 1, color: error ? COLORS.error : COLORS.textLight }}>
          {error || (cargando ? 'Actualizando entregas…' : entregas.length ? `${entregas.length} pedidos en esta fecha` : 'Sin pedidos para esta fecha')}
        </Text>
        <TouchableOpacity onPress={cargarEntregas} disabled={cargando}><Text style={{ color: COLORS.primary }}>Actualizar</Text></TouchableOpacity>
      </View>
      {/* Contadores por estado */}
      <View style={styles.statsBar}>
        {(['confirmado', 'despachado', 'entregado', 'cancelado'] as const).map((estado, i, arr) => (
          <React.Fragment key={estado}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: STATUS_COLORS[estado] }]}>
                {counts[estado]}
              </Text>
              <Text style={styles.statLabel}>{STATUS_LABELS[estado]}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.statDiv} />}
          </React.Fragment>
        ))}
      </View>

      <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 4, backgroundColor: '#EFF6FF' }}>
        <Text style={{ color: COLORS.text, fontWeight: '700' }}>
          {calculando ? 'Calculando recorrido por calles…' : ruta
            ? `${(ruta.distancia / 1000).toFixed(1)} km · ${Math.max(1, Math.round(ruta.duracion / 60))} min aprox. en vehículo`
            : paradas.length ? 'Recorrido no disponible' : 'Sin entregas pendientes para recorrer'}
        </Text>
        {paradas.length > 0 && <Text style={{ color: COLORS.textLight, fontSize: 12 }}>
          Bodega → {paradas.map(({ indice }) => `Parada ${indice + 1}`).join(' → ')}
        </Text>}
        {aproximadas && <Text style={{ color: '#92400E', fontSize: 12 }}>Ruta aproximada: hay clientes sin coordenadas guardadas. Confirma su ubicación antes de salir.</Text>}
        {ruta && <Text style={{ color: COLORS.textLight, fontSize: 11 }}>Desde la bodega configurada · Sin tráfico en tiempo real</Text>}
        {errorRuta && <View style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={{ color: COLORS.error, flex: 1, fontSize: 12 }}>{errorRuta}</Text>
          <TouchableOpacity onPress={() => setReintento(n => n + 1)}><Text style={{ color: COLORS.primary }}>Reintentar</Text></TouchableOpacity>
        </View>}
      </View>
      {/* Mapa — div nativo para Leaflet */}
      <div ref={mapDivRef} style={{ width: '100%', flex: 1, minHeight: 180 }} />

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: '#1E293B' }]} />
        <Text style={styles.dotLabel}>Bodega</Text>
        {Object.entries(STATUS_COLORS).map(([estado, color]) => (
          <React.Fragment key={estado}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.dotLabel}>{STATUS_LABELS[estado]}</Text>
          </React.Fragment>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  btnBack: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  statsBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 10,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum:  { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '600', marginTop: 1 },
  statDiv:  { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  legend: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: 8, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  dot:      { width: 12, height: 12, borderRadius: 6 },
  dotLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '600', marginRight: 4 },
});
