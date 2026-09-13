import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { clientesAdmin, ClienteAdmin } from '../../services/adminApiService';
import { useApp } from '../../context/AppContext';
import LocationPicker from '../../components/LocationPicker';

const FORM_VACIO = { nombre: '', telefono: '', direccion: '', zona: '', lat: '', lng: '' };

export default function ClientesAdminScreen() {
  const navigation = useNavigation();
  const { setUsuario, adminOrigen } = useApp();
  const [clientes, setClientes] = useState<ClienteAdmin[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando]   = useState<ClienteAdmin | null>(null);
  const [form, setForm]           = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [exito, setExito]         = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await clientesAdmin.listar();
      setClientes(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
    setModalVisible(true);
  };

  const abrirEditar = (c: ClienteAdmin) => {
    setEditando(c);
    setForm({
      nombre: c.nombre, telefono: c.telefono, direccion: c.direccion, zona: c.zona,
      lat: c.lat != null ? String(c.lat) : '',
      lng: c.lng != null ? String(c.lng) : '',
    });
    setFormError(null);
    setModalVisible(true);
  };

  const RE_TELEFONO_GT = /^(\+502[\s-]?)?[2-9]\d{3}[-\s]?\d{4}$/;

  const guardar = async () => {
    if (!form.nombre.trim() || form.nombre.trim().length < 2) {
      setFormError('El nombre del cliente es obligatorio (mín. 2 caracteres).');
      return;
    }
    if (form.telefono.trim() && !RE_TELEFONO_GT.test(form.telefono.trim())) {
      setFormError('El teléfono debe ser un número guatemalteco válido (ej. 5555-1234).');
      return;
    }
    const lat = form.lat.trim() === '' ? null : Number(form.lat);
    const lng = form.lng.trim() === '' ? null : Number(form.lng);
    if ((lat === null) !== (lng === null) ||
        (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
        (lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180))) {
      setFormError('Selecciona una ubicación válida con latitud y longitud.');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono,
        direccion: form.direccion,
        zona: form.zona,
        lat,
        lng,
      };
      if (editando) {
        const actualizado = await clientesAdmin.actualizar(editando.id, payload);
        setClientes(prev => prev.map(c => c.id === editando.id ? actualizado : c));
      } else {
        const nuevo = await clientesAdmin.crear(payload);
        setClientes(prev => [nuevo, ...prev]);
      }
      setModalVisible(false);
      setExito(lat !== null ? 'Cliente y coordenadas guardados correctamente' : 'Cliente guardado sin ubicación');
      setTimeout(() => setExito(''), 2500);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (c: ClienteAdmin) => {
    Alert.alert(
      'Eliminar cliente',
      `¿Eliminar a "${c.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await clientesAdmin.eliminar(c.id);
              setClientes(prev => prev.filter(x => x.id !== c.id));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ClienteAdmin }) => (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Ionicons name="storefront-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowNombre} numberOfLines={1}>{item.nombre}</Text>
        <View style={styles.rowMeta}>
          <Ionicons name="location-outline" size={12} color={COLORS.textLight} />
          <Text style={styles.rowSub}>{item.zona}</Text>
          <Ionicons name="call-outline" size={12} color={COLORS.textLight} />
          <Text style={styles.rowSub}>{item.telefono}</Text>
        </View>
        {item.direccion ? (
          <Text style={styles.rowDir} numberOfLines={1}>{item.direccion}</Text>
        ) : null}
        {item.lat != null && (
          <View style={styles.coordsBadge}>
            <Ionicons name="location" size={10} color="#7C3AED" />
            <Text style={styles.coordsBadgeTexto}>
              {Number(item.lat).toFixed(3)}, {Number(item.lng).toFixed(3)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.rowAcciones}>
        <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditar(item)}>
          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnAccion, styles.btnDelete]} onPress={() => eliminar(item)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnAtras}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Clientes</Text>
        <View style={styles.headerRight}>
          {adminOrigen === null && (
            <TouchableOpacity style={styles.btnLogout} onPress={() => setUsuario(null)}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnAdd} onPress={abrirCrear}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {!!exito && (
        <View style={styles.exitoBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.exitoTexto}>{exito}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}

      {/* Buscador */}
      <View style={styles.buscadorRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textLight} style={styles.buscadorIcono} />
        <TextInput
          style={styles.buscadorInput}
          placeholder="Buscar por nombre o teléfono…"
          placeholderTextColor={COLORS.textLight}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {!!busqueda && (
          <TouchableOpacity onPress={() => setBusqueda('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={clientes.filter(c => {
          if (!busqueda.trim()) return true;
          const q = busqueda.toLowerCase();
          return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q);
        })}
        keyExtractor={c => String(c.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          clientes.length > 0 ? (
            <Text style={styles.contador}>
              {busqueda.trim()
                ? `${clientes.filter(c => { const q = busqueda.toLowerCase(); return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q); }).length} de ${clientes.length} clientes`
                : `${clientes.length} clientes registrados`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !cargando ? (
            <View style={styles.vacio}>
              <Ionicons name="storefront-outline" size={48} color={COLORS.border} />
              <Text style={styles.vacioTexto}>
                {busqueda.trim() ? 'Sin resultados para esa búsqueda' : 'No hay clientes registrados'}
              </Text>
              {!busqueda && (
                <TouchableOpacity style={styles.btnCrearVacio} onPress={abrirCrear}>
                  <Text style={styles.btnCrearVacioTexto}>Agregar primer cliente</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{editando ? 'Editar cliente' : 'Nuevo cliente'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {formError && (
              <View style={styles.formError}>
                <Text style={styles.formErrorTexto}>{formError}</Text>
              </View>
            )}
            {[
              { key: 'nombre',    label: 'Nombre *',    placeholder: 'Tienda La Esperanza' },
              { key: 'telefono',  label: 'Teléfono',    placeholder: '5555-1234' },
              { key: 'zona',      label: 'Zona',        placeholder: 'Zona 6' },
              { key: 'direccion', label: 'Dirección',   placeholder: '5a Av. 10-20' },
            ].map(f => (
              <View key={f.key} style={styles.campo}>
                <Text style={styles.campoLabel}>{f.label}</Text>
                <TextInput
                  style={styles.campoInput}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            ))}

            {/* Picker de ubicacion para el mapa de ruta */}
            <View style={styles.campo}>
              <Text style={styles.campoLabel}>Ubicacion en mapa</Text>
              <LocationPicker
                lat={form.lat}
                lng={form.lng}
                zona={form.zona}
                onChangeLat={v => setForm(prev => ({ ...prev, lat: v }))}
                onChangeLng={v => setForm(prev => ({ ...prev, lng: v }))}
              />
              {form.lat === '' && (
                <Text style={styles.campoHint}>
                  Sin ubicacion — el mapa usara coordenadas aproximadas de la zona.
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalVisible(false)}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnGuardar, guardando && { opacity: 0.6 }]}
              onPress={guardar}
              disabled={guardando}
            >
              {guardando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnGuardarTexto}>{editando ? 'Guardar cambios' : 'Crear cliente'}</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  btnAtras: { width: 36, alignItems: 'center' },
  titulo: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  btnAdd: {
    backgroundColor: '#7C3AED', width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  errorBanner: { backgroundColor: COLORS.error + '18', padding: 12, margin: 12, borderRadius: 8 },
  errorTexto: { color: COLORS.error, fontSize: 13 },
  buscadorRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  buscadorIcono: { marginRight: 8 },
  buscadorInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 6 },
  lista: { padding: 12, paddingBottom: 40 },
  contador: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  row: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  rowSub: { fontSize: 12, color: COLORS.textLight },
  rowDir: { fontSize: 12, color: COLORS.textLight },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnLogout: { padding: 6 },
  exitoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#6EE7B7',
  },
  exitoTexto: { fontSize: 13, fontWeight: '600', color: '#065F46' },
  coordsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#7C3AED18', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, alignSelf: 'flex-start', marginTop: 4,
  },
  coordsBadgeTexto: { fontSize: 10, color: '#7C3AED', fontWeight: '600' },
  rowAcciones: { flexDirection: 'row', gap: 4 },
  btnAccion: { padding: 8, borderRadius: 8, backgroundColor: COLORS.background },
  btnDelete: { backgroundColor: COLORS.error + '12' },
  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioTexto: { fontSize: 16, color: COLORS.textLight },
  btnCrearVacio: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  btnCrearVacioTexto: { color: '#fff', fontWeight: '700' },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalBody: { padding: 20 },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  formError: { backgroundColor: COLORS.error + '15', borderRadius: 8, padding: 10, marginBottom: 16 },
  formErrorTexto: { color: COLORS.error, fontSize: 13 },
  campo: { marginBottom: 16 },
  campoLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6 },
  campoHint:  { fontSize: 11, color: COLORS.textLight, marginTop: 6, fontStyle: 'italic' },
  campoInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  btnCancelar: {
    flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnCancelarTexto: { fontSize: 15, fontWeight: '600', color: COLORS.textLight },
  btnGuardar: {
    flex: 2, backgroundColor: '#7C3AED', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  btnGuardarTexto: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
