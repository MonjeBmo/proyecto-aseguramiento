import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Alert, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { Entrega } from '../data/mockData';
import { actualizarEstadoEntrega, NuevoEstado } from '../services/entregasApiService';
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
  const { usuario } = useApp();

  const [entrega, setEntrega] = useState<Entrega>(route.params.entrega);
  const [actualizando, setActualizando] = useState(false);

  const esTerminal = entrega.estado === 'entregado' || entrega.estado === 'cancelado';

  const handleActualizar = async (nuevoEstado: NuevoEstado) => {
    if (!usuario) return;

    const mensajes: Record<NuevoEstado, { titulo: string; cuerpo: string }> = {
      despachado: {
        titulo: 'Salir a entregar',
        cuerpo: `Confirmas que vas en camino a "${entrega.cliente_nombre}"?`,
      },
      entregado: {
        titulo: 'Marcar como entregado',
        cuerpo: `Confirmas que el pedido fue entregado a "${entrega.cliente_nombre}"?\n\nSe enviara una notificacion simulada al cliente.`,
      },
      cancelado: {
        titulo: 'No se pudo entregar',
        cuerpo: `Confirmas que no fue posible entregar el pedido a "${entrega.cliente_nombre}"?\n\nSe notificara al cliente para reprogramar.`,
      },
    };

    const { titulo, cuerpo } = mensajes[nuevoEstado];

    Alert.alert(titulo, cuerpo, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: nuevoEstado === 'cancelado' ? 'destructive' : 'default',
        onPress: async () => {
          setActualizando(true);
          try {
            await actualizarEstadoEntrega(entrega.id, nuevoEstado, usuario.id);
            setEntrega((prev) => ({ ...prev, estado: nuevoEstado }));

            if (nuevoEstado === 'entregado') {
              Alert.alert(
                'Entrega completada',
                `El cliente "${entrega.cliente_nombre}" fue notificado por WhatsApp (simulado).`,
                [{ text: 'Volver a mi ruta', onPress: () => navigation.goBack() }]
              );
            } else if (nuevoEstado === 'cancelado') {
              Alert.alert(
                'Entrega cancelada',
                `Se registro el intento fallido. El cliente sera contactado.`,
                [{ text: 'Volver a mi ruta', onPress: () => navigation.goBack() }]
              );
            }
          } catch (err: any) {
            const mensaje =
              err?.status === 409
                ? 'Esta transicion de estado no es valida.'
                : err?.message || 'No se pudo actualizar el estado. Verifica tu conexion.';
            Alert.alert('Error', mensaje);
          } finally {
            setActualizando(false);
          }
        },
      },
    ]);
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
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnAtras} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo} numberOfLines={1}>Detalle de entrega</Text>
        <View style={{ width: 38 }} />
      </View>

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
              onPress={() => handleActualizar('despachado')}
              cargando={actualizando}
            />
          )}

          {entrega.estado === 'despachado' && (
            <>
              <PrimaryButton
                titulo="Marcar como entregado"
                onPress={() => handleActualizar('entregado')}
                cargando={actualizando}
              />
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => handleActualizar('cancelado')}
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
});
