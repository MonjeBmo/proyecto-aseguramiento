import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useApp } from '../context/AppContext';
import { fechaGuatemala, fechaValida, moverFecha } from '../utils/fechaEntregas';
import { COLORS } from '../constants/colors';

export default function FiltroFechaEntregas() {
  const { fechaEntregas, setFechaEntregas } = useApp();
  const [texto, setTexto] = useState(fechaEntregas);
  useEffect(() => setTexto(fechaEntregas), [fechaEntregas]);
  const cambiar = (value: string) => {
    setTexto(value);
    if (fechaValida(value)) setFechaEntregas(value);
  };
  const boton = (label: string, accion: () => void, accesible = label) => (
    <TouchableOpacity accessibilityLabel={accesible} onPress={accion} style={{ padding: 12, backgroundColor: COLORS.primary + '15', borderRadius: 8 }}>
      <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ padding: 12, gap: 8, backgroundColor: COLORS.surface }}>
      <Text style={{ fontSize: 12, color: COLORS.textLight }}>Fecha de entrega · Guatemala</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {boton('‹', () => setFechaEntregas(moverFecha(fechaEntregas, -1)), 'Día anterior')}
        <View style={{ flex: 1 }}>
          {Platform.OS === 'web' ? (
            <input aria-label="Fecha de los pedidos" type="date" value={texto} onChange={e => cambiar(e.target.value)}
              style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, padding: 10, border: '1px solid ' + COLORS.border, borderRadius: 8, fontSize: 15, color: COLORS.text }} />
          ) : (
            <TextInput accessibilityLabel="Fecha de los pedidos" value={texto} onChangeText={cambiar} placeholder="AAAA-MM-DD"
              style={{ padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, color: COLORS.text }} />
          )}
        </View>
        {boton('›', () => setFechaEntregas(moverFecha(fechaEntregas, 1)), 'Día siguiente')}
        {boton('Hoy', () => setFechaEntregas(fechaGuatemala()))}
      </View>
      {!fechaValida(texto) && <Text style={{ color: COLORS.error }}>Ingresa una fecha válida (AAAA-MM-DD).</Text>}
    </View>
  );
}
