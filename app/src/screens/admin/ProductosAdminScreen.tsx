import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { productosAdmin, ProductoAdmin, lotesAdmin, Lote } from '../../services/adminApiService';
import { useApp } from '../../context/AppContext';
import Select, { SelectOption } from '../../components/Select';

// ── Catálogos predefinidos ────────────────────────────────────────────────────
const UNIDADES: SelectOption[] = [
  'unidad', 'saco', 'bolsa', 'botella', 'lata', 'litro',
  'paquete', 'caja', 'kg', 'lb', 'quintal',
].map(v => ({ label: v, value: v }));

const CATEGORIAS: SelectOption[] = [
  'Granos', 'Aceites', 'Endulzantes', 'Condimentos', 'Harinas',
  'Pastas', 'Enlatados', 'Lacteos', 'Bebidas', 'Limpieza', 'Otros',
].map(v => ({ label: v, value: v }));

// ── Helpers ───────────────────────────────────────────────────────────────────
const stockColor = (stock: number) =>
  stock === 0 ? COLORS.error : stock < 20 ? COLORS.warning : COLORS.success;

const formatFecha = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

const FORM_VACIO = {
  nombre: '', descripcion: '', precio: '',
  unidad: 'unidad', categoria: 'Granos',
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function ProductosAdminScreen() {
  const navigation = useNavigation();
  const { setUsuario } = useApp();

  // Lista de productos
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Modal crear / editar producto
  const [modalProd, setModalProd]   = useState(false);
  const [editando, setEditando]     = useState<ProductoAdmin | null>(null);
  const [form, setForm]             = useState(FORM_VACIO);
  const [guardando, setGuardando]   = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [exito, setExito]           = useState(false);

  // Modal gestión PEPS / lotes
  const [productoLotes, setProductoLotes] = useState<ProductoAdmin | null>(null);
  const [lotes, setLotes]                 = useState<Lote[]>([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);
  const [modalLotes, setModalLotes]       = useState(false);

  // Formulario nueva entrada de lote
  const [formLote, setFormLote]       = useState({ cantidad: '', costo: '', fecha: '', notas: '' });
  const [guardandoLote, setGuardandoLote] = useState(false);
  const [loteError, setLoteError]     = useState<string | null>(null);
  const [mostrarFormLote, setMostrarFormLote] = useState(false);

  // ── Carga ─────────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setProductos(await productosAdmin.listar());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Producto CRUD ─────────────────────────────────────────────────────────
  const abrirCrear = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
    setModalProd(true);
  };

  const abrirEditar = (p: ProductoAdmin) => {
    setEditando(p);
    setForm({
      nombre: p.nombre, descripcion: p.descripcion,
      precio: String(p.precio),
      unidad: p.unidad, categoria: p.categoria,
    });
    setFormError(null);
    setModalProd(true);
  };

  const guardarProducto = async () => {
    if (!form.nombre.trim() || !form.precio.trim()) {
      setFormError('Nombre y precio son obligatorios.');
      return;
    }
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio < 0) {
      setFormError('El precio debe ser un número válido.');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(), descripcion: form.descripcion,
        precio,
        stock: editando ? editando.stock : 0,  // stock se gestiona via lotes
        unidad: form.unidad, categoria: form.categoria,
      };
      if (editando) {
        const updated = await productosAdmin.actualizar(editando.id, payload);
        setProductos(prev => prev.map(p => p.id === editando.id ? updated : p));
      } else {
        const nuevo = await productosAdmin.crear(payload);
        setProductos(prev => [nuevo, ...prev]);
      }
      setModalProd(false);
      setExito(true);
      setTimeout(() => setExito(false), 2500);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProducto = (p: ProductoAdmin) => {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${p.nombre}"? Los lotes asociados quedarán huérfanos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await productosAdmin.eliminar(p.id);
              setProductos(prev => prev.filter(x => x.id !== p.id));
            } catch (e: any) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  };

  // ── PEPS / Lotes ──────────────────────────────────────────────────────────
  const abrirLotes = async (p: ProductoAdmin) => {
    setProductoLotes(p);
    setModalLotes(true);
    setMostrarFormLote(false);
    setFormLote({ cantidad: '', costo: '', fecha: '', notas: '' });
    setLoteError(null);
    setCargandoLotes(true);
    try {
      setLotes(await lotesAdmin.listar(p.id));
    } catch (e: any) {
      setLoteError(e.message);
    } finally {
      setCargandoLotes(false);
    }
  };

  const agregarLote = async () => {
    if (!formLote.cantidad || parseInt(formLote.cantidad) <= 0) {
      setLoteError('La cantidad debe ser mayor a 0.');
      return;
    }
    setGuardandoLote(true);
    setLoteError(null);
    try {
      const nuevo = await lotesAdmin.crear({
        producto_id: productoLotes!.id,
        cantidad: parseInt(formLote.cantidad),
        costo_unitario: formLote.costo ? parseFloat(formLote.costo) : null,
        fecha_entrada: formLote.fecha || undefined,
        notas: formLote.notas || undefined,
      });
      setLotes(prev => [...prev, nuevo].sort((a, b) =>
        a.fecha_entrada.localeCompare(b.fecha_entrada) || a.id - b.id
      ));
      // Actualizar stock en lista de productos
      setProductos(prev => prev.map(p =>
        p.id === productoLotes!.id
          ? { ...p, stock: p.stock + parseInt(formLote.cantidad) }
          : p
      ));
      setFormLote({ cantidad: '', costo: '', fecha: '', notas: '' });
      setMostrarFormLote(false);
    } catch (e: any) {
      setLoteError(e.message);
    } finally {
      setGuardandoLote(false);
    }
  };

  const eliminarLote = (lote: Lote) => {
    Alert.alert(
      'Eliminar lote',
      lote.cantidad_disponible !== lote.cantidad_inicial
        ? 'Este lote ya tiene consumos y no puede eliminarse.'
        : `¿Eliminar lote del ${formatFecha(lote.fecha_entrada)} (${lote.cantidad_inicial} ${lote.unidad})?`,
      lote.cantidad_disponible !== lote.cantidad_inicial
        ? [{ text: 'Entendido' }]
        : [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar', style: 'destructive',
              onPress: async () => {
                try {
                  await lotesAdmin.eliminar(lote.id);
                  setLotes(prev => prev.filter(l => l.id !== lote.id));
                  setProductos(prev => prev.map(p =>
                    p.id === lote.producto_id
                      ? { ...p, stock: p.stock - lote.cantidad_inicial }
                      : p
                  ));
                } catch (e: any) { Alert.alert('Error', e.message); }
              },
            },
          ]
    );
  };

  // ── Render producto ───────────────────────────────────────────────────────
  const renderProducto = ({ item }: { item: ProductoAdmin }) => (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowNombre} numberOfLines={1}>{item.nombre}</Text>
        <View style={styles.rowMeta}>
          <View style={styles.catBadge}>
            <Text style={styles.catTexto}>{item.categoria}</Text>
          </View>
          <Text style={styles.rowUnidad}>{item.unidad}</Text>
        </View>
        <View style={styles.rowBadges}>
          <Text style={styles.precio}>Q {Number(item.precio).toFixed(2)}</Text>
          <View style={[styles.stockBadge, { backgroundColor: stockColor(item.stock) + '22' }]}>
            <Ionicons name="layers-outline" size={11} color={stockColor(item.stock)} />
            <Text style={[styles.stockTexto, { color: stockColor(item.stock) }]}>
              {item.stock} en stock
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.rowAcciones}>
        <TouchableOpacity style={[styles.btnAccion, styles.btnPeps]} onPress={() => abrirLotes(item)}>
          <Ionicons name="layers-outline" size={15} color="#059669" />
          <Text style={styles.btnPepsTexto}>PEPS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditar(item)}>
          <Ionicons name="pencil-outline" size={17} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnAccion, styles.btnDelete]} onPress={() => eliminarProducto(item)}>
          <Ionicons name="trash-outline" size={17} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Render lote ───────────────────────────────────────────────────────────
  const renderLote = ({ item, index }: { item: Lote; index: number }) => {
    const consumido = item.cantidad_inicial - item.cantidad_disponible;
    const pct = item.cantidad_inicial > 0 ? item.cantidad_disponible / item.cantidad_inicial : 0;
    const esPrimero = index === 0 && item.cantidad_disponible > 0;

    return (
      <View style={[styles.loteCard, esPrimero && styles.lotePrimero]}>
        <View style={styles.loteHead}>
          <View style={styles.lotePepsLabel}>
            {esPrimero && (
              <View style={styles.pepsBadge}>
                <Text style={styles.pepsBadgeTexto}>PEPS 1°</Text>
              </View>
            )}
            <Text style={styles.loteOrden}>Lote #{index + 1}</Text>
          </View>
          <TouchableOpacity onPress={() => eliminarLote(item)}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.loteGrid}>
          <LoteInfo label="Entrada" valor={formatFecha(item.fecha_entrada)} icono="calendar-outline" />
          <LoteInfo label="Inicial" valor={`${item.cantidad_inicial} ${item.unidad}`} icono="cube-outline" />
          <LoteInfo label="Disponible" valor={`${item.cantidad_disponible} ${item.unidad}`} icono="checkmark-circle-outline" />
          <LoteInfo label="Consumido" valor={`${consumido} ${item.unidad}`} icono="arrow-down-circle-outline" />
          {item.costo_unitario != null && (
            <LoteInfo label="Costo/u" valor={`Q ${Number(item.costo_unitario).toFixed(2)}`} icono="pricetag-outline" />
          )}
          {item.notas && (
            <LoteInfo label="Notas" valor={item.notas} icono="document-text-outline" />
          )}
        </View>

        {/* Barra de progreso */}
        <View style={styles.barraFondo}>
          <View style={[
            styles.barraRelleno,
            { width: `${Math.round(pct * 100)}%` as any,
              backgroundColor: pct > 0.3 ? COLORS.success : pct > 0 ? COLORS.warning : COLORS.error }
          ]} />
        </View>
        <Text style={styles.barraTexto}>
          {Math.round(pct * 100)}% disponible
        </Text>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnAtras}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Productos</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.btnLogout} onPress={() => setUsuario(null)}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnAdd} onPress={abrirCrear}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {exito && (
        <View style={styles.exitoBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.exitoTexto}>Guardado correctamente</Text>
        </View>
      )}

      {error && <View style={styles.errorBanner}><Text style={styles.errorTexto}>{error}</Text></View>}

      <FlatList
        data={productos}
        keyExtractor={p => String(p.id)}
        renderItem={renderProducto}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          productos.length > 0
            ? <Text style={styles.contador}>{productos.length} productos · toca PEPS para gestionar stock</Text>
            : null
        }
        ListEmptyComponent={
          !cargando ? (
            <View style={styles.vacio}>
              <Ionicons name="cube-outline" size={48} color={COLORS.border} />
              <Text style={styles.vacioTexto}>No hay productos</Text>
              <TouchableOpacity style={styles.btnCrearVacio} onPress={abrirCrear}>
                <Text style={styles.btnCrearVacioTexto}>Crear primer producto</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* ── Modal Crear / Editar producto ── */}
      <Modal visible={modalProd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{editando ? 'Editar producto' : 'Nuevo producto'}</Text>
            <TouchableOpacity onPress={() => setModalProd(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formError && (
              <View style={styles.formError}><Text style={styles.formErrorTexto}>{formError}</Text></View>
            )}

            <Campo label="Nombre *">
              <TextInput style={styles.input} value={form.nombre}
                onChangeText={v => setForm(p => ({ ...p, nombre: v }))}
                placeholder="Arroz Diana 25 lb" placeholderTextColor={COLORS.textLight} />
            </Campo>

            <Campo label="Descripción">
              <TextInput style={styles.input} value={form.descripcion}
                onChangeText={v => setForm(p => ({ ...p, descripcion: v }))}
                placeholder="Descripción del producto" placeholderTextColor={COLORS.textLight} />
            </Campo>

            <Campo label="Precio (Q) *">
              <TextInput style={styles.input} value={form.precio}
                onChangeText={v => setForm(p => ({ ...p, precio: v }))}
                placeholder="85.00" placeholderTextColor={COLORS.textLight}
                keyboardType="decimal-pad" />
            </Campo>

            <Campo label="Unidad">
              <Select
                value={form.unidad}
                onChange={v => setForm(p => ({ ...p, unidad: v }))}
                options={UNIDADES}
                placeholder="Seleccionar unidad"
              />
            </Campo>

            <Campo label="Categoría">
              <Select
                value={form.categoria}
                onChange={v => setForm(p => ({ ...p, categoria: v }))}
                options={CATEGORIAS}
                placeholder="Seleccionar categoría"
              />
            </Campo>

            {editando && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} />
                <Text style={styles.infoTexto}>
                  El stock se gestiona desde el panel PEPS (botón azul en la lista).
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalProd(false)}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnGuardar, guardando && { opacity: 0.6 }]}
              onPress={guardarProducto} disabled={guardando}
            >
              {guardando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnGuardarTexto}>{editando ? 'Guardar cambios' : 'Crear producto'}</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Modal PEPS / Lotes ── */}
      <Modal visible={modalLotes} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setModalLotes(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitulo}>Inventario PEPS</Text>
              <Text style={styles.modalSub} numberOfLines={1}>{productoLotes?.nombre}</Text>
            </View>
            <TouchableOpacity onPress={() => setModalLotes(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Resumen stock total */}
            <View style={styles.stockResumen}>
              <View style={styles.stockResumenItem}>
                <Text style={styles.stockResumenNum}>{productoLotes?.stock ?? 0}</Text>
                <Text style={styles.stockResumenLabel}>Total disponible</Text>
              </View>
              <View style={styles.stockResumenDiv} />
              <View style={styles.stockResumenItem}>
                <Text style={styles.stockResumenNum}>{lotes.length}</Text>
                <Text style={styles.stockResumenLabel}>Lotes registrados</Text>
              </View>
              <View style={styles.stockResumenDiv} />
              <View style={styles.stockResumenItem}>
                <Text style={styles.stockResumenNum}>
                  {lotes.filter(l => l.cantidad_disponible > 0).length}
                </Text>
                <Text style={styles.stockResumenLabel}>Lotes activos</Text>
              </View>
            </View>

            {/* Botón nueva entrada */}
            <TouchableOpacity
              style={styles.btnNuevaEntrada}
              onPress={() => setMostrarFormLote(p => !p)}
            >
              <Ionicons name={mostrarFormLote ? 'chevron-up' : 'add-circle-outline'} size={18} color="#fff" />
              <Text style={styles.btnNuevaEntradaTexto}>
                {mostrarFormLote ? 'Cancelar entrada' : 'Registrar nueva entrada'}
              </Text>
            </TouchableOpacity>

            {/* Formulario nueva entrada */}
            {mostrarFormLote && (
              <View style={styles.formLote}>
                <Text style={styles.formLoteTitulo}>Nueva entrada de inventario</Text>
                {loteError && (
                  <View style={styles.formError}><Text style={styles.formErrorTexto}>{loteError}</Text></View>
                )}
                <Campo label="Cantidad *">
                  <TextInput style={styles.input} value={formLote.cantidad}
                    onChangeText={v => setFormLote(p => ({ ...p, cantidad: v }))}
                    placeholder="100" placeholderTextColor={COLORS.textLight}
                    keyboardType="numeric" />
                </Campo>
                <Campo label="Costo unitario (Q)">
                  <TextInput style={styles.input} value={formLote.costo}
                    onChangeText={v => setFormLote(p => ({ ...p, costo: v }))}
                    placeholder="75.00" placeholderTextColor={COLORS.textLight}
                    keyboardType="decimal-pad" />
                </Campo>
                <Campo label="Fecha de entrada">
                  <TextInput style={styles.input} value={formLote.fecha}
                    onChangeText={v => setFormLote(p => ({ ...p, fecha: v }))}
                    placeholder="2026-09-12" placeholderTextColor={COLORS.textLight} />
                </Campo>
                <Campo label="Notas">
                  <TextInput style={styles.input} value={formLote.notas}
                    onChangeText={v => setFormLote(p => ({ ...p, notas: v }))}
                    placeholder="Proveedor, lote de fábrica…" placeholderTextColor={COLORS.textLight} />
                </Campo>
                <TouchableOpacity
                  style={[styles.btnGuardar, guardandoLote && { opacity: 0.6 }]}
                  onPress={agregarLote} disabled={guardandoLote}
                >
                  {guardandoLote
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnGuardarTexto}>Confirmar entrada</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Lista de lotes */}
            <Text style={styles.pepsTitulo}>
              Lotes ordenados por PEPS (el primero se consume primero)
            </Text>

            {cargandoLotes ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
            ) : lotes.length === 0 ? (
              <View style={styles.vacio}>
                <Ionicons name="layers-outline" size={40} color={COLORS.border} />
                <Text style={styles.vacioTexto}>Sin lotes registrados</Text>
                <Text style={{ fontSize: 13, color: COLORS.textLight, textAlign: 'center' }}>
                  Registra la primera entrada para habilitar el control PEPS.
                </Text>
              </View>
            ) : (
              lotes.map((lote, idx) => (
                <View key={lote.id} style={{ marginBottom: 10 }}>
                  {renderLote({ item: lote, index: idx })}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LoteInfo({ label, valor, icono }: { label: string; valor: string; icono: any }) {
  return (
    <View style={styles.loteInfoItem}>
      <Ionicons name={icono} size={13} color={COLORS.textLight} />
      <Text style={styles.loteInfoLabel}>{label}</Text>
      <Text style={styles.loteInfoValor} numberOfLines={1}>{valor}</Text>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  btnAtras: { width: 36, alignItems: 'center' },
  titulo: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnLogout: { padding: 6 },
  exitoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#6EE7B7',
  },
  exitoTexto: { fontSize: 13, fontWeight: '600', color: '#065F46' },
  btnAdd: {
    backgroundColor: COLORS.primary, width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },

  errorBanner: { backgroundColor: COLORS.error + '18', padding: 12, margin: 12, borderRadius: 8 },
  errorTexto: { color: COLORS.error, fontSize: 13 },

  lista: { padding: 12, paddingBottom: 40 },
  contador: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', letterSpacing: 0.4, marginBottom: 10 },

  row: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rowInfo: { marginBottom: 10 },
  rowNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  catBadge: {
    backgroundColor: COLORS.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  catTexto: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  rowUnidad: { fontSize: 12, color: COLORS.textLight },
  rowBadges: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  precio: { fontSize: 16, fontWeight: '800', color: COLORS.accent },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stockTexto: { fontSize: 12, fontWeight: '700' },

  rowAcciones: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  btnAccion: { padding: 8, borderRadius: 8, backgroundColor: COLORS.background },
  btnPeps: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, backgroundColor: '#059669' + '18',
  },
  btnPepsTexto: { fontSize: 12, fontWeight: '700', color: '#059669' },
  btnDelete: { backgroundColor: COLORS.error + '12' },

  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: 16, color: COLORS.textLight },
  btnCrearVacio: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  btnCrearVacioTexto: { color: '#fff', fontWeight: '700' },

  // Modal base
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSub: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  modalBody: { padding: 20, paddingBottom: 40 },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
  },

  formError: { backgroundColor: COLORS.error + '15', borderRadius: 8, padding: 10, marginBottom: 14 },
  formErrorTexto: { color: COLORS.error, fontSize: 13 },

  campo: { marginBottom: 16 },
  campoLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.surface,
  },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.primary + '12', borderRadius: 10, padding: 12, marginTop: 4,
  },
  infoTexto: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 17 },

  btnCancelar: {
    flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnCancelarTexto: { fontSize: 15, fontWeight: '600', color: COLORS.textLight },
  btnGuardar: {
    flex: 2, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  btnGuardarTexto: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // PEPS / Lotes
  stockResumen: {
    flexDirection: 'row', backgroundColor: COLORS.dark, borderRadius: 14,
    padding: 16, marginBottom: 16,
  },
  stockResumenItem: { flex: 1, alignItems: 'center' },
  stockResumenNum: { fontSize: 24, fontWeight: '800', color: '#fff' },
  stockResumenLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4, textAlign: 'center' },
  stockResumenDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  btnNuevaEntrada: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, marginBottom: 16,
  },
  btnNuevaEntradaTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },

  formLote: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#059669' + '44', marginBottom: 20,
  },
  formLoteTitulo: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

  pepsTitulo: {
    fontSize: 12, fontWeight: '700', color: COLORS.textLight,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
  },

  loteCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  lotePrimero: { borderColor: '#059669', borderWidth: 2 },
  loteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  lotePepsLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pepsBadge: { backgroundColor: '#059669', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pepsBadgeTexto: { fontSize: 11, fontWeight: '800', color: '#fff' },
  loteOrden: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },

  loteGrid: { gap: 6, marginBottom: 12 },
  loteInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loteInfoLabel: { fontSize: 12, color: COLORS.textLight, width: 72 },
  loteInfoValor: { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1 },

  barraFondo: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  barraRelleno: { height: 6, borderRadius: 3 },
  barraTexto: { fontSize: 11, color: COLORS.textLight, marginTop: 4, textAlign: 'right' },
});
