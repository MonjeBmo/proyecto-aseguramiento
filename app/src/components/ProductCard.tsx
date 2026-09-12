import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Producto } from '../data/mockData';
import { COLORS } from '../constants/colors';

interface Props {
  producto: Producto;
  cantidad: number;
  onAgregar: () => void;
  onQuitar: () => void;
}

function colorStock(stock: number): string {
  if (stock === 0) return COLORS.stockSinStock;
  if (stock <= 10) return COLORS.stockBajo;
  return COLORS.stockOk;
}

/**
 * Tarjeta de producto usada en la pantalla de captura de pedido.
 * Muestra nombre, precio, stock y controles de cantidad (+/-).
 *
 * ISO 25010 — Usabilidad: iconos claros, controles grandes, stock visible con color.
 * ISO 25010 — Safety: deshabilita el boton "+" cuando no hay stock.
 */
export default function ProductCard({ producto, cantidad, onAgregar, onQuitar }: Props) {
  const sinStock = producto.stock === 0;
  const stockColor = colorStock(producto.stock);

  return (
    <View style={[styles.card, cantidad > 0 && styles.cardSeleccionada]}>
      {/* Info del producto */}
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={1}>{producto.nombre}</Text>
        <Text style={styles.precio}>Q {producto.precio.toFixed(2)} / {producto.unidad}</Text>
        <View style={styles.stockRow}>
          <Ionicons
            name={sinStock ? 'close-circle' : 'checkmark-circle'}
            size={13}
            color={stockColor}
          />
          <Text style={[styles.stockText, { color: stockColor }]}>
            {sinStock ? 'Sin stock' : `${producto.stock} disponibles`}
          </Text>
        </View>
      </View>

      {/* Controles de cantidad */}
      <View style={styles.controles}>
        <TouchableOpacity
          style={[styles.btn, cantidad === 0 && styles.btnDeshabilitado]}
          onPress={onQuitar}
          disabled={cantidad === 0}
        >
          <Ionicons name="remove" size={18} color={cantidad === 0 ? COLORS.border : COLORS.primary} />
        </TouchableOpacity>

        <Text style={styles.cantidad}>{cantidad}</Text>

        <TouchableOpacity
          style={[styles.btn, (sinStock || cantidad >= producto.stock) && styles.btnDeshabilitado]}
          onPress={onAgregar}
          disabled={sinStock || cantidad >= producto.stock}
        >
          <Ionicons
            name="add"
            size={18}
            color={(sinStock || cantidad >= producto.stock) ? COLORS.border : COLORS.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Subtotal si hay cantidad */}
      {cantidad > 0 && (
        <View style={styles.subtotalBadge}>
          <Text style={styles.subtotalText}>Q {(producto.precio * cantidad).toFixed(2)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardSeleccionada: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: '#F0F7FF',
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  nombre: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  precio: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  btnDeshabilitado: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  cantidad: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 24,
    textAlign: 'center',
  },
  subtotalBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  subtotalText: {
    color: COLORS.textOnDark,
    fontSize: 10,
    fontWeight: '700',
  },
});
