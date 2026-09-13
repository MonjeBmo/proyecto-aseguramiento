import ProveedoresAdminScreen from '../screens/admin/ProveedoresAdminScreen';
import BitacoraAdminScreen from '../screens/admin/BitacoraAdminScreen';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { Entrega } from '../data/mockData';
import { COLORS } from '../constants/colors';

// Vendedor
import LoginScreen from '../screens/LoginScreen';
import CapturaPedidoScreen from '../screens/CapturaPedidoScreen';
import CatalogoScreen from '../screens/CatalogoScreen';
import ConfirmacionScreen from '../screens/ConfirmacionScreen';

// Repartidor
import RutaDiariaScreen from '../screens/RutaDiariaScreen';
import DetalleEntregaScreen from '../screens/DetalleEntregaScreen';
import MapaRutaScreen from '../screens/MapaRutaScreen';

// Supervisor / Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ProductosAdminScreen from '../screens/admin/ProductosAdminScreen';
import ClientesAdminScreen from '../screens/admin/ClientesAdminScreen';
import PedidosAdminScreen from '../screens/admin/PedidosAdminScreen';
import NotificacionesScreen from '../screens/admin/NotificacionesScreen';
import UsuariosAdminScreen from '../screens/admin/UsuariosAdminScreen';

export type RootStackParamList = {
  Login: undefined;

  // Vendedor
  CapturaPedido: undefined;
  Catalogo: undefined;
  MisPedidos: undefined;
  Confirmacion: { pedidoId: number; estaOnline: boolean };

  // Repartidor
  RutaDiaria: undefined;
  DetalleEntrega: { entrega: Entrega };
  MapaRuta: undefined;

  // Supervisor / Admin
  AdminDashboard: undefined;
  ProductosAdmin: undefined;
  ProveedoresAdmin: undefined;
  ClientesAdmin: undefined;
  PedidosAdmin: undefined;
  Notificaciones: undefined;
  UsuariosAdmin: undefined;
  BitacoraAdmin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { usuario, adminOrigen, setUsuario, setAdminOrigen } = useApp();

  const salirImpersonacion = () => {
    setUsuario(adminOrigen);
    setAdminOrigen(null);
  };

  const esSupervisorOAdmin = usuario?.rol === 'supervisor' || usuario?.rol === 'admin';

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
            animation: 'slide_from_right',
          }}
        >
          {usuario === null ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : usuario.rol === 'vendedor' ? (
            <>
              <Stack.Screen name="CapturaPedido" component={CapturaPedidoScreen} />
              <Stack.Screen name="Catalogo" component={CatalogoScreen} />
              <Stack.Screen name="MisPedidos" component={PedidosAdminScreen} />
              <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} />
            </>
          ) : usuario.rol === 'repartidor' ? (
            <>
              <Stack.Screen name="RutaDiaria" component={RutaDiariaScreen} />
              <Stack.Screen name="DetalleEntrega" component={DetalleEntregaScreen} />
              <Stack.Screen name="MapaRuta" component={MapaRutaScreen} />
            </>
          ) : esSupervisorOAdmin ? (
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
              <Stack.Screen name="ProveedoresAdmin" component={ProveedoresAdminScreen} />
              <Stack.Screen name="ProductosAdmin" component={ProductosAdminScreen} />
              <Stack.Screen name="ClientesAdmin" component={ClientesAdminScreen} />
              <Stack.Screen name="PedidosAdmin" component={PedidosAdminScreen} />
              <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />
              <Stack.Screen name="UsuariosAdmin" component={UsuariosAdminScreen} />
              <Stack.Screen name="BitacoraAdmin" component={BitacoraAdminScreen} />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Banner de impersonación — visible solo cuando el admin está viendo a otro usuario */}
      {adminOrigen !== null && (
        <View style={navStyles.impersonacionBanner}>
          <Ionicons name="eye-outline" size={14} color="#fff" />
          <Text style={navStyles.impersonacionTexto}>
            Vista de: <Text style={{ fontWeight: '800' }}>{usuario?.nombre}</Text>
          </Text>
          <TouchableOpacity style={navStyles.impersonacionBtn} onPress={salirImpersonacion}>
            <Ionicons name="close-circle" size={16} color="#fff" />
            <Text style={navStyles.impersonacionBtnTexto}>Salir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const navStyles = StyleSheet.create({
  impersonacionBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#DC2626',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  impersonacionTexto: { flex: 1, fontSize: 13, color: '#fff' },
  impersonacionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8 },
  impersonacionBtnTexto: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
