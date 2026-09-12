import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  Modal, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { pedidosAdmin, PedidoAdmin, PedidoDetalle } from '../../services/adminApiService';
import { useApp } from '../../context/AppContext';

const ESTADO_CONFIG: Record<string, { label: string; color: string; icono: any }> = {
  confirmado: { label: 'Pendiente',    color: COLORS.warning, icono: 'time-outline' },
  despachado: { label: 'En camino',    color: COLORS.primary, icono: 'bicycle-outline' },
  entregado:  { label: 'Entregado',    color: COLORS.success, icono: 'checkmark-circle-outline' },
  cancelado:  { label: 'Cancelado',    color: COLORS.error,   icono: 'close-circle-outline' },
};

export default function PedidosAdminScreen() {
  const navigation = useNavigation();
  const { setUsuario } = useApp();
  const [pedidos, setPedidos]     = useState<PedidoAdmin[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [filtro, setFiltro]       = useState<string>('todos');

  const [detalle, setDetalle]         = useState<PedidoDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await pedidosAdmin.listar();
      setPedidos(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const verDetalle = async (id: number) => {
    setCargandoDetalle(true);
    try {
      const d = await pedidosAdmin.obtener(id);
      setDetalle(d);
    } catch (e: any) {
      setDetalle(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const filtrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro);

  const formatFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const renderItem = ({ item }: { item: PedidoAdmin }) => {
    const cfg = ESTADO_CONFIG[item.estado] ?? { label: item.estado, color: COLORS.textLight, icono: 'help-circle-outline' };
    return (
      <TouchableOpacity style={styles.row} onPress={() => verDetalle(item.id)} activeOpacity={0.75}>
        <View style={[styles.estadoBar, { backgroundColor: cfg.color }]} />
        <View style={styles.rowInfo}>
          <View style={styles.rowHead}>
            <Text style={styles.rowId}>#{item.id}</Text>
            <View style={[styles.badge, { backgroundColor: cfg.color + '22' }]}>
              <Ionicons name={cfg.icono} size={11} color={cfg.color} />
              <Text style={[styles.badgeTexto, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={styles.rowCliente} numberOfLines={1}>{item.cliente_nombre}</Text>
          <Text style={styles.rowSub}>{item.vendedor_nombre} · {item.cliente_zona}</Text>
          <View style={styles.rowFoot}>
            <Text style={styles.rowFecha}>{formatFecha(item.creado_en)}</Text>
            <Text style={styles.rowTotal}>Q {Number(item.total).toFixed(2)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnAtras}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Pedidos</Text>
        <TouchableOpacity style={styles.btnLogout} onPress={() => setUsuario(null)}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}
        contentContainerStyle={styles.filtros}>
        {['todos', 'confirmado', 'despachado', 'entregado', 'cancelado'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnActivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filtroTexto, filtro === f && styles.filtroTextoActivo]}>
              {f === 'todos' ? 'Todos' : ESTADO_CONFIG[f]?.label ?? f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && <View style={styles.errorBanner}><Text style={styles.errorTexto}>{error}</Text></View>}

      <FlatList
        data={filtrados}
        keyExtractor={p => String(p.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          filtrados.length > 0
            ? <Text style={styles.contador}>{filtrados.length} pedidos</Text>
            : null
        }
        ListEmptyComponent={
          !cargando ? (
            <View style={styles.vacio}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.border} />
              <Text style={styles.vacioTexto}>No hay pedidos</Text>
            </View>
          ) : null
        }
      />

      {/* Modal detalle */}
      <Modal
        visible={detalle !== null || cargandoDetalle}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetalle(null)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>
              {detalle ? `Pedido #${detalle.id}` : 'Cargando…'}
            </Text>
            <TouchableOpacity onPress={() => setDetalle(null)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {cargandoDetalle ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : detalle ? (
            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Estado */}
              {(() => {
                const cfg = ESTADO_CONFIG[detalle.estado] ?? { label: detalle.estado, color: COLORS.textLight, icono: 'help-circle-outline' };
                return (
                  <View style={[styles.estadoCard, { backgroundColor: cfg.color + '15', borderColor: cfg.color + '44' }]}>
                    <Ionicons name={cfg.icono} size={22} color={cfg.color} />
                    <Text style={[styles.estadoLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                );
              })()}

              {/* Info */}
              <View style={styles.infoCard}>
                <InfoFila icono="storefront-outline" label="Cliente" valor={detalle.cliente_nombre} />
                <InfoFila icono="person-outline"     label="Vendedor" valor={detalle.vendedor_nombre} />
                <InfoFila icono="location-outline"   label="Zona" valor={detalle.cliente_zona} />
                <InfoFila icono="calendar-outline"   label="Fecha" valor={formatFecha(detalle.creado_en)} />
              </View>

              {/* Items */}
              <Text style={styles.seccionTitulo}>Productos ({detalle.items?.length ?? 0})</Text>
              {(detalle.items ?? []).map((item, i) => (
                <View key={i} style={styles.itemFila}>
                  <View style={styles.cantBadge}>
                    <Text style={styles.cantTexto}>{item.cantidad}</Text>
                  </View>
                  <Text style={styles.itemNombre} numberOfLines={1}>{item.producto_nombre}</Text>
                  <Text style={styles.itemSubtotal}>Q {Number(item.subtotal).toFixed(2)}</Text>
                </View>
              ))}

              {/* Total */}
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValor}>Q {Number(detalle.total).toFixed(2)}</Text>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoFila({ icono, label, valor }: { icono: any; label: string; valor: string }) {
  return (
    <View style={styles.infoFila}>
      <Ionicons name={icono} size={15} color={COLORS.textLight} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValor} numberOfLines={1}>{valor}</Text>
    </View>
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
  titulo: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  btnLogout: { padding: 8 },

  filtrosScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filtros: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center', flexDirection: 'row' },
  filtroBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  filtroBtnActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroTexto: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  filtroTextoActivo: { color: '#fff' },

  errorBanner: { backgroundColor: COLORS.error + '18', padding: 12, margin: 12, borderRadius: 8 },
  errorTexto: { color: COLORS.error, fontSize: 13 },
  lista: { padding: 12, paddingBottom: 40 },
  contador: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },

  row: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  estadoBar: { width: 5, alignSelf: 'stretch' },
  rowInfo: { flex: 1, padding: 12 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowId: { fontSize: 13, fontWeight: '700', color: COLORS.textLight },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  rowCliente: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  rowSub: { fontSize: 12, color: COLORS.textLight, marginBottom: 6 },
  rowFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowFecha: { fontSize: 11, color: COLORS.textLight },
  rowTotal: { fontSize: 15, fontWeight: '800', color: COLORS.primary },

  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: 16, color: COLORS.textLight },

  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 16, paddingBottom: 40 },

  estadoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1,
  },
  estadoLabel: { fontSize: 17, fontWeight: '800' },

  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, gap: 10,
  },
  infoFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: COLORS.textLight, width: 70 },
  infoValor: { fontSize: 14, color: COLORS.text, fontWeight: '600', flex: 1 },

  seccionTitulo: {
    fontSize: 12, fontWeight: '700', color: COLORS.textLight,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  itemFila: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cantBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  cantTexto: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  itemNombre: { flex: 1, fontSize: 14, color: COLORS.text },
  itemSubtotal: { fontSize: 14, fontWeight: '700', color: COLORS.accent },

  totalCard: {
    backgroundColor: COLORS.dark, borderRadius: 14, padding: 18, marginTop: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  totalValor: { fontSize: 24, fontWeight: '800', color: '#fff' },
});
