import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { Entrega } from '../data/mockData';
import { obtenerMisEntregas } from '../services/entregasApiService';
import { fechaGuatemala } from '../utils/fechaEntregas';

export function useEntregas() {
  const { usuario, isOnline, fechaEntregas, entregasRevision } = useApp();
  const [datos, setDatos] = useState<Entrega[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const cargarEntregas = useCallback(async () => {
    const version = ++request.current;
    setCargando(true);
    setError(null);
    try {
      if (!usuario || !isOnline) throw new Error('Sin conexión. Conéctate para consultar tus entregas.');
      const data = await obtenerMisEntregas(usuario.id);
      if (version === request.current) setDatos(data);
    } catch (e: any) {
      if (version === request.current) {
        setDatos([]);
        setError(e.message || 'No se pudieron cargar las entregas.');
      }
    } finally {
      if (version === request.current) setCargando(false);
    }
  }, [usuario?.id, isOnline, entregasRevision]);

  useFocusEffect(useCallback(() => {
    cargarEntregas();
    const timer = setInterval(cargarEntregas, 30000);
    return () => { clearInterval(timer); request.current++; };
  }, [cargarEntregas]));

  const entregas = useMemo(() => datos.filter(e => (e.fecha_entrega || fechaGuatemala(e.creado_en)) === fechaEntregas), [datos, fechaEntregas]);
  return { entregas, cargando, error, cargarEntregas };
}
