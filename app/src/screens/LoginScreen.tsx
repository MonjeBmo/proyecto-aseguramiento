import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { loginApi } from '../services/apiService';
import { COLORS } from '../constants/colors';

export default function LoginScreen() {
  const { setUsuario } = useApp();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const handleLogin = async () => {
    const emailLower = email.trim().toLowerCase();
    if (!emailLower || !password) {
      setError('Email y contraseña son obligatorios.');
      return;
    }
    if (!RE_EMAIL.test(emailLower)) {
      setError('El correo electrónico no tiene un formato válido.');
      return;
    }
    setCargando(true);
    setError(null);

    try {
      const { usuario } = await loginApi(emailLower, password);
      setUsuario(usuario);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('fetch') || err.message?.includes('network')) {
        setError('No se pudo conectar al servidor. Verifica tu conexión.');
      } else {
        setError(err.message || 'Credenciales incorrectas.');
      }
    } finally {
      setCargando(false);
    }
  };

  const loginRapido = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="cube" size={36} color={COLORS.accent} />
            </View>
            <Text style={styles.titulo}>RutaExpress GT</Text>
            <Text style={styles.subtitulo}>Sistema de distribución mayorista</Text>
          </View>

          {/* Formulario */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Iniciar sesión</Text>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={COLORS.error} />
                <Text style={styles.errorTexto}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="usuario@rutaexpress.gt"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!mostrarPass}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setMostrarPass(p => !p)}>
                <Ionicons name={mostrarPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btnLogin, cargando && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={cargando}
              activeOpacity={0.8}
            >
              {cargando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnLoginTexto}>Ingresar</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Accesos rápidos para demo */}
          <View style={styles.demo}>
            <Text style={styles.demoTitulo}>Accesos rápidos (demo)</Text>
            <View style={styles.demoGrid}>
              {[
                { label: 'Vendedor',    email: 'carlos@rutaexpress.gt',     pass: '1234',       icon: 'storefront-outline' as const },
                { label: 'Repartidor',  email: 'pedro@rutaexpress.gt',      pass: '1234',       icon: 'bicycle-outline' as const },
                { label: 'Supervisor',  email: 'ana@rutaexpress.gt',         pass: 'super1234',  icon: 'shield-checkmark-outline' as const },
                { label: 'Admin',       email: 'superadmin@rutaexpress.gt',  pass: 'super1234',  icon: 'key-outline' as const },
              ].map(u => (
                <TouchableOpacity
                  key={u.email}
                  style={styles.demoBtn}
                  onPress={() => loginRapido(u.email, u.pass)}
                >
                  <Ionicons name={u.icon} size={18} color={COLORS.primary} />
                  <Text style={styles.demoBtnLabel}>{u.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.demoHint}>Toca un acceso rápido para llenar las credenciales</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.dark },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.dark,
    borderWidth: 2, borderColor: COLORS.accent + '55',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  titulo: { fontSize: 26, fontWeight: '800', color: COLORS.textOnDark, letterSpacing: 0.5 },
  subtitulo: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 24, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  cardTitulo: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.error + '15', borderRadius: 8,
    padding: 10, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.error + '33',
  },
  errorTexto: { fontSize: 13, color: COLORS.error, flex: 1 },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, backgroundColor: COLORS.background,
    marginBottom: 16,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  eyeBtn: { padding: 10 },

  btnLogin: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnLoginTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },

  demo: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  demoTitulo: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 12 },
  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  demoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: COLORS.border,
  },
  demoBtnLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  demoHint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 10, textAlign: 'center' },
});
