import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { proveedoresAdmin, Proveedor } from '../../services/adminApiService';
import { COLORS } from '../../constants/colors';
import { normalizarBusqueda } from '../../utils/busqueda';

const vacio = { nombre: '', nit: '', telefono: '', email: '', direccion: '' };
export default function ProveedoresAdminScreen() {
  const navigation = useNavigation();
  const [lista, setLista] = useState<Proveedor[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [eliminando, setEliminando] = useState<Proveedor | null>(null);
  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try { setLista(await proveedoresAdmin.listar()); } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  const abrir = (p?: Proveedor) => { setEditando(p?.id ?? null); setForm(p ? { nombre:p.nombre,nit:p.nit,telefono:p.telefono,email:p.email,direccion:p.direccion } : vacio); setErrorForm(''); setAbierto(true); };
  const guardar = async () => {
    if (guardando) return;
    if (!form.nombre.trim()) { setErrorForm('El nombre es obligatorio.'); return; }
    setGuardando(true); setErrorForm('');
    try {
      const p = editando ? await proveedoresAdmin.actualizar(editando, form) : await proveedoresAdmin.crear(form);
      setLista(prev => [...prev.filter(x => x.id !== p.id),p].sort((a,b)=>a.nombre.localeCompare(b.nombre)));
      setAbierto(false);
    } catch(e: any) { setErrorForm(e.message); } finally { setGuardando(false); }
  };
  const eliminar = async () => {
    if (!eliminando || guardando) return;
    setGuardando(true);
    try { await proveedoresAdmin.eliminar(eliminando.id); setLista(prev=>prev.filter(p=>p.id!==eliminando.id)); setEliminando(null); }
    catch(e: any) { setErrorForm(e.message); } finally { setGuardando(false); }
  };
  return <SafeAreaView style={s.safe}>
    <View style={s.header}><TouchableOpacity onPress={()=>navigation.goBack()}><Text style={s.link}>← Volver</Text></TouchableOpacity><Text style={s.title}>Proveedores</Text><TouchableOpacity onPress={()=>abrir()}><Text style={s.link}>＋ Nuevo</Text></TouchableOpacity></View>
    <TextInput style={s.input} placeholder="Buscar proveedor, NIT o teléfono…" value={busqueda} onChangeText={setBusqueda} />
    {!!error && <Text style={s.error}>{error}</Text>}
    <FlatList data={lista.filter(p=>normalizarBusqueda(`${p.nombre} ${p.nit} ${p.telefono}`).includes(normalizarBusqueda(busqueda)))} keyExtractor={p=>String(p.id)} refreshing={cargando} onRefresh={cargar}
      ListEmptyComponent={!cargando ? <Text style={s.text}>No hay proveedores para mostrar.</Text> : null}
      renderItem={({item:p})=><View style={s.card}><Text style={s.title}>{p.nombre}</Text><Text style={s.text}>NIT: {p.nit || '—'} · Teléfono: {p.telefono || '—'}</Text><Text style={s.text}>{p.email}</Text><Text style={s.text}>{p.direccion}</Text><View style={s.header}><TouchableOpacity onPress={()=>abrir(p)}><Text style={s.link}>Editar</Text></TouchableOpacity><TouchableOpacity onPress={()=>{setErrorForm('');setEliminando(p);}}><Text style={s.error}>Eliminar</Text></TouchableOpacity></View></View>} />
    <Modal visible={abierto} animationType="slide" onRequestClose={()=>{if(!guardando)setAbierto(false);}}><SafeAreaView style={s.safe}>
      <View style={s.header}><Text style={s.title}>{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</Text><TouchableOpacity disabled={guardando} onPress={()=>setAbierto(false)}><Text style={s.link}>Cerrar</Text></TouchableOpacity></View>
      <ScrollView>{(['nombre','nit','telefono','email','direccion'] as const).map(k=><View key={k}><Text style={s.text}>{({nombre:'Nombre *',nit:'NIT',telefono:'Teléfono',email:'Correo',direccion:'Dirección'})[k]}</Text><TextInput style={s.input} value={form[k]} onChangeText={v=>setForm(p=>({...p,[k]:v}))} /></View>)}{!!errorForm && <Text style={s.error}>{errorForm}</Text>}<TouchableOpacity style={s.button} disabled={guardando} onPress={guardar}><Text style={s.white}>{guardando?'Guardando…':'Guardar proveedor'}</Text></TouchableOpacity></ScrollView>
    </SafeAreaView></Modal>
    <Modal visible={!!eliminando} transparent onRequestClose={()=>{if(!guardando)setEliminando(null);}}><View style={s.overlay}><View style={s.card}><Text style={s.title}>¿Eliminar {eliminando?.nombre}?</Text><Text style={s.text}>Los proveedores con lotes asociados no pueden eliminarse.</Text>{!!errorForm && <Text style={s.error}>{errorForm}</Text>}<View style={s.header}><TouchableOpacity disabled={guardando} onPress={()=>setEliminando(null)}><Text style={s.link}>Cancelar</Text></TouchableOpacity><TouchableOpacity disabled={guardando} onPress={eliminar}><Text style={s.error}>{guardando?'Eliminando…':'Eliminar'}</Text></TouchableOpacity></View></View></View></Modal>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:COLORS.background},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,gap:12},title:{fontSize:17,fontWeight:'700',color:COLORS.text},text:{color:COLORS.textLight,marginHorizontal:16,marginVertical:6},link:{color:COLORS.primary,fontWeight:'600'},input:{padding:12,margin:12,borderWidth:1,borderColor:COLORS.border,borderRadius:10,backgroundColor:COLORS.surface,color:COLORS.text},card:{backgroundColor:COLORS.surface,padding:16,margin:12,borderRadius:12,borderWidth:1,borderColor:COLORS.border},error:{color:COLORS.error,padding:8},button:{backgroundColor:COLORS.primary,padding:16,margin:12,borderRadius:10},white:{color:'#fff',fontWeight:'700',textAlign:'center'},overlay:{flex:1,justifyContent:'center',backgroundColor:'#0008'}});
