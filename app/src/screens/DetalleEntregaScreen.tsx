import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Modal, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { Entrega } from '../data/mockData';
import { actualizarEstadoEntrega, obtenerMisEntregas, NuevoEstado } from '../services/entregasApiService';
import OfflineBanner from '../components/OfflineBanner';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleEntrega'>;

/**
 * Detalle de una entrega con los botones de accion segun el estado actual.
 *
 * Flujo de transiciones:
 *   confirmado  → [Salir a entregar]  → despachado
 *   despachado  → [Marcar entregado]  → entregado   + WhatsApp simulado
 *   despachado  → [No se pudo entregar] → cancelado + WhatsApp simulado
 *   entregado / cancelado → solo lectura
 *
 * ISO 25010 — Safety: los botones solo aparecen para las transiciones validas.
 * ISO 25010 — Adecuacion funcional: cada accion dispara la notificacion simulada al cliente.
 */
export default function DetalleEntregaScreen({ route }: Props) {
  const navigation = useNavigation();
  const { usuario, actualizarEntregas } = useApp();

  const [entrega, setEntrega] = useState<Entrega>(route.params.entrega);
  const [actualizando, setActualizando] = useState(false);
  const [confirmando, setConfirmando] = useState<NuevoEstado | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exito, setExito] = useState<NuevoEstado | null>(null);

  const esTerminal = entrega.estado === 'entregado' || entrega.estado === 'cancelado';

  const CONFIRM_INFO: Record<NuevoEstado, { titulo: string; cuerpo: string; colorBtn: string; labelBtn: string }> = {
    despachado: {
      titulo: 'Salir a entregar',
      cuerpo: `Confirmas que vas en camino a "${entrega.cliente_nombre}"?`,
      colorBtn: COLORS.primary,
      labelBtn: 'Confirmar',
    },
    entregado: {
      titulo: 'Marcar como entregado',
      cuerpo: `Confirmas que el pedido fue entregado a "${entrega.cliente_nombre}"?\n\nSe enviara una notificacion simulada al cliente.`,
      colorBtn: COLORS.success,
      labelBtn: 'Confirmar entrega',
    },
    cancelado: {
      titulo: 'No se pudo entregar',
      cuerpo: `Confirmas que no fue posible entregar el pedido a "${entrega.cliente_nombre}"?\n\nSe notificara al cliente para reprogramar.`,
      colorBtn: COLORS.error,
      labelBtn: 'Confirmar cancelacion',
    },
  };

  const confirmarAccion = async () => {
    if (!usuario || !confirmando || actualizando) return;
    setActualizando(true);
    setErrorMsg(null);
    try {
      const resultado = await actualizarEstadoEntrega(entrega.id, confirmando, usuario.id);
      setEntrega((prev) => ({ ...prev, estado: resultado.estado }));
      actualizarEntregas();
      setExito(confirmando);
      setConfirmando(null);
    } catch (err: any) {
      // Una pantalla antigua puede intentar repetir una entrega ya completada.
      if (err?.status === 409) {
        try {
          const actual = (await obtenerMisEntregas(usuario.id)).find(e => e.id === entrega.id);
          if (actual) {
            setEntrega(actual);
            actualizarEntregas();
            if (actual.estado === 'entregado' || actual.estado === 'cancelado') {
              setExito(actual.estado);
              setConfirmando(null);
              return;
            }
          }
        } catch { /* Mantener visible el error de la operación. */ }
      }
      setErrorMsg(
        err?.status === 409
          ? 'Esta transicion de estado no es valida.'
          : err?.message || 'No se pudo actualizar el estado. Verifica tu conexion.'
      );
    } finally {
      setActualizando(false);
    }
  };

  const estadoConfig = {
    confirmado: { color: COLORS.warning,  label: 'Pendiente de despacho', icono: 'time-outline' as const },
    despachado: { color: COLORS.primary,  label: 'En camino',             icono: 'bicycle-outline' as const },
    entregado:  { color: COLORS.success,  label: 'Entregado',             icono: 'checkmark-circle' as const },
    cancelado:  { color: COLORS.error,    label: 'No entregado',          icono: 'close-circle' as const },
  };
  const config = estadoConfig[entrega.estado];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Modal de confirmacion inline (funciona en web y nativo) */}
      <Modal visible={confirmando !== null} transparent animationType="fade" onRequestClose={() => { if (!actualizando) setConfirmando(null); }}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitulo}>{confirmando ? CONFIRM_INFO[confirmando].titulo : ''}</Text>
            <Text style={styles.confirmCuerpo}>{confirmando ? CONFIRM_INFO[confirmando].cuerpo : ''}</Text>
            {errorMsg && (
              <View style={styles.errorInline}>
                <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
                <Text style={styles.errorInlineTexto}>{errorMsg}</Text>
              </View>
            )}
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmBtnCancelar} onPress={() => { setConfirmando(null); setErrorMsg(null); }} disabled={actualizando}>
                <Text style={styles.confirmBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtnOk, { backgroundColor: confirmando ? CONFIRM_INFO[confirmando].colorBtn : COLORS.primary }, actualizando && { opacity: 0.6 }]}
                onPress={confirmarAccion}
                disabled={actualizando}
              >
                <Text style={styles.confirmBtnOkTexto}>
                  {actualizando ? 'Procesando…' : (confirmando ? CONFIRM_INFO[confirmando].labelBtn : '')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnAtras} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo} numberOfLines={1}>Detalle de entrega</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Banner de exito */}
      {exito && (
        <View style={[styles.exitoBanner, { backgroundColor: exito === 'cancelado' ? COLORS.error + '18' : '#D1FAE5' }]}>
          <Ionicons name={exito === 'cancelado' ? 'close-circle' : 'checkmark-circle'} size={16} color={exito === 'cancelado' ? COLORS.error : '#10B981'} />
          <Text style={[styles.exitoTexto, { color: exito === 'cancelado' ? COLORS.error : '#065F46' }]}>
            {exito === 'entregado' ? 'Entrega completada. Cliente notificado (simulado).' : exito === 'cancelado' ? 'Entrega cancelada. Se notificara al cliente.' : 'Estado actualizado.'}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.exitoLink, { color: exito === 'cancelado' ? COLORS.error : '#065F46' }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.contenido}>

        {/* Estado actual */}
        <View style={[styles.estadoCard, { backgroundColor: config.color + '18', borderColor: config.color + '44' }]}>
          <Ionicons name={config.icono} size={28} color={config.color} />
          <View>
            <Text style={styles.estadoLabel}>Estado actual</Text>
            <Text style={[styles.estadoValor, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {/* Info del cliente */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Cliente</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoFila}>
              <Ionicons name="storefront-outline" size={16} color={COLORS.primary} />
              <Text style={styles.infoNombre}>{entrega.cliente_nombre}</Text>
            </View>
            <View style={styles.infoFila}>
              <Ionicons name="location-outline" size={15} color={COLORS.textLight} />
              <Text style={styles.infoTexto}>{entrega.cliente_zona} — {entrega.cliente_direccion}</Text>
            </View>
            <View style={styles.infoFila}>
              <Ionicons name="call-outline" size={15} color={COLORS.textLight} />
              <Text style={styles.infoTexto}>{entrega.cliente_telefono}</Text>
            </View>
          </View>
        </View>

        {/* Items del pedido */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Productos ({entrega.items.length})</Text>
          {entrega.items.map((item, idx) => (
            <View key={idx} style={styles.itemFila}>
              <View style={styles.itemCantidadBadge}>
                <Text style={styles.itemCantidad}>{item.cantidad}</Text>
              </View>
              <Text style={styles.itemNombre} numberOfLines={1}>{item.producto_nombre}</Text>
              <Text style={styles.itemSubtotal}>Q {Number(item.subtotal).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL DEL PEDIDO</Text>
          <Text style={styles.totalValor}>Q {Number(entrega.total).toFixed(2)}</Text>
        </View>

        {/* Info de WhatsApp simulado */}
        {!esTerminal && (
          <View style={styles.whatsappInfo}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={styles.whatsappTexto}>
              Al marcar como entregado o cancelado se registrara una notificacion simulada al {entrega.cliente_telefono}.
            </Text>
          </View>
        )}

        {/* Comprobante si ya fue completado */}
        {esTerminal && (
          <View style={[styles.terminalCard, { backgroundColor: config.color + '15' }]}>
            <Ionicons name={config.icono} size={22} color={config.color} />
            <Text style={[styles.terminalTexto, { color: config.color }]}>
              {entrega.estado === 'entregado'
                ? 'Entrega completada. El cliente fue notificado (simulado).'
                : 'Entrega cancelada. Se notificara al cliente para reprogramar.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Botones de accion (solo para estados no terminales) */}
      {!esTerminal && (
        <View style={styles.acciones}>
          {entrega.estado === 'confirmado' && (
            <PrimaryButton
              titulo="Salir a entregar"
              onPress={() => setConfirmando('despachado')}
              cargando={actualizando}
            />
          )}

          {entrega.estado === 'despachado' && (
            <>
              <PrimaryButton
                titulo="Marcar como entregado"
                onPress={() => setConfirmando('entregado')}
                cargando={actualizando}
              />
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setConfirmando('cancelado')}
                disabled={actualizando}
              >
                <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                <Text style={styles.btnCancelarTexto}>No se pudo entregar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  btnAtras: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  contenido: { padding: 16, paddingBottom: 30 },

  estadoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1,
  },
  estadoLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  estadoValor: { fontSize: 18, fontWeight: '800' },

  seccion: { marginBottom: 20 },
  seccionTitulo: {
    fontSize: 12, fontWeight: '700', color: COLORS.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  infoFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoNombre: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  infoTexto: { fontSize: 14, color: COLORS.textLight, flex: 1 },

  itemFila: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  itemCantidadBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  itemCantidad: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  itemNombre: { flex: 1, fontSize: 14, color: COLORS.text },
  itemSubtotal: { fontSize: 14, fontWeight: '700', color: COLORS.accent },

  totalCard: {
    backgroundColor: COLORS.dark, borderRadius: 14, padding: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1 },
  totalValor: { fontSize: 24, fontWeight: '800', color: COLORS.textOnDark },

  whatsappInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#E8FFF0', borderRadius: 10,
    padding: 12, marginBottom: 10,
  },
  whatsappTexto: { flex: 1, fontSize: 12, color: '#1A7A3A', lineHeight: 17 },

  terminalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 14,
  },
  terminalTexto: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },

  acciones: {
    padding: 16, backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10,
  },
  btnCancelar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  btnCancelarTexto: { fontSize: 15, fontWeight: '700', color: COLORS.error },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  confirmCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 24, width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 10,
  },
  confirmTitulo: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  confirmCuerpo: { fontSize: 14, color: COLORS.textLight, lineHeight: 21, marginBottom: 20 },
  errorInline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.error + '15', borderRadius: 8, padding: 10, marginBottom: 16,
  },
  errorInlineTexto: { flex: 1, fontSize: 13, color: COLORS.error },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmBtnCancelar: {
    flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  confirmBtnCancelarTexto: { fontSize: 15, fontWeight: '600', color: COLORS.textLight },
  confirmBtnOk: {
    flex: 2, borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  confirmBtnOkTexto: { fontSize: 15, fontWeight: '700', color: '#fff' },

  exitoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#6EE7B7',
  },
  exitoTexto: { flex: 1, fontSize: 13, fontWeight: '600' },
  exitoLink: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
