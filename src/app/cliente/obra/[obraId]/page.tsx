'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

interface DailyLog {
  id: string;
  obra_id: string;
  nombre_obra?: string;
  room_name: string;
  description: string;
  photos_urls: string[];
  created_at: string;
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
}

export default function ObraClientePage() {
  const params = useParams();
  const obraId = (params?.obraId || params?.id) as string;

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para comentarios
  const [nuevoComentarioGen, setNuevoComentarioGen] = useState('');
  const [comentariosParte, setComentariosParte] = useState<{ [logId: string]: string }>({});

  useEffect(() => {
    if (!obraId) return;
    cargarDatos();
  }, [obraId]);

  async function cargarDatos() {
    setLoading(true);

    const { data: logsData } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });

    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: true });

    const { data: budgetsData } = await supabase
      .from('budgets')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: true });

    setLogs(logsData || []);
    setComments(commentsData || []);
    setBudgets(budgetsData || []);
    setLoading(false);
  }

  // Notificar entrega de dinero por parte del cliente
  const notificarEntrega = async (budgetId: string) => {
    const monto = prompt('Indica la cantidad exacta que has entregado (€):');
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) return;

    const nota = prompt('Detalle del pago (ej. Transferencia, En efectivo el 30/09):') || 'Pago notificado por el cliente';

    const { error } = await supabase
      .from('budgets')
      .update({
        notificacion_pago: parseFloat(monto),
        mensaje_pago: nota,
      })
      .eq('id', budgetId);

    if (!error) {
      alert('Se ha enviado la notificación de pago al equipo. Pendiente de verificación.');
      cargarDatos();
    } else {
      alert('Error al enviar la notificación: ' + error.message);
    }
  };

  const enviarComentario = async (dailyLogId: string | null, texto: string) => {
    if (!texto.trim()) return;

    const { error } = await supabase.from('comments').insert([
      {
        obra_id: obraId,
        daily_log_id: dailyLogId,
        autor: 'Cliente',
        contenido: texto.trim(),
      },
    ]);

    if (!error) {
      if (dailyLogId) setComentariosParte({ ...comentariosParte, [dailyLogId]: '' });
      else setNuevoComentarioGen('');
      cargarDatos();
    }
  };

  const totalPresupuestado = budgets.reduce((acc, b) => acc + Number(b.monto_total), 0);
  const totalPagado = budgets.reduce((acc, b) => acc + Number(b.monto_pagado), 0);
  const totalPendiente = totalPresupuestado - totalPagado;

  const tituloObra = logs.length > 0 && logs[0].nombre_obra
    ? logs[0].nombre_obra
    : 'Seguimiento de Su Obra';

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-2xl mx-auto space-y-6">
      <header className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-blue-400">{tituloObra}</h1>
        <p className="text-xs text-slate-400 mt-1">Avances diarios y estado financiero</p>
      </header>

      {/* BLOQUE ECONÓMICO */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">
          📊 Resumen Económico
        </h2>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total</span>
            <span className="text-sm font-bold text-white">{totalPresupuestado.toFixed(2)} €</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-lg border border-emerald-900/50">
            <span className="block text-[10px] text-emerald-400 uppercase font-semibold">Pagado</span>
            <span className="text-sm font-bold text-emerald-400">{totalPagado.toFixed(2)} €</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-lg border border-rose-900/50">
            <span className="block text-[10px] text-rose-400 uppercase font-semibold">Pendiente</span>
            <span className="text-sm font-bold text-rose-400">{totalPendiente.toFixed(2)} €</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase">Detalle de Presupuestos</h3>
          {budgets.map((b) => (
            <div key={b.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs space-y-2">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-slate-200">{b.titulo} {b.es_extra && <span className="text-amber-400">[EXTRA]</span>}</span>
                <span className="font-mono text-white">{Number(b.monto_total).toFixed(2)} €</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Confirmado: <strong className="text-emerald-400">{Number(b.monto_pagado).toFixed(2)} €</strong></span>
                <span>Pendiente: <strong className="text-rose-400">{(Number(b.monto_total) - Number(b.monto_pagado)).toFixed(2)} €</strong></span>
              </div>

              {/* Notificación activa en revisión */}
              {b.notificacion_pago && b.notificacion_pago > 0 ? (
                <div className="bg-amber-950/40 border border-amber-800/50 p-2 rounded text-[11px] text-amber-300">
                  ⏳ <strong>Pago notificado:</strong> {Number(b.notificacion_pago).toFixed(2)} € ({b.mensaje_pago}) - <em>Pendiente de confirmación por la empresa</em>.
                </div>
              ) : (
                <button
                  onClick={() => notificarEntrega(b.id)}
                  className="w-full py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded text-xs transition-colors font-medium"
                >
                  ✉️ Confirmar / Notificar Entrega de Dinero
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* HISTORIAL DE PARTES */}
      <div className="space-y-6">
        {logs.map((log) => {
          const comentariosDelParte = comments.filter((c) => c.daily_log_id === log.id);

          return (
            <article key={log.id} className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4 shadow-md">
              <div className="flex justify-between items-start border-b border-slate-700 pb-2">
                <h2 className="text-lg font-semibold text-white">{log.room_name}</h2>
                <span className="text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <p className="text-slate-300 text-sm whitespace-pre-line">{log.description}</p>

              {log.photos_urls && log.photos_urls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {log.photos_urls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded border border-slate-700 hover:opacity-90">
                      <img src={url} alt={`Foto de ${log.room_name}`} className="w-full h-36 object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {/* COMENTARIOS */}
              <div className="bg-slate-900/60 rounded-lg p-3 space-y-3 mt-4 border border-slate-700/50">
                <h3 className="text-xs font-semibold text-slate-400">Comentarios en {log.room_name}:</h3>
                {comentariosDelParte.map((c) => (
                  <div key={c.id} className={`text-xs p-2.5 rounded ${c.autor === 'Cliente' ? 'bg-blue-950/40 border border-blue-800/40 text-blue-200' : 'bg-slate-800 text-slate-200'}`}>
                    <span className="font-bold text-slate-400">{c.autor}: </span>
                    <span>{c.contenido}</span>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder={`Responder sobre ${log.room_name}...`}
                    value={comentariosParte[log.id] || ''}
                    onChange={(e) => setComentariosParte({ ...comentariosParte, [log.id]: e.target.value })}
                    className="flex-1 p-2 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:outline-none"
                  />
                  <button onClick={() => enviarComentario(log.id, comentariosParte[log.id] || '')} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">
                    Enviar
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}