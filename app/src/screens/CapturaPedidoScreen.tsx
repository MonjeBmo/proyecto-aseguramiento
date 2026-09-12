import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Alert, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { guardarPedido } from '../database/pedidosQueries';
import { sincronizarPedidoInmediato, CartItem } from '../services/syncService';
import { MOCK_CLIENTES, MOCK_PRODUCTOS, Cliente, Producto } from '../data/mockData';
import OfflineBanner from '../components/OfflineBanner';
import ProductCard from '../components/ProductCard';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'CapturaPedido'>;
type Paso = 'cliente' | 'productos' | 'resumen';

/**
 * Pantalla principal del flujo del Vendedor de ruta.
 * Implementa un wizard de 3 pasos:
 *   Paso 1 — Seleccionar cliente
 *   Paso 2 — Agregar productos y cantidades
 *   Paso 3 — Revisar resumen y confirmar
 *
 * ISO 25010 — Adecuacion funcional: cubre el flujo completo de captura de pedido.
 * ISO 25010 — Usabilidad: navegacion lineal, feedback visual en cada paso.
 * ISO 25010 — Safety: valida stock antes de agregar; bloquea confirmacion si no hay items.
 */
export default function CapturaPedidoScreen() {
  const navigation = useNavigation<NavProp>();
  const { usuario, isOnline, setUsuario } = useApp();

  const [paso, setPaso] = useState<Paso>('cliente');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [carrito, setCarrito] = useState<Map<number, CartItem>>(new Map());
  const [guardando, setGuardando] = useState(false);

  // Items en carrito con cantidad > 0
  const itemsCarrito = useMemo(
    () => Array.from(carrito.values()).filter((i) => i.cantidad > 0),
    [carrito]
  );

  const totalCarrito = useMemo(
    () => itemsCarrito.reduce((sum, i) => sum + i.subtotal, 0),
    [itemsCarrito]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAgregarProducto = (producto: Producto) => {
    setCarrito((prev) => {
      const next = new Map(prev);
      const actual = next.get(producto.id);
      const nuevaCantidad = (actual?.cantidad ?? 0) + 1;

      if (nuevaCantidad > producto.stock) {
        Alert.alert(
          'Stock insuficiente',
          `Solo hay ${producto.stock} ${producto.unidad}(s) de "${producto.nombre}" disponibles.`
        );
        return prev;
      }

      next.set(producto.id, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: nuevaCantidad,
        subtotal: producto.precio * nuevaCantidad,
      });
      return next;
    });
  };

  const handleQuitarProducto = (productoId: number) => {
    setCarrito((prev) => {
      const next = new Map(prev);
      const actual = next.get(productoId);
      if (!actual) return prev;

      const nuevaCantidad = actual.cantidad - 1;
      if (nuevaCantidad <= 0) {
        next.delete(productoId);
      } else {
        next.set(productoId, { ...actual, cantidad: nuevaCantidad, subtotal: actual.precio * nuevaCantidad });
      }
      return next;
    });
  };

  const handleConfirmarPedido = async () => {
    if (!clienteSeleccionado || !usuario || itemsCarrito.length === 0) return;

    setGuardando(true);
    try {
      const localId = await guardarPedido({
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre,
        vendedor_id: usuario.id,
        vendedor_nombre: usuario.nombre,
        items: JSON.stringify(itemsCarrito),
        total: totalCarrito,
        estado: 'pendiente',
        creado_en: new Date().toISOString(),
      });

      if (isOnline) {
        await sincronizarPedidoInmediato(localId, {
          cliente_id: clienteSeleccionado.id,
          vendedor_id: usuario.id,
          items: itemsCarrito,
        });
      }

      navigation.navigate('Confirmacion', { pedidoId: localId, estaOnline: isOnline });
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar el pedido. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const resetForm = () => {
    setPaso('cliente');
    setClienteSeleccionado(null);
    setCarrito(new Map());
  };

  // ── Render por paso ───────────────────────────────────────────────────────

  const renderPasoCliente = () => (
    <FlatList
      data={MOCK_CLIENTES}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.lista}
      ListHeaderComponent={<Text style={styles.instruccion}>Selecciona el cliente al que le vas a vender:</Text>}
      renderItem={({ item }) => {
        const seleccionado = clienteSeleccionado?.id === item.id;
        return (
          <TouchableOpacity
            style={[styles.clienteCard, seleccionado && styles.clienteCardSeleccionado]}
            onPress={() => setClienteSeleccionado(item)}
            activeOpacity={0.75}
          >
            <View style={[styles.clienteIcono, seleccionado && { backgroundColor: COLORS.primary }]}>
              <Ionicons name="storefront" size={22} color={seleccionado ? COLORS.textOnDark : COLORS.primary} />
            </View>
            <View style={styles.clienteInfo}>
              <Text style={styles.clienteNombre}>{item.nombre}</Text>
              <Text style={styles.clienteZona}>{item.zona} — {item.direccion}</Text>
            </View>
            {seleccionado && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );

  const renderPasoProductos = () => (
    <FlatList
      data={MOCK_PRODUCTOS}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.lista}
      ListHeaderComponent={
        <View style={styles.carritoResumenMini}>
          <Ionicons name="cart-outline" size={16} color={COLORS.primary} />
          <Text style={styles.carritoResumenTexto}>
            {itemsCarrito.length === 0
              ? 'Aun no has agregado productos'
              : `${itemsCarrito.length} producto(s) — Total: Q ${totalCarrito.toFixed(2)}`}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <ProductCard
          producto={item}
          cantidad={carrito.get(item.id)?.cantidad ?? 0}
          onAgregar={() => handleAgregarProducto(item)}
          onQuitar={() => handleQuitarProducto(item.id)}
        />
      )}
    />
  );

  const renderPasoResumen = () => (
    <ScrollView contentContainerStyle={styles.lista}>
      {/* Cliente */}
      <View style={styles.resumenSeccion}>
        <Text style={styles.resumenTitulo}>Cliente</Text>
        <View style={styles.resumenCard}>
          <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
          <View style={styles.resumenCardTextos}>
            <Text style={styles.resumenCardNombre}>{clienteSeleccionado?.nombre}</Text>
            <Text style={styles.resumenCardSub}>{clienteSeleccionado?.zona}</Text>
          </View>
        </View>
      </View>

      {/* Productos */}
      <View style={styles.resumenSeccion}>
        <Text style={styles.resumenTitulo}>Productos ({itemsCarrito.length})</Text>
        {itemsCarrito.map((item) => (
          <View key={item.productoId} style={styles.resumenItem}>
            <Text style={styles.resumenItemNombre} numberOfLines={1}>
              {item.cantidad}x {item.nombre}
            </Text>
            <Text style={styles.resumenItemPrecio}>Q {item.subtotal.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalValor}>Q {totalCarrito.toFixed(2)}</Text>
      </View>

      {/* Estado de conexion */}
      <View style={[styles.estadoConexion, { backgroundColor: isOnline ? '#E8F5E9' : '#FFF8E1' }]}>
        <Ionicons
          name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
          size={18}
          color={isOnline ? COLORS.success : COLORS.warning}
        />
        <Text style={[styles.estadoConexionTexto, { color: isOnline ? COLORS.success : COLORS.warning }]}>
          {isOnline
            ? 'Online — el pedido se enviara de inmediato'
            : 'Offline — se guardara y enviara al recuperar senal'}
        </Text>
      </View>

      <PrimaryButton
        titulo={isOnline ? 'Confirmar y enviar pedido' : 'Guardar pedido (offline)'}
        onPress={handleConfirmarPedido}
        cargando={guardando}
        deshabilitado={itemsCarrito.length === 0}
        style={styles.btnConfirmar}
      />

      <TouchableOpacity style={styles.btnCancelar} onPress={resetForm}>
        <Text style={styles.btnCancelarTexto}>Cancelar pedido</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Indicador de pasos ────────────────────────────────────────────────────

  const pasos: Array<{ key: Paso; label: string; icono: string }> = [
    { key: 'cliente', label: 'Cliente', icono: 'storefront-outline' },
    { key: 'productos', label: 'Productos', icono: 'cube-outline' },
    { key: 'resumen', label: 'Resumen', icono: 'receipt-outline' },
  ];
  const indicePasoActual = pasos.findIndex((p) => p.key === paso);

  // ── JSX principal ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitulo}>Nuevo pedido</Text>
          <Text style={styles.headerSub}>{usuario?.nombre}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Catalogo')} style={styles.btnCatalogo}>
            <Ionicons name="list-outline" size={20} color={COLORS.primary} />
            <Text style={styles.btnCatalogoTexto}>Catalogo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setUsuario(null)} style={styles.btnSalir}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Indicador de pasos */}
      <View style={styles.pasosRow}>
        {pasos.map((p, idx) => (
          <React.Fragment key={p.key}>
            <View style={styles.pasoItem}>
              <View style={[
                styles.pasoCirculo,
                idx <= indicePasoActual && styles.pasoCirculoActivo,
              ]}>
                <Ionicons
                  name={p.icono as any}
                  size={14}
                  color={idx <= indicePasoActual ? COLORS.textOnDark : COLORS.textLight}
                />
              </View>
              <Text style={[styles.pasoLabel, idx === indicePasoActual && styles.pasoLabelActivo]}>
                {p.label}
              </Text>
            </View>
            {idx < pasos.length - 1 && (
              <View style={[styles.pasoLinea, idx < indicePasoActual && styles.pasoLineaActiva]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Contenido del paso */}
      <View style={styles.contenido}>
        {paso === 'cliente' && renderPasoCliente()}
        {paso === 'productos' && renderPasoProductos()}
        {paso === 'resumen' && renderPasoResumen()}
      </View>

      {/* Navegacion entre pasos (oculta en resumen porque tiene sus propios botones) */}
      {paso !== 'resumen' && (
        <View style={styles.navegacion}>
          {paso === 'productos' && (
            <TouchableOpacity style={styles.btnAtras} onPress={() => setPaso('cliente')}>
              <Ionicons name="arrow-back" size={18} color={COLORS.textLight} />
              <Text style={styles.btnAtrasTexto}>Atras</Text>
            </TouchableOpacity>
          )}

          <PrimaryButton
            titulo={paso === 'cliente' ? 'Siguiente — Agregar productos' : 'Ver resumen del pedido'}
            onPress={() => {
              if (paso === 'cliente') {
                if (!clienteSeleccionado) {
                  Alert.alert('Selecciona un cliente', 'Debes seleccionar un cliente antes de continuar.');
                  return;
                }
                setPaso('productos');
              } else if (paso === 'productos') {
                if (itemsCarrito.length === 0) {
                  Alert.alert('Agrega productos', 'Debes agregar al menos un producto al pedido.');
                  return;
                }
                setPaso('resumen');
              }
            }}
            style={styles.btnSiguiente}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitulo: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textLight, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnCatalogo: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  btnCatalogoTexto: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  btnSalir: { padding: 8 },

  pasosRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pasoItem: { alignItems: 'center', gap: 4 },
  pasoCirculo: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pasoCirculoActivo: { backgroundColor: COLORS.primary },
  pasoLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  pasoLabelActivo: { color: COLORS.primary, fontWeight: '700' },
  pasoLinea: { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: 6, marginBottom: 14 },
  pasoLineaActiva: { backgroundColor: COLORS.primary },

  contenido: { flex: 1 },
  lista: { paddingVertical: 12, paddingBottom: 24 },

  instruccion: {
    fontSize: 14, color: COLORS.textLight, marginHorizontal: 16, marginBottom: 10,
  },

  clienteCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    marginHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  clienteCardSeleccionado: { borderColor: COLORS.primary, backgroundColor: '#F0F7FF' },
  clienteIcono: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  clienteInfo: { flex: 1 },
  clienteNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  clienteZona: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  carritoResumenMini: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#EAF4FF', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  carritoResumenTexto: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  resumenSeccion: { marginHorizontal: 16, marginBottom: 16 },
  resumenTitulo: {
    fontSize: 12, fontWeight: '700', color: COLORS.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  resumenCard: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  resumenCardTextos: { flex: 1 },
  resumenCardNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  resumenCardSub: { fontSize: 13, color: COLORS.textLight },
  resumenItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 8, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  resumenItemNombre: { flex: 1, fontSize: 14, color: COLORS.text, marginRight: 8 },
  resumenItemPrecio: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: COLORS.dark, borderRadius: 12, padding: 16,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  totalValor: { fontSize: 22, fontWeight: '800', color: COLORS.textOnDark },

  estadoConexion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  estadoConexionTexto: { fontSize: 13, fontWeight: '600', flex: 1 },

  btnConfirmar: { marginHorizontal: 16, marginBottom: 10 },
  btnCancelar: { alignSelf: 'center', padding: 12, marginBottom: 20 },
  btnCancelarTexto: { fontSize: 14, color: COLORS.error, fontWeight: '600' },

  navegacion: {
    padding: 16, backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: 10,
  },
  btnAtras: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingVertical: 4,
  },
  btnAtrasTexto: { fontSize: 14, color: COLORS.textLight },
  btnSiguiente: {},
});
