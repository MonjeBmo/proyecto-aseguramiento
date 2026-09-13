import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, RefreshControl, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { Entrega } from '../data/mockData';
import { useEntregas } from '../hooks/useEntregas';
import FiltroFechaEntregas from '../components/FiltroFechaEntregas';
import OfflineBanner from '../components/OfflineBanner';
import { COLORS } from '../constants/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'RutaDiaria'>;

const ESTADO_CONFIG = {
  confirmado: { label: 'Pendiente',   color: COLORS.warning,  icono: 'time-outline' as const },
  despachado: { label: 'En camino',   color: COLORS.primary,  icono: 'bicycle-outline' as const },
  entregado:  { label: 'Entregado',   color: COLORS.success,  icono: 'checkmark-circle-outline' as const },
  cancelado:  { label: 'No entregado', color: COLORS.error,   icono: 'close-circle-outline' as const },
};

/**
 * Pantalla principal del Repartidor: lista de entregas del dia ordenadas por prioridad.
 * ISO 25010 — Adecuacion funcional: muestra exactamente los pedidos asignados con su estado actual.
 * ISO 25010 — Usabilidad: indicador visual de estado por color, acciones claras por entrega.
 */
export default function RutaDiariaScreen() {
  const navigation = useNavigation<NavProp>();
  const { usuario, setUsuario } = useApp();

  const { entregas, cargando, error, cargarEntregas } = useEntregas();
  const pendientes = entregas.filter(e => e.estado === 'confirmado' || e.estado === 'despachado').length;

  const renderEntrega = ({ item }: { item: Entrega }) => {
    const config = ESTADO_CONFIG[item.estado];
    const esTerminal = item.estado === 'entregado' || item.estado === 'cancelado';

    return (
      <TouchableOpacity
        style={[styles.card, esTerminal && styles.cardTerminal]}
        onPress={() => navigation.navigate('DetalleEntrega', { entrega: item })}
        activeOpacity={0.78}
      >
        {/* Indicador de estado lateral */}
        <View style={[styles.estadoBar, { backgroundColor: config.color }]} />

        <View style={styles.cardCuerpo}>
          {/* Header de la tarjeta */}
          <View style={styles.cardHeader}>
            <Text style={styles.clienteNombre} numberOfLines={1}>{item.cliente_nombre}</Text>
            <View style={[styles.estadoBadge, { backgroundColor: config.color + '22' }]}>
              <Ionicons name={config.icono} size={12} color={config.color} />
              <Text style={[styles.estadoTexto, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          {/* Info del cliente */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.textLight} />
            <Text style={styles.infoTexto} numberOfLines={1}>
              {item.cliente_zona} — {item.cliente_direccion}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={13} color={COLORS.textLight} />
            <Text style={styles.infoTexto}>{item.cliente_telefono}</Text>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.itemsCount}>
              {item.items.length} {item.items.length === 1 ? 'producto' : 'productos'}
            </Text>
            <Text style={styles.total}>Q {Number(item.total).toFixed(2)}</Text>
          </View>
        </View>

        {!esTerminal && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} style={styles.chevron} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo}>Mi ruta del dia</Text>
          <Text style={styles.headerSub}>{usuario?.nombre}</Text>
        </View>
        <TouchableOpacity
          style={styles.btnMapa}
          onPress={() => navigation.navigate('MapaRuta')}
        >
          <Ionicons name="map-outline" size={18} color={COLORS.primary} />
          <Text style={styles.btnMapaTexto}>Mapa</Text>
        </TouchableOpacity>
        <View style={styles.contadorBadge}>
          <Text style={styles.contadorNum}>{pendientes}</Text>
          <Text style={styles.contadorLabel}>pendientes</Text>
        </View>
      </View>

      <FiltroFechaEntregas />

      {/* Banner de error no bloqueante */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.warning} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}

      {/* Lista de entregas */}
      <FlatList
        data={entregas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEntrega}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={cargarEntregas}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          !cargando ? (
            <View style={styles.vacio}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color={COLORS.border} />
              <Text style={styles.vacioTitulo}>{error ? 'Entregas no disponibles' : 'Sin pedidos para esta fecha'}</Text>
              <Text style={styles.vacioSub}>Selecciona otra fecha o desliza para actualizar.</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          entregas.length > 0 ? (
            <Text style={styles.seccionLabel}>
              {pendientes > 0 ? `${pendientes} entrega(s) por completar` : 'Sin entregas pendientes'}
            </Text>
          ) : null
        }
      />

      {/* Boton de cerrar sesion */}
      <TouchableOpacity
        style={styles.btnSalir}
        onPress={() => setUsuario(null)}
      >
        <Ionicons name="log-out-outline" size={18} color={COLORS.textLight} />
        <Text style={styles.btnSalirTexto}>Cerrar sesion</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitulo: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  contadorBadge: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center',
  },
  contadorNum: { fontSize: 22, fontWeight: '800', color: COLORS.textOnDark, lineHeight: 24 },
  contadorLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF8E1', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#FFE082',
  },
  errorTexto: { fontSize: 12, color: COLORS.warning, flex: 1 },

  seccionLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, paddingHorizontal: 2,
  },

  lista: { padding: 16, paddingBottom: 80 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    flexDirection: 'row', alignItems: 'stretch',
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTerminal: { opacity: 0.65 },
  estadoBar: { width: 5 },
  cardCuerpo: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8, gap: 8,
  },
  clienteNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  estadoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  estadoTexto: { fontSize: 11, fontWeight: '700' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  infoTexto: { fontSize: 12, color: COLORS.textLight, flex: 1 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  itemsCount: { fontSize: 12, color: COLORS.textLight },
  total: { fontSize: 15, fontWeight: '800', color: COLORS.primary },

  chevron: { alignSelf: 'center', marginRight: 10 },

  vacio: { alignItems: 'center', paddingTop: 80, gap: 10 },
  vacioTitulo: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  vacioSub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center' },

  btnMapa: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary + '15', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.primary + '40',
    marginRight: 10,
  },
  btnMapaTexto: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  btnSalir: {
    position: 'absolute', bottom: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  btnSalirTexto: { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
});
