import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useApp } from '../context/AppContext';
import LoginScreen from '../screens/LoginScreen';
import CapturaPedidoScreen from '../screens/CapturaPedidoScreen';
import CatalogoScreen from '../screens/CatalogoScreen';
import ConfirmacionScreen from '../screens/ConfirmacionScreen';
import { COLORS } from '../constants/colors';

export type RootStackParamList = {
  Login: undefined;
  CapturaPedido: undefined;
  Catalogo: undefined;
  Confirmacion: { pedidoId: number; estaOnline: boolean };
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
          // Usuario no autenticado
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Usuario autenticado como vendedor
          <>
            <Stack.Screen name="CapturaPedido" component={CapturaPedidoScreen} />
            <Stack.Screen name="Catalogo" component={CatalogoScreen} />
            <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
