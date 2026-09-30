'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

interface Log {
  id: string;
  obra_id: string;
  nombre_obra: string;
  room_name: string;
  description: string;
  photos_urls: string[];
  fecha_inicio?: string;
  fecha_fin?: string;
  porcentaje_avance?: number;
  estado_obra?: string;
  ciudad?: string;
  fases?: { id: string; titulo: string; completada: boolean }[];
  es_antes?: boolean;
  created_at: string;
}

interface Comment {
  id: string;
  obra_id: string;
  autor: string;
  contenido: string;
  created_at: string;
}

interface Budget {
  id: string;
  titulo: string;
  monto_total: number;
  monto_pagado: number;
  es_extra: boolean;
  comprobante_url?: string;
}

export default function ClienteObraPage() {
  const params = useParams();
  const obra_id = (params?.obraId || params?.obra_id || params?.id) as string;

  const [logs, setLogs] = useState<Log[]>([]);
  const [comentarios, setComentarios] = useState<Comment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombreEmpresa] = useState('Gestión De Reformas');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [autorNombre, setAutorNombre] = useState('Cliente');
  const [estanciaFiltro, setEstanciaFiltro] = useState<string>('Todas');

  // Clima
  const [climaInfo, setClimaInfo] = useState<{ temp: number; estado: string } | null>(null);

  // Modal Visor Fotos
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  const [budgetIdNotificar, setBudgetIdNotificar] = useState<string>('');
  const [montoNotificar, setMontoNotificar] = useState('');
  const [mensajeNotificar, setMensajeNotificar] = useState('');
  const [enviandoPago, setEnviandoPago] = useState(false);

  useEffect(() => {
    if (!obra_id) return;

    async function cargarTodo() {
      try {
        setLoading(true);

        const [resLogs, resComments, resBudgets] = await Promise.all([
          supabase
            .from('daily_logs')
            .select('*')
            .eq('obra_id', obra_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('comments')
            .select('*')
            .eq('obra_id', obra_id)
            .order('created_at', { ascending: true }),
          supabase
            .from('budgets')
            .select('*')
            .eq('obra_id', obra_id)
            .order('created_at', { ascending: true }),
        ]);

        if (resLogs.data) {
          setLogs(resLogs.data);
          obtenerClima();
        }
        if (resComments.data) setComentarios(resComments.data);
        if (resBudgets.data) {
          setBudgets(resBudgets.data);
          if (resBudgets.data.length > 0) setBudgetIdNotificar(resBudgets.data[0].id);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    }

    cargarTodo();
  }, [obra_id]);

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

  const handleEnviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;

    const { error } = await supabase.from('comments').insert([
      {
        obra_id,
        autor: autorNombre || 'Cliente',
        contenido: nuevoComentario.trim(),
      },
    ]);

    if (!error) {
      setNuevoComentario('');
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('obra_id', obra_id)
        .order('created_at', { ascending: true });
      if (data) setComentarios(data);
    }
  };

  const handleNotificarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetIdNotificar || !montoNotificar) return;

    setEnviandoPago(true);

    const { error } = await supabase
      .from('budgets')
      .update({
        notificacion_pago: parseFloat(montoNotificar),
        mensaje_pago: mensajeNotificar || 'Aviso de pago del cliente',
      })
      .eq('id', budgetIdNotificar);

    setEnviandoPago(false);

    if (!error) {
      alert('Aviso de pago enviado a la empresa.');
      setMontoNotificar('');
      setMensajeNotificar('');
    } else {
      alert('Error al enviar el aviso.');
    }
  };

  const calcularDiasRestantes = (fechaFinStr?: string) => {
    if (!fechaFinStr) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFinStr);
    fin.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diff > 0) {
      return { texto: `⏳ Faltan ${diff} día(s)`, tipo: 'normal' };
    } else if (diff === 0) {
      return { texto: '🎯 Finaliza hoy', tipo: 'hoy' };
    } else {
      return { texto: `⚠️ ${Math.abs(diff)} día(s) de retraso`, tipo: 'retraso' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-sm">Cargando bitácora de la obra...</span>
        </div>
      </div>
    );
  }

  const nombreObraHeader = logs.length > 0 && logs[0].nombre_obra ? logs[0].nombre_obra : 'Seguimiento De Reforma';
  const logUltimo = logs.length > 0 ? logs[0] : null;
  const fechaInicioObra = logUltimo?.fecha_inicio || (logs.length > 0 ? logs[logs.length - 1].created_at : null);
  const fechaFinObra = logUltimo?.fecha_fin || null;
  const porcentajeAvance = logUltimo?.porcentaje_avance || 0;
  const estadoObra = logUltimo?.estado_obra || 'En Progreso';
  const fasesObra = logUltimo?.fases || [];

  const diasInfo = calcularDiasRestantes(fechaFinObra || undefined);

  const fotosAntes = logs.filter((l) => l.es_antes).flatMap((l) => l.photos_urls);
  const fotosDespues = logs.filter((l) => !l.es_antes).flatMap((l) => l.photos_urls);

  const estanciasUnicas = Array.from(new Set(logs.map((l) => l.room_name)));
  const logsFiltrados = estanciaFiltro === 'Todas' ? logs : logs.filter((l) => l.room_name === estanciaFiltro);

  const totalPresupuestado = budgets.reduce((acc, b) => acc + Number(b.monto_total), 0);
  const totalPagado = budgets.reduce((acc, b) => acc + Number(b.monto_pagado), 0);
  const totalPendiente = totalPresupuestado - totalPagado;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 print:bg-white print:text-black print:p-0">
      
      {/* CABECERA */}
      <header className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4 print:border-none print:shadow-none print:p-0 print:bg-transparent">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2 print:hidden">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                🏗️ {nombreEmpresa}
              </span>
              
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                estadoObra === 'Finalizada'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : estadoObra === 'Pausada'
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
              }`}>
                ● {estadoObra}
              </span>

              {climaInfo && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-bold">
                  {climaInfo.estado} ({climaInfo.temp}°C)
                </span>
              )}

              {fechaInicioObra && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  📅 Inicio: {new Date(fechaInicioObra).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}

              {fechaFinObra && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  🏁 Fin Est.: {new Date(fechaFinObra).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}

              {diasInfo && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  diasInfo.tipo === 'retraso'
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                    : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                }`}>
                  {diasInfo.texto}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight capitalize print:text-black print:text-2xl">{nombreObraHeader}</h1>
            <p className="text-xs text-slate-400 mt-1 print:text-slate-700">Informe General Y Bitácora De Avances</p>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all print:hidden shadow-sm"
            >
              📄 Descargar Informe PDF
            </button>

            {budgets.length > 0 && (
              <div className="flex gap-3 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl print:bg-slate-50 print:border-slate-400 print:text-black">
                <div className="text-center px-2">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase print:text-slate-800">Total</span>
                  <span className="text-sm font-bold text-white font-mono print:text-black">{totalPresupuestado.toFixed(2)} €</span>
                </div>
                <div className="border-r border-slate-800 print:border-slate-300"></div>
                <div className="text-center px-2">
                  <span className="block text-[10px] text-emerald-400 font-bold uppercase print:text-emerald-800">Pagado</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono print:text-emerald-800">{totalPagado.toFixed(2)} €</span>
                </div>
                <div className="border-r border-slate-800 print:border-slate-300"></div>
                <div className="text-center px-2">
                  <span className="block text-[10px] text-rose-400 font-bold uppercase print:text-rose-800">Pendiente</span>
                  <span className="text-sm font-bold text-rose-400 font-mono print:text-rose-800">{totalPendiente.toFixed(2)} €</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PROGRESO */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2 print:bg-slate-50 print:border-slate-400">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] print:text-black">Avance Global De La Obra</span>
            <span className="font-extrabold text-emerald-400 font-mono text-sm print:text-emerald-800">{porcentajeAvance}% Completado</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50 print:bg-slate-300">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700 print:bg-emerald-600"
              style={{ width: `${porcentajeAvance}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* FASES */}
      {fasesObra.length > 0 && (
        <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-3 print:bg-white print:border-slate-300">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 print:text-slate-900">
            📋 Fases Y Planificación De La Reforma
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {fasesObra.map((fase) => (
              <div
                key={fase.id}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                  fase.completada
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300 print:bg-emerald-50 print:border-emerald-300 print:text-emerald-900'
                    : 'bg-slate-950 border-slate-800 text-slate-400 print:bg-slate-100 print:border-slate-300 print:text-slate-700'
                }`}
              >
                <span>{fase.completada ? '✅' : '⏳'}</span>
                <span className="capitalize">{fase.titulo}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ANTES Y DESPUÉS */}
      {fotosAntes.length > 0 && (
        <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4 print:bg-white print:border-slate-300">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 print:text-slate-900">
            🔄 Transformación De La Obra (Antes Y Después)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block print:text-rose-700">📷 Estado Inicial (Antes)</span>
              <div className="grid grid-cols-2 gap-2">
                {fotosAntes.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFotoModalUrl(url)}
                    className="block aspect-square rounded-xl overflow-hidden border border-slate-800 group relative print:border-slate-300"
                  >
                    <img src={url} alt={`Antes ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block print:text-emerald-700">✨ Avances Actuales (Después)</span>
              <div className="grid grid-cols-2 gap-2">
                {fotosDespues.slice(0, 4).map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFotoModalUrl(url)}
                    className="block aspect-square rounded-xl overflow-hidden border border-slate-800 group relative print:border-slate-300"
                  >
                    <img src={url} alt={`Después ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PRESUPUESTOS Y FACTURAS DESCARGABLES */}
      {budgets.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-3 print:col-span-12 print:bg-white print:border-slate-300">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 print:text-slate-900">
              💳 Estado De Presupuestos Y Pagos
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 print:max-h-none">
              {budgets.map((b) => (
                <div key={b.id} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs print:bg-slate-50 print:border-slate-300 print:text-black">
                  <div>
                    <span className="font-semibold text-white block capitalize print:text-black">
                      {b.titulo} {b.es_extra && <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold ml-1 print:text-amber-800">EXTRA</span>}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-emerald-400 mt-0.5 print:text-emerald-800">
                      <span>Pagado: {Number(b.monto_pagado).toFixed(2)} €</span>
                      {b.comprobante_url && (
                        <a
                          href={b.comprobante_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 underline font-bold hover:text-blue-300 print:text-blue-800"
                        >
                          📄 Factura / Recibo
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white block print:text-black">{Number(b.monto_total).toFixed(2)} €</span>
                    <span className="text-[10px] text-rose-400 print:text-rose-800">Pendiente: {(Number(b.monto_total) - Number(b.monto_pagado)).toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-3 print:hidden">
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              📩 Avisar De Transferencia / Pago
            </h2>
            <form onSubmit={handleNotificarPago} className="space-y-2.5">
              <select
                value={budgetIdNotificar}
                onChange={(e) => setBudgetIdNotificar(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 capitalize"
              >
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>{b.titulo}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Monto enviado (€)"
                value={montoNotificar}
                onChange={(e) => setMontoNotificar(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Notas (ej: Pago por transferencia)"
                value={mensajeNotificar}
                onChange={(e) => setMensajeNotificar(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={enviandoPago}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/20"
              >
                {enviandoPago ? 'Enviando...' : 'Enviar Confirmación De Pago'}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* BITÁCORA */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2 print:border-slate-300">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 print:text-black">
            📸 Avances Diarios De La Obra ({logsFiltrados.length})
          </h2>

          {estanciasUnicas.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 print:hidden">
              <button
                onClick={() => setEstanciaFiltro('Todas')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  estanciaFiltro === 'Todas' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              {estanciasUnicas.map((estancia) => (
                <button
                  key={estancia}
                  onClick={() => setEstanciaFiltro(estancia)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    estanciaFiltro === estancia ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {estancia}
                </button>
              ))}
            </div>
          )}
        </div>

        {logsFiltrados.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs print:border-slate-300 print:text-slate-600">
            No se han encontrado registros para la estancia seleccionada.
          </div>
        ) : (
          <div className="space-y-6">
            {logsFiltrados.map((log) => (
              <article key={log.id} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md print:bg-white print:border-slate-300 print:shadow-none">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 print:border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛠️</span>
                    <h3 className="font-bold text-sm text-white capitalize print:text-black">{log.room_name}</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono print:text-slate-700">
                    {new Date(log.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line print:text-black">{log.description}</p>

                {log.photos_urls && log.photos_urls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                    {log.photos_urls.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setFotoModalUrl(url)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 block text-left print:border-slate-300"
                      >
                        <img
                          src={url}
                          alt={`Avance ${idx}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* VISOR LIGHTBOX */}
      {fotoModalUrl && (
        <div
          onClick={() => setFotoModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out print:hidden"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <img
              src={fotoModalUrl}
              alt="Fotografía Ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-700"
            />
            <button
              onClick={() => setFotoModalUrl(null)}
              className="absolute -top-12 right-0 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 shadow-lg"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>
      )}

      {/* COMENTARIOS */}
      <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md print:hidden">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          💬 Consultas Y Comentarios Con La Empresa
        </h2>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {comentarios.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay comentarios aún. Escribe una duda o mensaje abajo.</p>
          ) : (
            comentarios.map((c) => (
              <div
                key={c.id}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  c.autor === 'Cliente'
                    ? 'bg-blue-950/30 border-blue-800/40 text-blue-200 ml-4'
                    : 'bg-slate-950 border-slate-800 text-slate-200 mr-4'
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

        <form onSubmit={handleEnviarComentario} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
          <input
            type="text"
            placeholder="Tu Nombre"
            value={autorNombre}
            onChange={(e) => setAutorNombre(e.target.value)}
            className="sm:w-32 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <input
            type="text"
            required
            placeholder="Escribe tu duda o consulta..."
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 shrink-0"
          >
            Enviar Mensaje
          </button>
        </form>
      </section>
    </div>
  );
}