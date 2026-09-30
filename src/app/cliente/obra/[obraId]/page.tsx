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
}

export default function ClienteObraPage() {
  const params = useParams();
  const obra_id = (params?.obraId || params?.obra_id || params?.id) as string;

  const [logs, setLogs] = useState<Log[]>([]);
  const [comentarios, setComentarios] = useState<Comment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombreEmpresa] = useState('Gestión de Reformas');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [autorNombre, setAutorNombre] = useState('Cliente');

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

        if (resLogs.data) setLogs(resLogs.data);
        if (resComments.data) setComentarios(resComments.data);
        if (resBudgets.data) {
          setBudgets(resBudgets.data);
          if (resBudgets.data.length > 0) setBudgetIdNotificar(resBudgets.data[0].id);
        }
      } catch (error) {
        console.error('Error cargando los datos de la obra:', error);
      } finally {
        setLoading(false);
      }
    }

    cargarTodo();
  }, [obra_id]);

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
      alert('Aviso de pago enviado a la empresa constructora.');
      setMontoNotificar('');
      setMensajeNotificar('');
    } else {
      alert('Error al enviar el aviso de pago.');
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

  const nombreObraHeader = logs.length > 0 && logs[0].nombre_obra ? logs[0].nombre_obra : 'Seguimiento de Reforma';

  const logUltimo = logs.length > 0 ? logs[0] : null;
  const fechaInicioObra = logUltimo?.fecha_inicio || (logs.length > 0 ? logs[logs.length - 1].created_at : null);
  const fechaFinObra = logUltimo?.fecha_fin || null;
  const porcentajeAvance = logUltimo?.porcentaje_avance || 0;

  const totalPresupuestado = budgets.reduce((acc, b) => acc + Number(b.monto_total), 0);
  const totalPagado = budgets.reduce((acc, b) => acc + Number(b.monto_pagado), 0);
  const totalPendiente = totalPresupuestado - totalPagado;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      
      {/* CABECERA PRINCIPAL CON BARRA DE PROGRESO */}
      <header className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                🏗️ {nombreEmpresa}
              </span>
              <span className="text-xs text-slate-400">• Portal del Cliente</span>
              
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
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{nombreObraHeader}</h1>
            <p className="text-xs text-slate-400 mt-1">Avances diarios, estado financiero y comunicación directa</p>
          </div>

          {budgets.length > 0 && (
            <div className="flex gap-3 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-center px-2">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Total</span>
                <span className="text-sm font-bold text-white font-mono">{totalPresupuestado.toFixed(2)} €</span>
              </div>
              <div className="border-r border-slate-800"></div>
              <div className="text-center px-2">
                <span className="block text-[10px] text-emerald-400 font-bold uppercase">Pagado</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{totalPagado.toFixed(2)} €</span>
              </div>
              <div className="border-r border-slate-800"></div>
              <div className="text-center px-2">
                <span className="block text-[10px] text-rose-400 font-bold uppercase">Pendiente</span>
                <span className="text-sm font-bold text-rose-400 font-mono">{totalPendiente.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE PROGRESO DE LA REFORMA */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">Avance Global de la Obra</span>
            <span className="font-extrabold text-emerald-400 font-mono text-sm">{porcentajeAvance}% Completado</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm shadow-emerald-500/20"
              style={{ width: `${porcentajeAvance}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* SECCIÓN PRESUPUESTOS Y NOTIFICACIONES */}
      {budgets.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-3">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              💳 Estado de Presupuestos y Pagos
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {budgets.map((b) => (
                <div key={b.id} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-white block">
                      {b.titulo} {b.es_extra && <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold ml-1">EXTRA</span>}
                    </span>
                    <span className="text-[10px] text-emerald-400">Pagado: {Number(b.monto_pagado).toFixed(2)} €</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white block">{Number(b.monto_total).toFixed(2)} €</span>
                    <span className="text-[10px] text-rose-400">Pendiente: {(Number(b.monto_total) - Number(b.monto_pagado)).toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-3">
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              📩 Avisar de Transferencia / Pago
            </h2>
            <form onSubmit={handleNotificarPago} className="space-y-2.5">
              <select
                value={budgetIdNotificar}
                onChange={(e) => setBudgetIdNotificar(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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
                {enviandoPago ? 'Enviando...' : 'Enviar Confirmación de Pago'}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* BITÁCORA DE AVANCES */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          📸 Avances Diarios de la Obra ({logs.length})
        </h2>

        {logs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
            Aún no se han registrado partes ni fotografías en esta reforma.
          </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log) => (
              <article key={log.id} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛠️</span>
                    <h3 className="font-bold text-sm text-white">{log.room_name}</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{log.description}</p>

                {log.photos_urls && log.photos_urls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                    {log.photos_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 block"
                      >
                        <img
                          src={url}
                          alt={`Avance ${idx}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* COMENTARIOS */}
      <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          💬 Consultas y Comentarios con la Empresa
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
                  <span className="font-bold text-white">{c.autor}</span>
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