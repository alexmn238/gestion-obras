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

interface PaymentLog {
  id: string;
  monto: number;
  concepto: string;
  registrado_por: string;
  created_at: string;
}

export default function ObraClientePage() {
  const params = useParams();
  const obraId = (params?.obraId || params?.id) as string;

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);

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

    const { data: paymentsData } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });

    setLogs(logsData || []);
    setComments(commentsData || []);
    setBudgets(budgetsData || []);
    setPaymentLogs(paymentsData || []);
    setLoading(false);
  }

  const notificarEntrega = async (budgetId: string) => {
    const monto = prompt('Indica la cantidad exacta entregada (€):');
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) return;

    const nota = prompt('Detalle del pago (ej. Transferencia, En efectivo):') || 'Pago notificado por el cliente';

    const { error } = await supabase
      .from('budgets')
      .update({
        notificacion_pago: parseFloat(monto),
        mensaje_pago: nota,
      })
      .eq('id', budgetId);

    if (!error) {
      alert('Notificación de pago enviada correctamente.');
      cargarDatos();
    } else {
      alert('Error al notificar: ' + error.message);
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
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 md:p-8 max-w-md sm:max-w-xl md:max-w-4xl mx-auto space-y-6">
      <header className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-blue-400">{tituloObra}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Portal de seguimiento en vivo y gestión de avances</p>
        </div>
      </header>

      {/* TARJETA ECONÓMICA ADAPTATIVA */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 space-y-4 shadow-xl">
        <h2 className="text-base sm:text-lg font-bold text-amber-400 border-b border-slate-700 pb-2 flex items-center gap-2">
          📊 Resumen Económico
        </h2>

        {/* Cifras Globales (1 col en móvil, 3 en tablet/PC) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
            <span className="block text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Total Presupuesto</span>
            <span className="text-sm sm:text-base md:text-lg font-bold text-white">{totalPresupuestado.toFixed(2)} €</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-lg border border-emerald-900/50">
            <span className="block text-[10px] sm:text-xs text-emerald-400 uppercase font-semibold">Abonado / Pagado</span>
            <span className="text-sm sm:text-base md:text-lg font-bold text-emerald-400">{totalPagado.toFixed(2)} €</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-lg border border-rose-900/50">
            <span className="block text-[10px] sm:text-xs text-rose-400 uppercase font-semibold">Pendiente</span>
            <span className="text-sm sm:text-base md:text-lg font-bold text-rose-400">{totalPendiente.toFixed(2)} €</span>
          </div>
        </div>

        {/* Desglose de Presupuestos (2 columnas en PC) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase">Presupuestos y Extras</h3>
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

                {b.notificacion_pago && b.notificacion_pago > 0 ? (
                  <div className="bg-amber-950/40 border border-amber-800/50 p-2 rounded text-[11px] text-amber-300">
                    ⏳ <strong>Entrega Notificada:</strong> {Number(b.notificacion_pago).toFixed(2)} € ({b.mensaje_pago})
                  </div>
                ) : (
                  <button
                    onClick={() => notificarEntrega(b.id)}
                    className="w-full py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded text-xs font-medium transition-colors"
                  >
                    ✉️ Confirmar Entrega de Dinero
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Historial de Pagos */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase">📜 Historial de Cobros Recibidos</h3>
            {paymentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Sin entregas confirmadas aún.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {paymentLogs.map((p) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-900 p-2.5 rounded border border-slate-800 text-xs">
                    <div>
                      <span className="text-emerald-400 font-bold">+{Number(p.monto).toFixed(2)} €</span>
                      <p className="text-[10px] text-slate-400">{p.concepto || 'Abono recibido'}</p>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PARTES DE AVANCE DIARIO */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">📸 Diario de Avances</h2>

        {logs.map((log) => {
          const comentariosDelParte = comments.filter((c) => c.daily_log_id === log.id);

          return (
            <article key={log.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 space-y-4 shadow-md">
              <div className="flex justify-between items-start border-b border-slate-700 pb-2">
                <h3 className="text-base sm:text-lg font-semibold text-white">{log.room_name}</h3>
                <span className="text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{log.description}</p>

              {/* Imágenes (2 columnas en móvil, 3 o 4 en PC) */}
              {log.photos_urls && log.photos_urls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                  {log.photos_urls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-slate-700 hover:opacity-90">
                      <img src={url} alt={`Foto ${log.room_name}`} className="w-full h-32 sm:h-36 md:h-40 object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {/* Comentarios del parte */}
              <div className="bg-slate-900/80 rounded-lg p-3 space-y-3 mt-4 border border-slate-700/50">
                <h4 className="text-xs font-semibold text-slate-400">Comentarios en esta estancia:</h4>
                {comentariosDelParte.map((c) => (
                  <div key={c.id} className={`text-xs p-2.5 rounded ${c.autor === 'Cliente' ? 'bg-blue-950/40 border border-blue-800/40 text-blue-200' : 'bg-slate-800 text-slate-200'}`}>
                    <span className="font-bold text-slate-400">{c.autor}: </span>
                    <span>{c.contenido}</span>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder={`Escribir sobre ${log.room_name}...`}
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