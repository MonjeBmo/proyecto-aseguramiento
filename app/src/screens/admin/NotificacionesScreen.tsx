import { fechaGuatemala, fechaValida } from '../../utils/fechaEntregas';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, RefreshControl, TextInput, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { notificacionesAdmin, Notificacion } from '../../services/adminApiService';
import { useApp } from '../../context/AppContext';

export default function NotificacionesScreen() {
  const navigation = useNavigation();
  const { setUsuario } = useApp();
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState('');
  const [notifs, setNotifs]     = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await notificacionesAdmin.listar();
      setNotifs(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  const consulta = numero.trim();
  const digitos = consulta.replace(/\D/g, '');
  const filtradas = notifs.filter(n => {
    const coincideNumero = !consulta || (consulta.startsWith('#')
      ? String(n.pedido_id) === consulta.slice(1).trim()
      : !!digitos && (n.telefono.replace(/\D/g, '').includes(digitos) || String(n.pedido_id) === digitos));
    return coincideNumero && (!fecha || (fechaValida(fecha) && fechaGuatemala(n.creado_en) === fecha));
  });

  const formatFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-GT', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Guatemala',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const renderItem = ({ item }: { item: Notificacion }) => (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.waIcon}>
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTel}>{item.telefono}</Text>
          <Text style={styles.cardFecha}>{formatFecha(item.creado_en)}</Text>
        </View>
        <View style={styles.estadoBadge}>
          <Text style={styles.estadoTexto}>{item.estado}</Text>
        </View>
      </View>
      <Text style={styles.cardMsg}>{item.mensaje}</Text>
      <Text style={styles.cardPedido}>Pedido #{item.pedido_id}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnAtras}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Notificaciones WhatsApp</Text>
        <TouchableOpacity style={styles.btnLogout} onPress={() => setUsuario(null)}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {error && <View style={styles.errorBanner}><Text style={styles.errorTexto}>{error}</Text></View>}

      {/* Panel de filtros */}
      <View style={styles.filtroPanel}>
        <View style={styles.filtroInputRow}>
          <Ionicons name="search-outline" size={16} color={COLORS.textLight} style={styles.filtroIcono} />
          <TextInput
            style={styles.filtroInput}
            placeholder="Teléfono o pedido (ej. 5555-1001 o #4)"
            placeholderTextColor={COLORS.textLight}
            value={numero}
            onChangeText={setNumero}
          />
          {!!numero && (
            <TouchableOpacity onPress={() => setNumero('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtroFechaRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.textLight} />
          <View style={styles.filtroFechaInput}>
            {Platform.OS === 'web'
              ? (
                <input
                  type="date"
                  value={fecha}
                  onChange={(e: any) => setFecha(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: COLORS.text } as any}
                />
              )
              : (
                <TextInput
                  value={fecha}
                  onChangeText={setFecha}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={COLORS.textLight}
                  style={styles.filtroFechaTexto}
                />
              )
            }
          </View>
          <TouchableOpacity style={styles.filtroBtnHoy} onPress={() => setFecha(fechaGuatemala())}>
            <Text style={styles.filtroBtnHoyTexto}>Hoy</Text>
          </TouchableOpacity>
          {(numero || fecha) && (
            <TouchableOpacity style={styles.filtroBtnLimpiar} onPress={() => { setNumero(''); setFecha(''); }}>
              <Text style={styles.filtroBtnLimpiarTexto}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
        {!!fecha && !fechaValida(fecha) && (
          <Text style={styles.filtroError}>Ingresa una fecha válida (AAAA-MM-DD).</Text>
        )}
      </View>
      <FlatList
        data={filtradas}
        keyExtractor={n => String(n.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          notifs.length > 0
            ? <Text style={styles.contador}>{filtradas.length} de {notifs.length} notificaciones (simuladas)</Text>
            : null
        }
        ListEmptyComponent={
          !cargando ? (
            <View style={styles.vacio}>
              <Ionicons name="chatbubbles-outline" size={56} color={COLORS.border} />
              <Text style={styles.vacioTitulo}>{numero || fecha ? 'Sin resultados para estos filtros' : 'Sin notificaciones'}</Text>
              <Text style={styles.vacioSub}>Las notificaciones aparecen cuando el repartidor marca entregas como entregadas o canceladas.</Text>
            </View>
          ) : null
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
  btnLogout: { padding: 8 },
  titulo: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text, marginLeft: 8 },

  errorBanner: { backgroundColor: COLORS.error + '18', padding: 12, margin: 12, borderRadius: 8 },
  errorTexto: { color: COLORS.error, fontSize: 13 },

  lista: { padding: 12, paddingBottom: 40 },
  contador: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 4, borderLeftColor: '#25D366',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  waIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8FFF0', alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1 },
  cardTel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  cardFecha: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  estadoBadge: {
    backgroundColor: '#E8FFF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  estadoTexto: { fontSize: 11, fontWeight: '700', color: '#059669' },
  cardMsg: { fontSize: 13, color: COLORS.text, lineHeight: 19, marginBottom: 8 },
  cardPedido: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },

  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30, gap: 12 },
  vacioTitulo: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  vacioSub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 20 },

  filtroPanel: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  filtroInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10, marginBottom: 8,
  },
  filtroIcono: { marginRight: 6 },
  filtroInput: {
    flex: 1, fontSize: 14, color: COLORS.text,
    paddingVertical: 10,
  },
  filtroFechaRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  filtroFechaInput: { flex: 1, marginLeft: 6 },
  filtroFechaTexto: { fontSize: 14, color: COLORS.text, paddingVertical: 6 },
  filtroBtnHoy: {
    backgroundColor: COLORS.primary + '18', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8,
  },
  filtroBtnHoyTexto: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  filtroBtnLimpiar: {
    backgroundColor: COLORS.error + '18', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, marginLeft: 6,
  },
  filtroBtnLimpiarTexto: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  filtroError: { fontSize: 12, color: COLORS.error, marginTop: 6 },
});
