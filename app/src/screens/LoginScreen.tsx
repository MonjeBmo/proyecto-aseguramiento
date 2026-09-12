import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { MOCK_USUARIOS, Usuario } from '../data/mockData';
import { COLORS } from '../constants/colors';

/**
 * Pantalla de seleccion de usuario.
 * Para el prototipo no hay contrasena — el vendedor simplemente selecciona su nombre.
 * En produccion se reemplaza con email + password + JWT.
 *
 * ISO 25010 — Usabilidad: menos de 2 pasos para ingresar, iconografia clara.
 * ISO 25010 — Adecuacion funcional: control de acceso por rol (solo vendedores en la app).
 */
export default function LoginScreen() {
  const { setUsuario } = useApp();

  const handleSeleccionar = (usuario: Usuario) => {
    setUsuario(usuario);
  };

  const renderUsuario = ({ item }: { item: Usuario }) => (
    <TouchableOpacity
      style={styles.tarjeta}
      onPress={() => handleSeleccionar(item)}
      activeOpacity={0.75}
    >
      <View style={styles.avatar}>
        <Ionicons name="person" size={28} color={COLORS.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre}>{item.nombre}</Text>
        <Text style={styles.rol}>Vendedor de ruta</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Ionicons name="cube" size={32} color={COLORS.accent} />
          <Text style={styles.logoText}>RutaExpress GT</Text>
        </View>
        <Text style={styles.subtitulo}>Selecciona tu perfil para continuar</Text>
      </View>

      {/* Lista de vendedores */}
      <View style={styles.cuerpo}>
        <Text style={styles.seccionTitulo}>Vendedores activos</Text>
        <FlatList
          data={MOCK_USUARIOS}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUsuario}
          contentContainerStyle={styles.lista}
          ItemSeparatorComponent={() => <View style={styles.separador} />}
        />
      </View>

      <Text style={styles.version}>Prototipo v1.0 — Sprint 1</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textOnDark,
    letterSpacing: 0.5,
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  cuerpo: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
  },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  lista: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tarjeta: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  rol: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  separador: {
    height: 10,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
});
