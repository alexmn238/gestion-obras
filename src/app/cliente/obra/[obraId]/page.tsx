'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

interface Budget {
  id: string;
  titulo: string;
  monto_total: number;
  monto_pagado: number;
  es_extra: boolean;
}

export default function ObraClientePage() {
  const params = useParams();
  const obraId = (params?.obraId || params?.id) as string;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    async function cargarFinanzas() {
      const { data } = await supabase
        .from('budgets')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: true });

      setBudgets(data || []);
      setLoading(false);
    }
    cargarFinanzas();
  }, [obraId]);

  // Cálculos totales
  const totalPresupuestado = budgets.reduce((acc, b) => acc + Number(b.monto_total), 0);
  const totalPagado = budgets.reduce((acc, b) => acc + Number(b.monto_pagado), 0);
  const totalPendiente = totalPresupuestado - totalPagado;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-2xl mx-auto space-y-6">
      {/* TARJETA DE RESUMEN ECONÓMICO */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">
          📊 Resumen Económico
        </h2>

        {/* Cifras Globales */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total</span>
            <span className="text-sm sm:text-base font-bold text-white">{totalPresupuestado.toFixed(2)} €</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-lg border border-emerald-900/50">
            <span className="block text-[10px] text-emerald-400 uppercase font-semibold">Pagado</span>
            <span className="text-sm sm:text-base font-bold text-emerald-400">{totalPagado.toFixed(2)} €</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-lg border border-rose-900/50">
            <span className="block text-[10px] text-rose-400 uppercase font-semibold">Pendiente</span>
            <span className="text-sm sm:text-base font-bold text-rose-400">{totalPendiente.toFixed(2)} €</span>
          </div>
        </div>

        {/* Desglose por Conceptos y Extras */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase">Detalle de Presupuestos y Extras</h3>
          {budgets.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay información de presupuestos asignada.</p>
          ) : (
            budgets.map((b) => (
              <div
                key={b.id}
                className={`flex justify-between items-center text-xs p-2.5 rounded border ${
                  b.es_extra ? 'bg-amber-950/20 border-amber-800/40' : 'bg-slate-900 border-slate-700'
                }`}
              >
                <div>
                  <span className="font-semibold text-slate-200">{b.titulo}</span>
                  {b.es_extra && <span className="ml-2 text-[10px] text-amber-400 font-bold">[EXTRA]</span>}
                </div>
                <div className="text-right">
                  <span className="block font-mono text-white">{Number(b.monto_total).toFixed(2)} €</span>
                  <span className="text-[10px] text-slate-400">
                    Falta: {(Number(b.monto_total) - Number(b.monto_pagado)).toFixed(2)} €
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}