import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { MOCK_PRODUCTOS, Producto } from '../data/mockData';
import OfflineBanner from '../components/OfflineBanner';
import { COLORS } from '../constants/colors';

/**
 * Pantalla de catalogo de productos con stock visible.
 * Permite buscar y filtrar por categoria.
 *
 * ISO 25010 — Usabilidad: busqueda en tiempo real, filtro por categoria.
 * ISO 25010 — Adecuacion funcional: muestra el stock actual para que el vendedor
 *              pueda informar al cliente antes de generar el pedido.
 */
export default function CatalogoScreen() {
  const navigation = useNavigation();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  const categorias = Array.from(new Set(MOCK_PRODUCTOS.map((p) => p.categoria))).sort();

  const productosFiltrados = MOCK_PRODUCTOS.filter((p) => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === null || p.categoria === categoriaFiltro;
    return coincideBusqueda && coincideCategoria;
  });

  const colorStock = (stock: number) => {
    if (stock === 0) return COLORS.stockSinStock;
    if (stock <= 10) return COLORS.stockBajo;
    return COLORS.stockOk;
  };

  const renderProducto = ({ item }: { item: Producto }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.nombre} numberOfLines={1}>{item.nombre}</Text>
        <Text style={styles.categoria}>{item.categoria}</Text>
      </View>
      <Text style={styles.descripcion}>{item.descripcion}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.precio}>Q {item.precio.toFixed(2)} / {item.unidad}</Text>
        <View style={[styles.stockBadge, { backgroundColor: colorStock(item.stock) + '22' }]}>
          <View style={[styles.stockDot, { backgroundColor: colorStock(item.stock) }]} />
          <Text style={[styles.stockTexto, { color: colorStock(item.stock) }]}>
            {item.stock === 0 ? 'Sin stock' : `${item.stock} uds.`}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnAtras}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Catalogo de productos</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Busqueda */}
      <View style={styles.buscadorRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textLight} />
        <TextInput
          style={styles.buscadorInput}
          placeholder="Buscar producto..."
          placeholderTextColor={COLORS.textLight}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros de categoria */}
      <FlatList
        horizontal
        data={[null, ...categorias]}
        keyExtractor={(item) => item ?? '__todos'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtrosRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filtroChip, categoriaFiltro === item && styles.filtroChipActivo]}
            onPress={() => setCategoriaFiltro(item)}
          >
            <Text style={[styles.filtroChipTexto, categoriaFiltro === item && styles.filtroChipTextoActivo]}>
              {item ?? 'Todos'}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Lista de productos */}
      <FlatList
        data={productosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProducto}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Ionicons name="cube-outline" size={48} color={COLORS.border} />
            <Text style={styles.vacioTexto}>No se encontraron productos</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
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
  titulo: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  buscadorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, padding: 12,
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  buscadorInput: { flex: 1, fontSize: 15, color: COLORS.text },

  filtrosRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filtroChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  filtroChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroChipTexto: { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
  filtroChipTextoActivo: { color: COLORS.textOnDark },

  lista: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  nombre: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  categoria: { fontSize: 11, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase' },
  descripcion: { fontSize: 13, color: COLORS.textLight, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  precio: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  stockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockTexto: { fontSize: 12, fontWeight: '700' },

  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: 15, color: COLORS.textLight },
});
