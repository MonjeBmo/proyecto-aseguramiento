import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { usuariosAdmin, UsuarioAdmin } from '../../services/adminApiService';
import { useApp } from '../../context/AppContext';

const ROLES: Array<'vendedor' | 'supervisor' | 'repartidor'> = ['vendedor', 'supervisor', 'repartidor'];
const ROL_COLOR: Record<string, string> = {
  vendedor:   COLORS.primary,
  supervisor: '#DC2626',
  repartidor: COLORS.accent,
};
const ROL_ICONO: Record<string, any> = {
  vendedor:   'briefcase-outline',
  supervisor: 'shield-checkmark-outline',
  repartidor: 'bicycle-outline',
};

const FORM_VACIO = { nombre: '', email: '', rol: 'vendedor' as const };

export default function UsuariosAdminScreen() {
  const navigation = useNavigation();
  const { setUsuario } = useApp();
  const [usuarios, setUsuarios]   = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando]   = useState<UsuarioAdmin | null>(null);
  const [form, setForm]           = useState<{ nombre: string; email: string; rol: 'vendedor'|'supervisor'|'repartidor' }>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [exito, setExito]         = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await usuariosAdmin.listar();
      setUsuarios(data);
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

  const abrirEditar = (u: UsuarioAdmin) => {
    setEditando(u);
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol });
    setFormError(null);
    setModalVisible(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim() || (!editando && !form.email.trim())) {
      setFormError(editando ? 'El nombre es obligatorio.' : 'Nombre y email son obligatorios.');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      if (editando) {
        const actualizado = await usuariosAdmin.actualizar(editando.id, { nombre: form.nombre.trim(), rol: form.rol });
        setUsuarios(prev => prev.map(u => u.id === editando.id ? { ...u, ...actualizado } : u));
      } else {
        const nuevo = await usuariosAdmin.crear({ nombre: form.nombre.trim(), email: form.email.trim(), rol: form.rol });
        setUsuarios(prev => [...prev, nuevo]);
      }
      setModalVisible(false);
      setExito(true);
      setTimeout(() => setExito(false), 2500);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const renderItem = ({ item }: { item: UsuarioAdmin }) => {
    const color = ROL_COLOR[item.rol] ?? COLORS.textLight;
    const icono = ROL_ICONO[item.rol] ?? 'person-outline';
    return (
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: color + '18' }]}>
          <Ionicons name={icono} size={20} color={color} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowNombre}>{item.nombre}</Text>
          <Text style={styles.rowEmail}>{item.email}</Text>
          <View style={[styles.rolBadge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.rolTexto, { color }]}>{item.rol}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditar(item)}>
          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnAtras}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Usuarios</Text>
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
        data={usuarios}
        keyExtractor={u => String(u.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          usuarios.length > 0
            ? <Text style={styles.contador}>{usuarios.length} usuarios registrados</Text>
            : null
        }
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{editando ? 'Editar usuario' : 'Nuevo usuario'}</Text>
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

            <View style={styles.campo}>
              <Text style={styles.campoLabel}>Nombre *</Text>
              <TextInput
                style={styles.campoInput}
                value={form.nombre}
                onChangeText={v => setForm(p => ({ ...p, nombre: v }))}
                placeholder="Nombre completo"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            {!editando && (
              <View style={styles.campo}>
                <Text style={styles.campoLabel}>Email *</Text>
                <TextInput
                  style={styles.campoInput}
                  value={form.email}
                  onChangeText={v => setForm(p => ({ ...p, email: v }))}
                  placeholder="usuario@rutaexpress.gt"
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            )}

            <View style={styles.campo}>
              <Text style={styles.campoLabel}>Rol</Text>
              <View style={styles.rolesRow}>
                {ROLES.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rolOpt, form.rol === r && { backgroundColor: ROL_COLOR[r], borderColor: ROL_COLOR[r] }]}
                    onPress={() => setForm(p => ({ ...p, rol: r }))}
                  >
                    <Ionicons name={ROL_ICONO[r]} size={16} color={form.rol === r ? '#fff' : COLORS.textLight} />
                    <Text style={[styles.rolOptTexto, form.rol === r && { color: '#fff' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {!editando && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} />
                <Text style={styles.infoTexto}>La contraseña inicial será "1234" (o "admin1234" para supervisores).</Text>
              </View>
            )}
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
                : <Text style={styles.btnGuardarTexto}>{editando ? 'Guardar' : 'Crear usuario'}</Text>
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
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  btnAtras: { width: 36, alignItems: 'center' },
  titulo: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnLogout: { padding: 6 },
  btnAdd: {
    backgroundColor: '#DC2626', width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  exitoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#6EE7B7',
  },
  exitoTexto: { fontSize: 13, fontWeight: '600', color: '#065F46' },
  errorBanner: { backgroundColor: COLORS.error + '18', padding: 12, margin: 12, borderRadius: 8 },
  errorTexto: { color: COLORS.error, fontSize: 13 },
  lista: { padding: 12, paddingBottom: 40 },
  contador: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  row: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  rowEmail: { fontSize: 12, color: COLORS.textLight, marginBottom: 6 },
  rolBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  rolTexto: { fontSize: 11, fontWeight: '700' },
  btnAccion: { padding: 8, borderRadius: 8, backgroundColor: COLORS.background },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
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
  campoInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  rolesRow: { flexDirection: 'row', gap: 8 },
  rolOpt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  rolOptTexto: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.primary + '12', borderRadius: 10, padding: 12,
  },
  infoTexto: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 17 },
  btnCancelar: {
    flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnCancelarTexto: { fontSize: 15, fontWeight: '600', color: COLORS.textLight },
  btnGuardar: {
    flex: 2, backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  btnGuardarTexto: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
