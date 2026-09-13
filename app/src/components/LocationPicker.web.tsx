// Picker de ubicacion inline (sin modal anidado) — usa Leaflet CDN.
// Se expande debajo del boton al hacer clic, evitando modales anidados.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const ZONA_COORDS: Record<string, [number, number]> = {
  'Zona 1':  [14.6434, -90.5132], 'Zona 2':  [14.6387, -90.5008],
  'Zona 3':  [14.6406, -90.5074], 'Zona 4':  [14.6321, -90.5181],
  'Zona 5':  [14.6272, -90.5089], 'Zona 6':  [14.6456, -90.5034],
  'Zona 7':  [14.6347, -90.5389], 'Zona 8':  [14.6192, -90.5250],
  'Zona 9':  [14.6155, -90.5172], 'Zona 10': [14.6041, -90.5069],
  'Zona 11': [14.6113, -90.5322], 'Zona 12': [14.5924, -90.5250],
  'Zona 13': [14.5838, -90.5275], 'Zona 15': [14.5991, -90.4862],
  'Zona 18': [14.6699, -90.4779], 'Zona 21': [14.5693, -90.5389],
};
const DEFAULT: [number, number] = [14.6300, -90.5200];

// Leaflet se incluye en el bundle: no depende de cargar scripts de un CDN.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat: string;
  lng: string;
  zona?: string;
  onChangeLat: (v: string) => void;
  onChangeLng: (v: string) => void;
}

export default function LocationPicker({ lat, lng, zona, onChangeLat, onChangeLng }: Props) {
  // Mostrar el selector también cuando el cliente todavía no tiene ubicación.
  const [open, setOpen] = useState(true);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Refs para leer siempre los valores actuales dentro de setTimeout/callbacks
  // (evita problemas de closure stale con [open] como unica dependencia)
  const latRef  = useRef(lat);
  const lngRef  = useRef(lng);
  const zonaRef = useRef(zona);
  const onChangeLatRef = useRef(onChangeLat);
  const onChangeLngRef = useRef(onChangeLng);

  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);
  useEffect(() => { zonaRef.current = zona; }, [zona]);
  useEffect(() => { onChangeLatRef.current = onChangeLat; }, [onChangeLat]);
  useEffect(() => { onChangeLngRef.current = onChangeLng; }, [onChangeLng]);

  const hasCoords = lat !== '' && lng !== '';

  // Inicializar mapa cuando se expande
  useEffect(() => {
    if (!open) {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      return;
    }
    const timer = setTimeout(() => {
      {
        if (!L || !mapDivRef.current || mapRef.current) return;

        // Leer valores actuales desde refs (no desde closure)
        const curLat  = latRef.current;
        const curLng  = lngRef.current;
        const curZona = zonaRef.current;

        const initLat = curLat !== '' ? parseFloat(curLat) : (ZONA_COORDS[curZona ?? ''] ?? DEFAULT)[0];
        const initLng = curLng !== '' ? parseFloat(curLng) : (ZONA_COORDS[curZona ?? ''] ?? DEFAULT)[1];

        const map = L.map(mapDivRef.current).setView([initLat, initLng], 15);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const pinIcon = L.divIcon({
          className: '',
          html: `<div style="background:#7C3AED;border-radius:50%;width:26px;height:26px;
            display:flex;align-items:center;justify-content:center;
            border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
            font-size:13px;">📍</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        });

        const marker = L.marker([initLat, initLng], { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current = marker;

        function setCoords(ll: any) {
          onChangeLatRef.current(ll.lat.toFixed(6));
          onChangeLngRef.current(ll.lng.toFixed(6));
        }

        // Centrar en la zona no confirma una ubicación: el usuario debe seleccionarla.

        map.on('click', (e: any) => { marker.setLatLng(e.latlng); setCoords(e.latlng); });
        marker.on('dragend', () => setCoords(marker.getLatLng()));
        map.invalidateSize();
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open]);

  return (
    <View>
      {/* Boton que abre/cierra el mapa inline */}
      <TouchableOpacity
        style={[styles.btn, open && styles.btnAbierto]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.75}
      >
        <Ionicons name="map" size={16} color={hasCoords ? '#7C3AED' : COLORS.textLight} />
        <Text style={[styles.btnTexto, hasCoords && styles.btnTextoActivo]} numberOfLines={1}>
          {hasCoords
            ? `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`
            : 'Seleccionar ubicacion en mapa'}
        </Text>
        {hasCoords && !open && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={e => { e.stopPropagation?.(); onChangeLat(''); onChangeLng(''); }}
          >
            <Ionicons name="close-circle" size={15} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={COLORS.textLight}
        />
      </TouchableOpacity>

      {/* Mapa expandible inline */}
      {open && (
        <View style={styles.mapaContenedor}>
          <View style={styles.instruccion}>
            <Ionicons name="information-circle-outline" size={13} color={COLORS.primary} />
            <Text style={styles.instruccionTexto}>
              Toca el mapa o arrastra el pin para fijar la ubicacion exacta.
            </Text>
          </View>
          {hasCoords && (
            <View style={styles.coordsRow}>
              <Ionicons name="location" size={12} color="#7C3AED" />
              <Text style={styles.coordsTexto}>
                {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
              </Text>
            </View>
          )}
          {/* Div nativo para Leaflet */}
          <div ref={mapDivRef} style={{ width: '100%', height: 280 }} />
          <TouchableOpacity style={styles.btnCerrar} onPress={() => {
            if (!markerRef.current) return;
            const point = markerRef.current.getLatLng();
            onChangeLat(point.lat.toFixed(6));
            onChangeLng(point.lng.toFixed(6));
            setOpen(false);
          }}>
            <Ionicons name="checkmark-circle" size={16} color="#7C3AED" />
            <Text style={styles.btnCerrarTexto}>Listo — usar esta ubicacion</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: COLORS.surface,
  },
  btnAbierto: { borderColor: '#7C3AED', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  btnTexto: { flex: 1, fontSize: 14, color: COLORS.textLight },
  btnTextoActivo: { color: '#7C3AED', fontWeight: '600' },

  mapaContenedor: {
    borderWidth: 1, borderTopWidth: 0, borderColor: '#7C3AED',
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    overflow: 'hidden', backgroundColor: COLORS.surface,
  },
  instruccion: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: COLORS.primary + '10', padding: 10,
  },
  instruccionTexto: { flex: 1, fontSize: 12, color: COLORS.primary },
  coordsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#7C3AED12', paddingHorizontal: 12, paddingVertical: 6,
  },
  coordsTexto: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
  btnCerrar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7C3AED18', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#7C3AED30',
  },
  btnCerrarTexto: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },
});
