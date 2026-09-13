import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { sincronizarPendientes } from '../services/syncService';
import { COLORS } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Confirmacion'>;

/**
 * Pantalla de confirmacion exitosa de pedido.
 * Muestra un mensaje diferente segun si el pedido se sincronizo online o quedo pendiente.
 *
 * ISO 25010 — Usabilidad: mensaje claro de exito con siguiente accion visible.
 * ISO 25010 — Safety: informa explicitamente el estado de sincronizacion para que el
 *              vendedor sepa si el pedido ya esta en el servidor o pendiente.
 */
export default function ConfirmacionScreen({ route }: Props) {
  const { pedidoId, estaOnline } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isOnline, syncTrigger } = useApp();

  // Intentar sincronizar pendientes cuando la pantalla está activa y hay conexion
  useEffect(() => {
    if (isOnline) {
      sincronizarPendientes().catch(console.warn);
    }
  }, [syncTrigger, isOnline]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.contenido}>

        {/* Icono de exito */}
        <View style={[styles.iconoCirculo, estaOnline ? styles.iconoOnline : styles.iconoOffline]}>
          <Ionicons
            name={estaOnline ? 'cloud-done' : 'save'}
            size={56}
            color={COLORS.textOnDark}
          />
        </View>

        {/* Titulo */}
        <Text style={styles.titulo}>
          {estaOnline ? 'Pedido enviado' : 'Pedido guardado'}
        </Text>

        {/* Mensaje segun estado de conexion */}
        <View style={[styles.mensajeCard, estaOnline ? styles.mensajeOnline : styles.mensajeOffline]}>
          <Ionicons
            name={estaOnline ? 'checkmark-circle-outline' : 'time-outline'}
            size={20}
            color={estaOnline ? COLORS.success : COLORS.warning}
          />
          <Text style={styles.mensajeTexto}>
            {estaOnline
              ? 'El pedido fue enviado al servidor y el inventario se actualizo correctamente.'
              : 'Sin conexion — el pedido quedo guardado en este dispositivo y se enviara automaticamente cuando recuperes senial.'}
          </Text>
        </View>

        {/* ID del pedido */}
        <View style={styles.idRow}>
          <Text style={styles.idLabel}>{estaOnline ? 'Pedido confirmado' : 'ID local del pedido'}</Text>
          <Text style={styles.idValor}>#{pedidoId}</Text>
        </View>

        {/* Detalle del estado de sincronizacion */}
        {!estaOnline && (
          <View style={styles.infoSync}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.infoSyncTexto}>
              La sincronizacion es automatica. No necesitas hacer nada mas.
            </Text>
          </View>
        )}
      </View>

      {/* Boton para nuevo pedido */}
      <View style={styles.acciones}>
        <TouchableOpacity
          style={styles.btnNuevoPedido}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'CapturaPedido' }] })}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.textOnDark} />
          <Text style={styles.btnNuevoPedidoTexto}>Nuevo pedido</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  contenido: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28,
  },

  iconoCirculo: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  iconoOnline: { backgroundColor: COLORS.success },
  iconoOffline: { backgroundColor: COLORS.warning },

  titulo: {
    fontSize: 28, fontWeight: '800', color: COLORS.text,
    marginBottom: 20, textAlign: 'center',
  },

  mensajeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, padding: 16,
    width: '100%', marginBottom: 24,
  },
  mensajeOnline: { backgroundColor: '#E8F5E9' },
  mensajeOffline: { backgroundColor: '#FFF8E1' },
  mensajeTexto: {
    flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20,
  },

  idRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', backgroundColor: COLORS.surface,
    borderRadius: 10, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  idLabel: { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },
  idValor: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  infoSync: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    width: '100%', paddingHorizontal: 4,
  },
  infoSyncTexto: { flex: 1, fontSize: 12, color: COLORS.textLight, lineHeight: 17 },

  acciones: {
    padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  btnNuevoPedido: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  btnNuevoPedidoTexto: {
    fontSize: 16, fontWeight: '700', color: COLORS.textOnDark,
  },
});
