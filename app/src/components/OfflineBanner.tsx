import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/colors';

/**
 * Banner que aparece en la parte superior cuando el dispositivo esta offline.
 * Desaparece automaticamente al recuperar la conexion.
 *
 * ISO 25010 — Usabilidad: feedback visual inmediato del estado de red.
 * ISO 25010 — Safety: el vendedor sabe explicitamente si su pedido se sincronizara.
 */
export default function OfflineBanner() {
  const { isOnline } = useApp();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={16} color={COLORS.textOnDark} />
      <Text style={styles.text}>Sin conexion — los pedidos se guardaran localmente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.offline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  text: {
    color: COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
});
