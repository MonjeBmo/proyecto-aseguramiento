import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { bitacoraAdmin, BitacoraEntry } from '../../services/adminApiService';
import { fechaGuatemala } from '../../utils/fechaEntregas';
import { useApp } from '../../context/AppContext';

const METODOS = ['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const METODO_COLOR: Record<string, string> = {
  GET: '#059669', POST: COLORS.primary, PUT: COLORS.warning,
  PATCH: '#7C3AED', DELETE: COLORS.error,
};

function estadoColor(status: number): string {
  if (status < 300) return '#059669';
  if (status < 400) return '#F59E0B';
  if (status < 500) return COLORS.error;
  return '#7C3AED';
}

function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

export default function BitacoraAdminScreen() {
  const navigation = useNavigation();
  const { setUsuario } = useApp();

  const [entradas, setEntradas] = useState<BitacoraEntry[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState(fechaGuatemala());
  const [metodo, setMetodo] = useState('');
  const [ruta, setRuta] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await bitacoraAdmin.listar({
        fecha: fecha || undefined,
        metodo: metodo || undefined,
        ruta: ruta || undefined,
      });
      setEntradas(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [fecha, metodo, ruta]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const renderItem = ({ item }: { item: BitacoraEntry }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.metodoBadge, { backgroundColor: (METODO_COLOR[item.metodo] ?? COLORS.textLight) + '20' }]}>
          <Text style={[styles.metodoTexto, { color: METODO_COLOR[item.metodo] ?? COLORS.textLight }]}>
            {item.metodo}
          </Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.ruta} numberOfLines={1}>{item.ruta}</Text>
          <Text style={styles.rowSub}>
            {formatFecha(item.timestamp)} · {formatHora(item.timestamp)}
          </Text>
          {item.usuario_nombre ? (
            <Text style={styles.usuario}>{item.usuario_nombre} ({item.usuario_rol})</Text>
          ) : (
            <Text style={[styles.usuario, { color: COLORS.textLight }]}>Sin sesión</Text>
          )}
        </View>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.estadoBadge, { backgroundColor: estadoColor(item.estado) + '20' }]}>
          <Text style={[styles.estadoTexto, { color: estadoColor(item.estado) }]}>{item.estado}</Text>
        </View>
        <Text style={styles.duracion}>{item.duracion_ms}ms</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnAtras}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Bitácora</Text>
          <Text style={styles.subtitulo}>Auditoría de peticiones API</Text>
        </View>
        <TouchableOpacity style={styles.btnLogout} onPress={() => setUsuario(null)}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filtros}>
        <View style={styles.filtroFechaRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
          {Platform.OS === 'web'
            ? <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: COLORS.text } as any}
              />
            : <TextInput style={styles.filtroInput} value={fecha} onChangeText={setFecha} placeholder="AAAA-MM-DD" />
          }
          {fecha !== fechaGuatemala() && (
            <TouchableOpacity onPress={() => setFecha(fechaGuatemala())}>
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.metodosRow}>
          {METODOS.map(m => (
            <TouchableOpacity
              key={m || 'todos'}
              style={[styles.metodoOpt, metodo === m && { backgroundColor: (METODO_COLOR[m] ?? COLORS.primary), borderColor: (METODO_COLOR[m] ?? COLORS.primary) }]}
              onPress={() => setMetodo(m)}
            >
              <Text style={[styles.metodoOptTexto, metodo === m && { color: '#fff' }]}>
                {m || 'Todos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rutaRow}>
          <Ionicons name="search-outline" size={16} color={COLORS.textLight} />
          <TextInput
            style={styles.rutaInput}
            value={ruta}
            onChangeText={setRuta}
            placeholder="Filtrar por ruta…"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
          />
          {!!ruta && (
            <TouchableOpacity onPress={() => setRuta('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.btnBuscar} onPress={cargar}>
          <Ionicons name="refresh-outline" size={16} color="#fff" />
          <Text style={styles.btnBuscarTexto}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}

      <FlatList
        data={entradas}
        keyExtractor={e => String(e.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          entradas.length > 0
            ? <Text style={styles.contador}>{entradas.length} registros (máx 500)</Text>
            : null
        }
        ListEmptyComponent={
          !cargando ? (
            <View style={styles.vacio}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.border} />
              <Text style={styles.vacioTexto}>Sin registros para los filtros actuales</Text>
            </View>
          ) : <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  btnAtras: { width: 36, alignItems: 'center' },
  titulo: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  subtitulo: { fontSize: 11, color: COLORS.textLight, marginLeft: 8 },
  btnLogout: { padding: 6 },

  filtros: {
    backgroundColor: COLORS.surface, padding: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10,
  },
  filtroFechaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.background,
  },
  filtroInput: { flex: 1, fontSize: 14, color: COLORS.text },
  metodosRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metodoOpt: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  metodoOptTexto: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  rutaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.background,
  },
  rutaInput: { flex: 1, fontSize: 14, color: COLORS.text },
  btnBuscar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10,
  },
  btnBuscarTexto: { color: '#fff', fontSize: 14, fontWeight: '700' },

  errorBanner: { backgroundColor: COLORS.error + '18', padding: 12, margin: 12, borderRadius: 8 },
  errorTexto: { color: COLORS.error, fontSize: 13 },

  lista: { padding: 12, paddingBottom: 40 },
  contador: { fontSize: 11, color: COLORS.textLight, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },

  row: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metodoBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2 },
  metodoTexto: { fontSize: 10, fontWeight: '800' },
  rowInfo: { flex: 1 },
  ruta: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  rowSub: { fontSize: 11, color: COLORS.textLight, marginBottom: 2 },
  usuario: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  rowRight: { alignItems: 'flex-end', gap: 4 },
  estadoBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  estadoTexto: { fontSize: 12, fontWeight: '800' },
  duracion: { fontSize: 11, color: COLORS.textLight },

  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: 15, color: COLORS.textLight },
});
