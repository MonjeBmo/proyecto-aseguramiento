import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { useApp } from '../../context/AppContext';
import { COLORS } from '../../constants/colors';
import { productosAdmin, clientesAdmin, pedidosAdmin, notificacionesAdmin } from '../../services/adminApiService';
import OfflineBanner from '../../components/OfflineBanner';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AdminDashboard'>;

type Stats = { productos: number; clientes: number; pedidos: number; notificaciones: number };

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const { usuario, setUsuario, adminOrigen } = useApp();
  const [stats, setStats] = useState<Stats>({ productos: 0, clientes: 0, pedidos: 0, notificaciones: 0 });

  useEffect(() => {
    Promise.allSettled([
      productosAdmin.listar(),
      clientesAdmin.listar(),
      pedidosAdmin.listar(),
      notificacionesAdmin.listar(),
    ]).then(([p, c, ped, n]) => {
      setStats({
        productos:      p.status === 'fulfilled' ? p.value.length : 0,
        clientes:       c.status === 'fulfilled' ? c.value.length : 0,
        pedidos:        ped.status === 'fulfilled' ? ped.value.length : 0,
        notificaciones: n.status === 'fulfilled' ? n.value.length : 0,
      });
    });
  }, []);

  const esAdmin = usuario?.rol === 'admin';

  const modulos = [
    { titulo: 'Proveedores', sub: 'Gestión de proveedores', icono: 'business-outline' as const, color: '#059669', ruta: 'ProveedoresAdmin' as const },
    { titulo: 'Productos',      sub: `${stats.productos} registros`,      icono: 'cube-outline' as const,            color: COLORS.primary, ruta: 'ProductosAdmin' as const },
    { titulo: 'Clientes',       sub: `${stats.clientes} registros`,       icono: 'storefront-outline' as const,      color: '#7C3AED', ruta: 'ClientesAdmin' as const },
    { titulo: 'Pedidos',        sub: `${stats.pedidos} pedidos`,          icono: 'receipt-outline' as const,         color: COLORS.accent, ruta: 'PedidosAdmin' as const },
    { titulo: 'Notificaciones', sub: `${stats.notificaciones} enviadas`,  icono: 'chatbubbles-outline' as const,     color: '#059669', ruta: 'Notificaciones' as const },
    { titulo: 'Usuarios',       sub: 'Gestión de equipo',                 icono: 'people-outline' as const,          color: '#DC2626', ruta: 'UsuariosAdmin' as const },
    ...(esAdmin ? [{ titulo: 'Bitácora', sub: 'Auditoría de peticiones', icono: 'document-text-outline' as const, color: '#7C3AED', ruta: 'BitacoraAdmin' as const }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.bienvenida}>{esAdmin ? 'Panel de Administración' : 'Panel de Supervisión'}</Text>
          <Text style={styles.nombre}>{usuario?.nombre}</Text>
        </View>
        {adminOrigen === null && (
          <TouchableOpacity style={styles.btnSalir} onPress={() => setUsuario(null)}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.seccion}>Módulos disponibles</Text>

        <View style={styles.grid}>
          {modulos.map((m) => (
            <TouchableOpacity
              key={m.ruta}
              style={[styles.card, { borderLeftColor: m.color }]}
              onPress={() => navigation.navigate(m.ruta as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.cardIcon, { backgroundColor: m.color + '18' }]}>
                <Ionicons name={m.icono} size={26} color={m.color} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitulo}>{m.titulo}</Text>
                <Text style={styles.cardSub}>{m.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
          <Text style={styles.infoTexto}>
            Los datos se sincronizan en tiempo real con la base de datos PostgreSQL.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    backgroundColor: COLORS.dark,
  },
  bienvenida: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '600', letterSpacing: 1 },
  nombre: { fontSize: 20, fontWeight: '800', color: COLORS.textOnDark, marginTop: 2 },
  btnSalir: { padding: 8 },

  contenido: { padding: 16, paddingBottom: 40 },
  seccion: {
    fontSize: 12, fontWeight: '700', color: COLORS.textLight,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, marginTop: 4,
  },

  grid: { gap: 10 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardTitulo: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.primary + '12', borderRadius: 10, padding: 12,
    marginTop: 20, borderWidth: 1, borderColor: COLORS.primary + '25',
  },
  infoTexto: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 17 },
});
