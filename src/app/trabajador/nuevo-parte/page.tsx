'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface ObraInfo {
  obra_id: string;
  nombre_obra: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  porcentaje_avance?: number;
  estado_obra?: string;
}

interface Comment {
  id: string;
  obra_id: string;
  daily_log_id?: string | null;
  autor: string;
  contenido: string;
  created_at: string;
}

interface Budget {
  id: string;
  titulo: string;
  monto_total: number;
  monto_pagado: number;
  notificacion_pago?: number;
  mensaje_pago?: string;
  es_extra: boolean;
  comprobante_url?: string;
}

interface PaymentLog {
  id: string;
  monto: number;
  concepto: string;
  registrado_por: string;
  created_at: string;
}

interface Fase {
  id: string;
  titulo: string;
  completada: boolean;
}

export default function NuevoPartePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [nombreTrabajador, setNombreTrabajador] = useState<string>('');
  const [misObras, setMisObras] = useState<ObraInfo[]>([]);
  const [selectedObraId, setSelectedObraId] = useState('');
  const [nuevaObraNombre, setNuevaObraNombre] = useState('');
  const [fechaInicioInput, setFechaInicioInput] = useState('');
  const [fechaFinInput, setFechaFinInput] = useState('');
  const [porcentajeInput, setPorcentajeInput] = useState(0);
  const [estadoObraInput, setEstadoObraInput] = useState('En Progreso');

  const [esAntesInput, setEsAntesInput] = useState(false);
  const [climaInfo, setClimaInfo] = useState<{ temp: number; estado: string } | null>(null);

  // Modal QR
  const [mostrarQR, setMostrarQR] = useState(false);

  const [fases, setFases] = useState<Fase[]>([
    { id: '1', titulo: 'Demolición y Desescombro', completada: false },
    { id: '2', titulo: 'Electricidad y Fontanería', completada: false },
    { id: '3', titulo: 'Alicatado y Suelos', completada: false },
    { id: '4', titulo: 'Pintura y Acabados', completada: false },
  ]);

  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const [comentarios, setComentarios] = useState<Comment[]>([]);
  const [nuevoComentarioTrabajador, setNuevoComentarioTrabajador] = useState('');

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoTotal, setNuevoTotal] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [esExtra, setEsExtra] = useState(false);

  useEffect(() => {
    async function inicializarTrabajador() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      
      const nombre = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Trabajador';
      setNombreTrabajador(nombre);

      obtenerClima();

      const { data, error } = await supabase
        .from('daily_logs')
        .select('obra_id, nombre_obra, fecha_inicio, fecha_fin, porcentaje_avance, estado_obra, fases, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapaObras = new Map<string, ObraInfo>();
        data.forEach((item) => {
          if (item.obra_id && !mapaObras.has(item.obra_id)) {
            mapaObras.set(item.obra_id, {
              obra_id: item.obra_id,
              nombre_obra: item.nombre_obra || item.obra_id,
              fecha_inicio: item.fecha_inicio || item.created_at,
              fecha_fin: item.fecha_fin || '',
              porcentaje_avance: item.porcentaje_avance || 0,
              estado_obra: item.estado_obra || 'En Progreso',
            });
          }
        });

        const listaObras: ObraInfo[] = Array.from(mapaObras.values());

        setMisObras(listaObras);
        if (listaObras.length > 0) {
          setSelectedObraId(listaObras[0].obra_id);
          setPorcentajeInput(listaObras[0].porcentaje_avance || 0);
          setFechaFinInput(listaObras[0].fecha_fin || '');
          setEstadoObraInput(listaObras[0].estado_obra || 'En Progreso');
        } else {
          setSelectedObraId('nueva');
        }
      } else {
        setSelectedObraId('nueva');
      }

      setLoadingPage(false);
    }

    inicializarTrabajador();
  }, [router]);

  const obtenerClima = async () => {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=39.47&longitude=-0.37&current_weather=true');
      const data = await res.json();
      if (data.current_weather) {
        setClimaInfo({
          temp: Math.round(data.current_weather.temperature),
          estado: data.current_weather.weathercode <= 3 ? '☀️ Despejado' : '🌧️ Lluvia / Nublado',
        });
      }
    } catch (e) {
      console.error('Error clima:', e);
    }
  };

  useEffect(() => {
    if (!selectedObraId || selectedObraId === 'nueva') {
      setComentarios([]);
      setBudgets([]);
      setPaymentLogs([]);
      return;
    }

    const obraActual = misObras.find((o) => o.obra_id === selectedObraId);
    if (obraActual) {
      setPorcentajeInput(obraActual.porcentaje_avance || 0);
      setFechaFinInput(obraActual.fecha_fin || '');
      setEstadoObraInput(obraActual.estado_obra || 'En Progreso');
    }

    async function cargarDatosObra() {
      const { data: dataComments } = await supabase
        .from('comments')
        .select('*')
        .eq('obra_id', selectedObraId)
        .order('created_at', { ascending: true });

      if (dataComments) setComentarios(dataComments);

      const { data: dataBudgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('obra_id', selectedObraId)
        .order('created_at', { ascending: true });

      if (dataBudgets) setBudgets(dataBudgets);

      const { data: dataPayments } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('obra_id', selectedObraId)
        .order('created_at', { ascending: false });

      if (dataPayments) setPaymentLogs(dataPayments);
    }

    cargarDatosObra();
  }, [selectedObraId]);

  const toggleFase = (id: string) => {
    setFases(fases.map((f) => (f.id === id ? { ...f, completada: !f.completada } : f)));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const clienteUrl = typeof window !== 'undefined' && selectedObraId && selectedObraId !== 'nueva'
    ? `${window.location.origin}/cliente/obra/${selectedObraId}`
    : '';

  const qrApiUrl = clienteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(clienteUrl)}`
    : '';

  const copiarEnlaceCliente = () => {
    if (!clienteUrl) return;
    navigator.clipboard.writeText(clienteUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const obraSeleccionada = misObras.find((o) => o.obra_id === selectedObraId);

  const calcularDiasRestantes = (fechaFinStr?: string) => {
    if (!fechaFinStr) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFinStr);
    fin.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diff > 0) {
      return { texto: `⏳ Restan ${diff} día(s)`, tipo: 'normal' };
    } else if (diff === 0) {
      return { texto: '🎯 Termina hoy', tipo: 'hoy' };
    } else {
      return { texto: `⚠️ ${Math.abs(diff)} día(s) de atraso`, tipo: 'retraso' };
    }
  };

  const diasInfo = calcularDiasRestantes(fechaFinInput || obraSeleccionada?.fecha_fin);

  const handleAprobarNotificacionPago = async (budget: Budget) => {
    if (!budget.notificacion_pago) return;

    const montoAprobado = Number(budget.notificacion_pago);
    const nuevoTotalPagado = Number(budget.monto_pagado) + montoAprobado;

    const { error: err1 } = await supabase
      .from('budgets')
      .update({
        monto_pagado: nuevoTotalPagado,
        notificacion_pago: 0.00,
        mensaje_pago: null,
      })
      .eq('id', budget.id);

    const { error: err2 } = await supabase.from('payment_logs').insert([
      {
        obra_id: selectedObraId,
        budget_id: budget.id,
        monto: montoAprobado,
        concepto: budget.mensaje_pago || `Pago a ${budget.titulo}`,
        registrado_por: nombreTrabajador,
      },
    ]);

    if (!err1 && !err2) {
      alert('Pago verificado y registrado.');
      recargarPagosYPresupuestos();
    }
  };

  const recargarPagosYPresupuestos = async () => {
    const { data: bData } = await supabase.from('budgets').select('*').eq('obra_id', selectedObraId);
    if (bData) setBudgets(bData);

    const { data: pData } = await supabase.from('payment_logs').select('*').eq('obra_id', selectedObraId).order('created_at', { ascending: false });
    if (pData) setPaymentLogs(pData);
  };

  const handleCrearPresupuesto = async () => {
    if (!nuevoTitulo.trim() || !nuevoTotal || !selectedObraId || selectedObraId === 'nueva') return;

    setSubiendoComprobante(true);
    let finalComprobanteUrl: string | null = null;

    if (comprobanteFile) {
      const fileExt = comprobanteFile.name.split('.').pop();
      const fileName = `factura-${Date.now()}.${fileExt}`;
      const filePath = `${selectedObraId}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('obras-media')
        .upload(filePath, comprobanteFile);

      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from('obras-media')
          .getPublicUrl(filePath);

        finalComprobanteUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabase.from('budgets').insert([
      {
        obra_id: selectedObraId,
        titulo: nuevoTitulo.trim(),
        monto_total: parseFloat(nuevoTotal),
        monto_pagado: 0,
        es_extra: esExtra,
        comprobante_url: finalComprobanteUrl,
      },
    ]);

    setSubiendoComprobante(false);

    if (!error) {
      setNuevoTitulo('');
      setNuevoTotal('');
      setComprobanteFile(null);
      setEsExtra(false);
      recargarPagosYPresupuestos();
    }
  };

  const handleEnviarComentario = async () => {
    if (!nuevoComentarioTrabajador.trim() || !selectedObraId || selectedObraId === 'nueva') return;

    const { error } = await supabase.from('comments').insert([
      {
        obra_id: selectedObraId,
        daily_log_id: null,
        autor: nombreTrabajador,
        contenido: nuevoComentarioTrabajador.trim(),
      },
    ]);

    if (!error) {
      setNuevoComentarioTrabajador('');
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('obra_id', selectedObraId)
        .order('created_at', { ascending: true });
      if (data) setComentarios(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        alert('Debes estar autenticado.');
        router.push('/login');
        return;
      }

      let finalObraId = selectedObraId;
      let finalNombreObra = '';

      if (selectedObraId === 'nueva') {
        if (!nuevaObraNombre.trim()) {
          alert('Indica un nombre para la reforma.');
          setLoading(false);
          return;
        }
        finalObraId = crypto.randomUUID();
        finalNombreObra = nuevaObraNombre.trim();
      } else {
        const obraExistente = misObras.find((o) => o.obra_id === selectedObraId);
        finalNombreObra = obraExistente ? obraExistente.nombre_obra : selectedObraId;
      }

      const photoUrls: string[] = [];

      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
          const filePath = `${finalObraId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('obras-media')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('obras-media')
            .getPublicUrl(filePath);

          photoUrls.push(publicUrlData.publicUrl);
        }
      }

      const fechaFinalInicio = fechaInicioInput || obraSeleccionada?.fecha_inicio || new Date().toISOString().split('T')[0];

      const { error: insertError } = await supabase.from('daily_logs').insert([
        {
          obra_id: finalObraId,
          nombre_obra: finalNombreObra,
          room_name: roomName,
          description: description,
          photos_urls: photoUrls,
          user_id: userId,
          fecha_inicio: fechaFinalInicio,
          fecha_fin: fechaFinInput || null,
          porcentaje_avance: porcentajeInput,
          estado_obra: estadoObraInput,
          fases: fases,
          es_antes: esAntesInput,
        },
      ]);

      if (insertError) throw insertError;

      alert('Parte publicado correctamente');

      const actualizadas = misObras.map((o) =>
        o.obra_id === finalObraId
          ? { ...o, fecha_fin: fechaFinInput, porcentaje_avance: porcentajeInput, estado_obra: estadoObraInput }
          : o
      );

      if (!misObras.some((o) => o.obra_id === finalObraId)) {
        actualizadas.push({
          obra_id: finalObraId,
          nombre_obra: finalNombreObra,
          fecha_inicio: fechaFinalInicio,
          fecha_fin: fechaFinInput,
          porcentaje_avance: porcentajeInput,
          estado_obra: estadoObraInput,
        });
      }

      setMisObras(actualizadas);
      setSelectedObraId(finalObraId);
      setNuevaObraNombre('');
      setRoomName('');
      setDescription('');
      setFiles(null);
      setEsAntesInput(false);
    } catch (error: any) {
      alert('Error al guardar el parte: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-sm">Cargando panel de gestión...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      
      {/* CABECERA CON SELECTOR GLOBAL DE OBRA */}
      <header className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
              👷
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Panel Del Trabajador</h1>
                <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-2.5 py-0.5 rounded-full capitalize">
                  {nombreTrabajador}
                </span>

                {climaInfo && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-bold">
                    {climaInfo.estado} ({climaInfo.temp}°C)
                  </span>
                )}

                {diasInfo && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    diasInfo.tipo === 'retraso'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {diasInfo.texto}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Control de obras, finanzas y reportes en tiempo real</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* SELECTOR GLOBAL DE OBRA */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 px-3 rounded-xl">
              <span className="text-xs font-bold text-slate-400 shrink-0">Obra Activa:</span>
              <select
                value={selectedObraId}
                onChange={(e) => setSelectedObraId(e.target.value)}
                className="bg-transparent text-xs font-bold text-blue-400 focus:outline-none cursor-pointer capitalize"
              >
                {misObras.map((obra) => (
                  <option key={obra.obra_id} value={obra.obra_id} className="bg-slate-900 text-white">
                    {obra.nombre_obra}
                  </option>
                ))}
                <option value="nueva" className="bg-slate-900 text-emerald-400">+ Registrar Nueva Reforma...</option>
              </select>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>

        {/* BARRA DE PROGRESO */}
        {selectedObraId && selectedObraId !== 'nueva' && (
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Progreso General De La Reforma</span>
              <span className="font-extrabold text-emerald-400 font-mono">{obraSeleccionada?.porcentaje_avance || 0}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${obraSeleccionada?.porcentaje_avance || 0}%` }}
              ></div>
            </div>
          </div>
        )}
      </header>

      {/* ENLACE PRIVADO CLIENTE Y BOTÓN QR */}
      {clienteUrl && (
        <section className="bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-slate-900/80 border border-blue-500/30 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              🔗
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-400">Enlace Privado Para El Cliente</span>
              <p className="text-xs text-slate-300 font-mono truncate">{clienteUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarQR(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
            >
              📱 Ver Código QR
            </button>
            <button
              onClick={copiarEnlaceCliente}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-blue-600/20 shrink-0"
            >
              {copiado ? '✓ ¡Enlace Copiado!' : 'Copiar Enlace'}
            </button>
          </div>
        </section>
      )}

      {/* MODAL CÓDIGO QR */}
      {mostrarQR && (
        <div
          onClick={() => setMostrarQR(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl text-center space-y-4 max-w-xs w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white">Escanea El Enlace De La Reforma</h3>
            <div className="p-3 bg-white rounded-xl inline-block shadow-inner">
              <img src={qrApiUrl} alt="Código QR Obra" className="w-48 h-48 mx-auto" />
            </div>
            <p className="text-[11px] text-slate-400">El cliente puede escanear este código directamente desde su móvil.</p>
            <button
              onClick={() => setMostrarQR(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* GRILLA PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-5 space-y-6">
          {selectedObraId && selectedObraId !== 'nueva' && (
            <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  💰 Presupuestos Y Cobros
                </h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  {budgets.length} Registro(s)
                </span>
              </div>

              <div className="space-y-3">
                {budgets.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No hay presupuestos asignados a esta faena.</p>
                ) : (
                  budgets.map((b) => (
                    <div key={b.id} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-xs text-slate-200 capitalize">
                          {b.titulo} {b.es_extra && <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold ml-1">EXTRA</span>}
                        </span>
                        <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                          {Number(b.monto_total).toFixed(2)} €
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="bg-emerald-950/30 border border-emerald-900/40 p-2 rounded-lg text-center">
                          <span className="block text-[9px] text-emerald-400/80 font-bold uppercase">Pagado</span>
                          <span className="font-bold text-emerald-400">{Number(b.monto_pagado).toFixed(2)} €</span>
                        </div>
                        <div className="bg-rose-950/30 border border-rose-900/40 p-2 rounded-lg text-center">
                          <span className="block text-[9px] text-rose-400/80 font-bold uppercase">Pendiente</span>
                          <span className="font-bold text-rose-400">{(Number(b.monto_total) - Number(b.monto_pagado)).toFixed(2)} €</span>
                        </div>
                      </div>

                      {b.notificacion_pago && b.notificacion_pago > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-2 mt-2">
                          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                            🔔 Cliente notifica entrega: {Number(b.notificacion_pago).toFixed(2)} €
                          </div>
                          {b.mensaje_pago && <p className="text-[11px] text-slate-300 italic">"{b.mensaje_pago}"</p>}
                          <button
                            onClick={() => handleAprobarNotificacionPago(b)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all text-xs shadow-md shadow-emerald-600/20"
                          >
                            ✓ Aprobar E Ingresar Pago
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* AÑADIR PRESUPUESTO / SUBIR FACTURA DIRECTA */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <span className="block text-xs font-bold text-slate-300">Añadir Presupuesto O Extra</span>
                <input
                  type="text"
                  placeholder="Título (Ej: Presupuesto Base)"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400">📄 Adjuntar Factura O Recibo (PDF / Foto)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setComprobanteFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-slate-400 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Total (€)"
                    value={nuevoTotal}
                    onChange={(e) => setNuevoTotal(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl">
                    <input type="checkbox" checked={esExtra} onChange={(e) => setEsExtra(e.target.checked)} className="rounded accent-emerald-500" />
                    ¿Extra?
                  </label>
                  <button
                    type="button"
                    disabled={subiendoComprobante}
                    onClick={handleCrearPresupuesto}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {subiendoComprobante ? 'Subiendo...' : 'Guardar'}
                  </button>
                </div>
              </div>

              {paymentLogs.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">📜 Últimos Cobros Registrados</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {paymentLogs.map((p) => (
                      <div key={p.id} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[11px] flex justify-between items-center">
                        <div>
                          <span className="font-bold text-emerald-400">+{Number(p.monto).toFixed(2)} €</span>
                          <p className="text-[10px] text-slate-400">{p.concepto}</p>
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString('es-ES')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {selectedObraId && selectedObraId !== 'nueva' && (
            <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                💬 Canal Con El Cliente
              </h2>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {comentarios.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No hay comentarios en esta obra.</p>
                ) : (
                  comentarios.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        c.autor === 'Cliente'
                          ? 'bg-blue-950/30 border-blue-800/40 text-blue-200'
                          : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-white capitalize">{c.autor}</span>
                        <span>{new Date(c.created_at).toLocaleString('es-ES')}</span>
                      </div>
                      <p className="leading-relaxed">{c.contenido}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Escribir mensaje..."
                  value={nuevoComentarioTrabajador}
                  onChange={(e) => setNuevoComentarioTrabajador(e.target.value)}
                  className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleEnviarComentario}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/10"
                >
                  Enviar
                </button>
              </div>
            </section>
          )}
        </div>

        {/* COLUMNA DERECHA */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-md">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                📝 Publicar Avance Diario
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Sube los partes fotográficos para mantener actualizado al cliente</p>
            </div>

            {selectedObraId === 'nueva' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Nombre De La Nueva Reforma</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre de la reforma (ej. Reforma Cocina Don Mateo)"
                  value={nuevaObraNombre}
                  onChange={(e) => setNuevaObraNombre(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            {/* ESTADO Y FECHAS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Estado Obra</label>
                <select
                  value={estadoObraInput}
                  onChange={(e) => setEstadoObraInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="En Progreso">En Progreso</option>
                  <option value="Pausada">Pausada</option>
                  <option value="Finalizada">Finalizada / Archivada</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={fechaInicioInput}
                  onChange={(e) => setFechaInicioInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-400 uppercase mb-1">Fecha Fin Est.</label>
                <input
                  type="date"
                  value={fechaFinInput}
                  onChange={(e) => setFechaFinInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* FASES */}
            <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <label className="block text-xs font-bold text-blue-400 uppercase">Fases De La Reforma (Hitos)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {fases.map((fase) => (
                  <label key={fase.id} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fase.completada}
                      onChange={() => toggleFase(fase.id)}
                      className="rounded accent-emerald-500"
                    />
                    <span className={fase.completada ? 'text-emerald-400 font-semibold line-through' : 'text-slate-300'}>
                      {fase.titulo}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* PORCENTAJE */}
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-emerald-400 uppercase text-[11px]">Porcentaje De Avance</label>
                <span className="font-extrabold text-emerald-400 text-sm font-mono">{porcentajeInput}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={porcentajeInput}
                onChange={(e) => setPorcentajeInput(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">2. Estancia / Zona</label>
              <input
                type="text"
                required
                placeholder="Ej. Baño principal, Fachada, Cocina"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">3. Descripción De Los Avances</label>
              <textarea
                required
                rows={4}
                placeholder="Detalla las tareas realizadas hoy..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase">4. Fotografías De La Jornada</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFiles(e.target.files)}
                className="w-full text-slate-400 text-xs file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 file:border-blue-500/30 hover:file:bg-blue-600/30 cursor-pointer"
              />
              <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-rose-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={esAntesInput}
                  onChange={(e) => setEsAntesInput(e.target.checked)}
                  className="rounded accent-rose-500"
                />
                Marcar estas fotos como "Estado Inicial / Antes" de la reforma
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 text-sm tracking-wide"
            >
              {loading ? 'Subiendo fotos y registrando parte...' : '🚀 Publicar Parte Diario'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}