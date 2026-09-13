// Fallback nativo: lista de paradas de la ruta (sin mapa).
// Metro usa MapaRutaScreen.web.tsx en web, este archivo en nativo.
import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Entrega } from '../data/mockData';
import { useEntregas } from '../hooks/useEntregas';
import FiltroFechaEntregas from '../components/FiltroFechaEntregas';
import { COLORS } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'MapaRuta'>;

const ESTADO_CONFIG = {
  confirmado: { label: 'Pendiente',    color: '#F59E0B', icono: 'time-outline' as const },
  despachado: { label: 'En camino',    color: '#3B82F6', icono: 'bicycle-outline' as const },
  entregado:  { label: 'Entregado',    color: '#10B981', icono: 'checkmark-circle-outline' as const },
  cancelado:  { label: 'No entregado', color: '#EF4444', icono: 'close-circle-outline' as const },
};

export default function MapaRutaScreen({ route }: Props) {
  const navigation = useNavigation();
  const { entregas, cargando, error, cargarEntregas } = useEntregas();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mapa de ruta</Text>
        <View style={{ width: 38 }} />
      </View>

      <FiltroFechaEntregas />
      {error && <Text style={{ color: COLORS.error, padding: 12 }}>{error}</Text>}
      <View style={styles.notaBanner}>
        <Ionicons name="map-outline" size={16} color={COLORS.primary} />
        <Text style={styles.notaTexto}>El mapa interactivo solo esta disponible en la version web.</Text>
      </View>

      <FlatList
        data={entregas}
        refreshing={cargando}
        onRefresh={cargarEntregas}
        ListEmptyComponent={<Text>Sin pedidos para esta fecha.</Text>}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.lista}
        renderItem={({ item, index }) => {
          const cfg = ESTADO_CONFIG[item.estado];
          return (
            <View style={styles.parada}>
              <View style={[styles.numeroBadge, { backgroundColor: cfg.color }]}>
                <Text style={styles.numero}>{index + 1}</Text>
              </View>
              <View style={styles.paradaInfo}>
                <Text style={styles.clienteNombre}>{item.cliente_nombre}</Text>
                <Text style={styles.direccion}>{item.cliente_zona} — {item.cliente_direccion}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: cfg.color + '22' }]}>
                  <Ionicons name={cfg.icono} size={12} color={cfg.color} />
                  <Text style={[styles.estadoTexto, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
              <Text style={styles.total}>Q {Number(item.total).toFixed(2)}</Text>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  btnBack: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  notaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary + '15', padding: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30',
  },
  notaTexto: { flex: 1, fontSize: 13, color: COLORS.primary },

  lista: { padding: 16 },

  parada: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  numeroBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  numero: { fontSize: 14, fontWeight: '800', color: '#fff' },
  paradaInfo: { flex: 1, gap: 4 },
  clienteNombre: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  direccion: { fontSize: 12, color: COLORS.textLight },
  estadoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, marginTop: 2,
  },
  estadoTexto: { fontSize: 11, fontWeight: '700' },
  total: { fontSize: 14, fontWeight: '800', color: COLORS.accent },

  sep: { height: 8 },
});
