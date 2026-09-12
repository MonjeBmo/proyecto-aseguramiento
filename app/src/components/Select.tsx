import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export interface SelectOption {
  label: string;
  value: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  style?: object;
}

export default function Select({ value, onChange, options, placeholder = 'Seleccionar…', style }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerTexto, !selected && styles.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitulo}>Seleccionar opción</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={o => o.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.opcion, item.value === value && styles.opcionActiva]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={[styles.opcionTexto, item.value === value && styles.opcionTextoActivo]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  triggerTexto: { fontSize: 15, color: COLORS.text, flex: 1 },
  placeholder: { color: COLORS.textLight },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '60%', paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sheetTitulo: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  opcion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  opcionActiva: { backgroundColor: COLORS.primary + '0D' },
  opcionTexto: { fontSize: 15, color: COLORS.text },
  opcionTextoActivo: { color: COLORS.primary, fontWeight: '700' },
  sep: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20 },
});
