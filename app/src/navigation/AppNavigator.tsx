import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

export type RootStackParamList = {
  // Compartida
  Login: undefined;

  // Vendedor
  CapturaPedido: undefined;
  Catalogo: undefined;
  Confirmacion: { pedidoId: number; estaOnline: boolean };

  // Repartidor
  RutaDiaria: undefined;
  DetalleEntrega: { entrega: Entrega };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { usuario } = useApp();

  return (
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
            <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} />
          </>
        ) : usuario.rol === 'repartidor' ? (
          <>
            <Stack.Screen name="RutaDiaria" component={RutaDiariaScreen} />
            <Stack.Screen name="DetalleEntrega" component={DetalleEntregaScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
