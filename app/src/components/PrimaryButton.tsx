import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../constants/colors';

interface Props {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
  variante?: 'primario' | 'secundario' | 'peligro';
  style?: ViewStyle;
}

/**
 * Boton principal reutilizable con soporte para estado de carga y variantes de color.
 * ISO 25010 — Usabilidad: boton grande con area de toque generosa (minimo 48dp).
 */
export default function PrimaryButton({
  titulo,
  onPress,
  cargando = false,
  deshabilitado = false,
  variante = 'primario',
  style,
}: Props) {
  const bgColor =
    variante === 'primario'
      ? COLORS.primary
      : variante === 'secundario'
      ? COLORS.surface
      : COLORS.error;

  const textColor =
    variante === 'secundario' ? COLORS.primary : COLORS.textOnDark;

  const isDisabled = deshabilitado || cargando;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bgColor },
        isDisabled && styles.deshabilitado,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {cargando ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.texto, { color: textColor }]}>{titulo}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  texto: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deshabilitado: {
    opacity: 0.5,
  },
});
