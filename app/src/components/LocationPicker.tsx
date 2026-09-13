// Fallback nativo: inputs de texto para lat/lng.
// Metro usa LocationPicker.web.tsx en web.
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface Props {
  zona?: string;
  lat: string;
  lng: string;
  onChangeLat: (v: string) => void;
  onChangeLng: (v: string) => void;
}

export default function LocationPicker({ lat, lng, onChangeLat, onChangeLng }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.campo, { flex: 1 }]}>
        <Text style={styles.label}>Latitud</Text>
        <TextInput
          style={styles.input}
          value={lat}
          onChangeText={onChangeLat}
          placeholder="14.6434"
          placeholderTextColor={COLORS.textLight}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={[styles.campo, { flex: 1 }]}>
        <Text style={styles.label}>Longitud</Text>
        <TextInput
          style={styles.input}
          value={lng}
          onChangeText={onChangeLng}
          placeholder="-90.5132"
          placeholderTextColor={COLORS.textLight}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 10 },
  campo: {},
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
});
