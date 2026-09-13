import Select from '../../components/Select';
import { normalizarBusqueda } from '../../utils/busqueda';
import { fechaGuatemala, fechaValida, moverFecha } from '../../utils/fechaEntregas';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  Modal, ScrollView, RefreshControl, ActivityIndicator, Platform, TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { pedidosAdmin, PedidoAdmin, PedidoDetalle, usuariosAdmin, UsuarioAdmin } from '../../services/adminApiService';
import { useApp } from '../../context/AppContext';

const ESTADO_CONFIG: Record<string, { label: string; color: string; icono: any }> = {
  confirmado: { label: 'Pendiente',    color: COLORS.warning, icono: 'time-outline' },
  despachado: { label: 'En camino',    color: COLORS.primary, icono: 'bicycle-outline' },
  entregado:  { label: 'Entregado',    color: COLORS.success, icono: 'checkmark-circle-outline' },
  cancelado:  { label: 'Cancelado',    color: COLORS.error,   icono: 'close-circle-outline' },
};

export default function PedidosAdminScreen() {
  const navigation = useNavigation();
  const { usuario, setUsuario, actualizarEntregas, adminOrigen } = useApp();
  const esSupervisor = usuario?.rol === 'supervisor';
  const [repartidores, setRepartidores] = useState<UsuarioAdmin[]>([]);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);
  const [exitoAsignacion, setExitoAsignacion] = useState('');
  const [fechaNueva, setFechaNueva] = useState('');
  const esVendedor = usuario?.rol === 'vendedor';
  const vendedorId = esVendedor ? usuario.id : undefined;
  const [pedidos, setPedidos]     = useState<PedidoAdmin[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [textoConsulta, setTextoConsulta] = useState('');
  const [tiendaConsulta, setTiendaConsulta] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState('');
  const [filtro, setFiltro]       = useState<string>('todos');

  const [detalle, setDetalle]         = useState<PedidoDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await pedidosAdmin.listar(vendedorId);
      setPedidos(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [vendedorId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const verDetalle = async (id: number) => {
    setCargandoDetalle(true);
    setErrorAsignacion(null);
    setExitoAsignacion('');
    try {
      const d = await pedidosAdmin.obtener(id, vendedorId);
      setDetalle(d);
      setSeleccionado(d.repartidor_id ?? null);
      setFechaNueva(moverFecha(fechaGuatemala(), 1));
      if (esSupervisor) {
        setRepartidores([]);
        try { setRepartidores((await usuariosAdmin.listar()).filter(u => u.rol === 'repartidor')); }
        catch { setErrorAsignacion('No se pudo cargar la lista de repartidores. Cierra y vuelve a abrir el pedido.'); }
      }
    } catch (e: any) {
      setDetalle(null);
      setError(e.message || "No se pudo cargar el detalle.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const asignar = async () => {
    if (!esSupervisor || !detalle || asignando) return;
    if (!fechaValida(fechaNueva) || fechaNueva < fechaGuatemala()) {
      setErrorAsignacion('Selecciona una fecha válida desde hoy en adelante.');
      return;
    }
    setAsignando(true);
    setErrorAsignacion(null);
    setExitoAsignacion('');
    try {
      let actualizado: any;
      if (detalle.estado === 'cancelado') {
        if (!seleccionado) { setErrorAsignacion('Selecciona un repartidor para reprogramar.'); return; }
        actualizado = await pedidosAdmin.reprogramar(detalle.id, seleccionado, fechaNueva);
      } else {
        // confirmado o despachado: solo programa fecha (repartidor opcional)
        actualizado = await pedidosAdmin.programar(detalle.id, fechaNueva, seleccionado);
      }
      setDetalle(actualizado);
      setPedidos(prev => prev.map(p => p.id === actualizado.id ? actualizado : p));
      actualizarEntregas();
      setExitoAsignacion(`Fecha de entrega fijada para ${fechaNueva}.${seleccionado ? ' Repartidor asignado.' : ''}`);
    } catch (e: any) { setErrorAsignacion(e.message); }
    finally { setAsignando(false); }
  };

  const tiendas = Array.from(new Set(pedidos.map(p => p.cliente_nombre))).sort();
  const filtrados = pedidos.filter(p => {
    if (filtro !== 'todos' && p.estado !== filtro) return false;
    if (fechaConsulta && fechaValida(fechaConsulta) && fechaGuatemala(p.creado_en) !== fechaConsulta) return false;
    if (esVendedor) {
      return (!tiendaConsulta || p.cliente_nombre === tiendaConsulta) &&
        normalizarBusqueda(`#${p.id} ${p.cliente_nombre} ${p.cliente_zona || ''} ${p.repartidor_nombre || 'Sin asignar'}`)
          .includes(normalizarBusqueda(textoConsulta));
    }
    return normalizarBusqueda(`#${p.id} ${p.cliente_nombre} ${p.cliente_zona || ''} ${p.vendedor_nombre || ''} ${p.repartidor_nombre || 'Sin asignar'}`)
      .includes(normalizarBusqueda(textoConsulta));
  });

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
          {item.fecha_entrega && <Text style={styles.rowSub}>Entrega programada: {item.fecha_entrega}</Text>}
          <Text style={styles.rowSub}>Repartidor: {item.repartidor_nombre || 'Sin asignar'}</Text>
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
        <Text style={styles.titulo}>{esVendedor ? 'Mis pedidos' : 'Pedidos'}</Text>
        {adminOrigen === null && (
          <TouchableOpacity style={styles.btnLogout} onPress={() => setUsuario(null)}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Panel de búsqueda y fecha — visible para todos los roles */}
      <View style={styles.filtroPanel}>
        {esVendedor && <Text style={styles.filtroPanelHint}>Tus pedidos creados · Solo consulta</Text>}

        <View style={styles.filtroInputRow}>
          <Ionicons name="search-outline" size={16} color={COLORS.textLight} style={styles.filtroIcono} />
          <TextInput
            style={styles.filtroInput}
            placeholder={esVendedor ? 'Buscar por pedido, tienda, zona o repartidor…' : 'Buscar por pedido, cliente, vendedor o repartidor…'}
            placeholderTextColor={COLORS.textLight}
            value={textoConsulta}
            onChangeText={setTextoConsulta}
          />
          {!!textoConsulta && (
            <TouchableOpacity onPress={() => setTextoConsulta('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {esVendedor && (
          <Select value={tiendaConsulta} onChange={setTiendaConsulta} placeholder="Todas las tiendas"
            options={[{ label: 'Todas las tiendas', value: '' }, ...tiendas.map(t => ({ label: t, value: t }))]} />
        )}

        <View style={styles.filtroFechaRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.textLight} />
          <View style={styles.filtroFechaInput}>
            {Platform.OS === 'web'
              ? (
                <input
                  type="date"
                  value={fechaConsulta}
                  onChange={(e: any) => setFechaConsulta(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: COLORS.text } as any}
                />
              )
              : (
                <TextInput
                  value={fechaConsulta}
                  onChangeText={setFechaConsulta}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={COLORS.textLight}
                  style={styles.filtroFechaTexto}
                />
              )
            }
          </View>
          <TouchableOpacity style={styles.filtroBtnHoy} onPress={() => setFechaConsulta(fechaGuatemala())}>
            <Text style={styles.filtroBtnHoyTexto}>Hoy</Text>
          </TouchableOpacity>
          {(textoConsulta || tiendaConsulta || fechaConsulta || filtro !== 'todos') && (
            <TouchableOpacity style={styles.filtroBtnLimpiar} onPress={() => { setTextoConsulta(''); setTiendaConsulta(''); setFechaConsulta(''); setFiltro('todos'); }}>
              <Text style={styles.filtroBtnLimpiarTexto}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
        {!!fechaConsulta && !fechaValida(fechaConsulta) && (
          <Text style={styles.filtroError}>Ingresa una fecha válida (AAAA-MM-DD).</Text>
        )}
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
            ? <Text style={styles.contador}>{filtrados.length} de {pedidos.length} pedidos</Text>
            : null
        }
        ListEmptyComponent={
          !cargando ? (
            <View style={styles.vacio}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.border} />
              <Text style={styles.vacioTexto}>No hay pedidos que coincidan con los filtros</Text>
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
                <InfoFila icono="bicycle-outline" label="Repartidor" valor={detalle.repartidor_nombre || 'Sin asignar'} />
                <InfoFila icono="calendar-outline"   label="Creado" valor={formatFecha(detalle.creado_en)} />
                {detalle.fecha_entrega && <InfoFila icono="calendar-outline" label="Entrega" valor={detalle.fecha_entrega} />}
              </View>

              {esSupervisor && detalle.estado !== 'entregado' && (
                <View style={styles.infoCard}>
                  <Text style={styles.seccionTitulo}>
                    {detalle.estado === 'cancelado' ? 'Reprogramar entrega' : 'Programar / reasignar entrega'}
                  </Text>

                  {detalle.estado === 'cancelado' && (
                    <Text style={styles.rowSub}>El pedido volverá a pendiente. Selecciona nueva fecha y repartidor.</Text>
                  )}

                  {/* Selector de fecha — siempre visible para supervisor */}
                  <View style={styles.fechaRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
                    <View style={styles.fechaInput}>
                      {Platform.OS === 'web'
                        ? <input type="date" value={fechaNueva} min={fechaGuatemala()}
                            onChange={(e: any) => { setFechaNueva(e.target.value); setExitoAsignacion(''); }}
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: COLORS.text } as any} />
                        : <TextInput value={fechaNueva} onChangeText={v => { setFechaNueva(v); setExitoAsignacion(''); }}
                            placeholder="AAAA-MM-DD" placeholderTextColor={COLORS.textLight}
                            style={{ fontSize: 15, color: COLORS.text, paddingVertical: 4 }} />
                      }
                    </View>
                  </View>

                  {/* Repartidores — obligatorio para cancelado, opcional para otros */}
                  <Text style={[styles.rowSub, { marginTop: 10, marginBottom: 4 }]}>
                    Repartidor{detalle.estado !== 'cancelado' ? ' (opcional)' : ''}
                  </Text>
                  {repartidores.map(r => (
                    <TouchableOpacity key={r.id} disabled={asignando}
                      onPress={() => { setSeleccionado(seleccionado === r.id ? null : r.id); setExitoAsignacion(''); }}
                      accessibilityRole="radio" accessibilityState={{ checked: seleccionado === r.id }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 6,
                               borderWidth: 1, borderColor: seleccionado === r.id ? COLORS.primary : COLORS.border, borderRadius: 8 }}>
                      <Ionicons name={seleccionado === r.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={COLORS.primary} />
                      <Text style={{ color: COLORS.text, flex: 1 }}>{r.nombre}</Text>
                      {seleccionado === r.id && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />}
                    </TouchableOpacity>
                  ))}
                  {!repartidores.length && <Text style={styles.rowSub}>No hay repartidores disponibles.</Text>}

                  {errorAsignacion && <Text style={styles.errorTexto}>{errorAsignacion}</Text>}
                  {exitoAsignacion && (
                    <View style={styles.exitoAsignacion}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                      <Text style={{ color: COLORS.success, fontSize: 13, fontWeight: '600' }}>{exitoAsignacion}</Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={asignar} disabled={asignando}
                    style={{ padding: 14, borderRadius: 10, backgroundColor: detalle.estado === 'cancelado' ? COLORS.warning : COLORS.primary,
                             opacity: asignando ? 0.6 : 1, marginTop: 4 }}>
                    <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>
                      {asignando ? 'Guardando…' : detalle.estado === 'cancelado' ? 'Confirmar reprogramación' : 'Guardar fecha de entrega'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
    flexGrow: 0, flexShrink: 0,
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

  filtroPanel: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10,
  },
  filtroPanelHint: { fontSize: 11, color: COLORS.textLight, marginBottom: 8 },
  filtroInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10, marginBottom: 8,
  },
  filtroIcono: { marginRight: 6 },
  filtroInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 10 },
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

  fechaRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: 4,
  },
  fechaInput: { flex: 1, marginLeft: 8 },
  exitoAsignacion: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.success + '18', borderRadius: 8, padding: 10, marginBottom: 8,
  },
});
