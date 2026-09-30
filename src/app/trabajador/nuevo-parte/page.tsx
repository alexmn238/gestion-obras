'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface ObraInfo {
  obra_id: string;
  nombre_obra: string;
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

export default function NuevoPartePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [misObras, setMisObras] = useState<ObraInfo[]>([]);
  const [selectedObraId, setSelectedObraId] = useState('');
  const [nuevaObraNombre, setNuevaObraNombre] = useState('');
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
  const [esExtra, setEsExtra] = useState(false);

  useEffect(() => {
    async function inicializarTrabajador() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('daily_logs')
        .select('obra_id, nombre_obra')
        .eq('user_id', user.id);

      if (!error && data) {
        const mapaObras = new Map<string, string>();
        data.forEach((item) => {
          if (item.obra_id) {
            mapaObras.set(item.obra_id, item.nombre_obra || item.obra_id);
          }
        });

        const listaObras: ObraInfo[] = Array.from(mapaObras.entries()).map(([obra_id, nombre_obra]) => ({
          obra_id,
          nombre_obra,
        }));

        setMisObras(listaObras);
        if (listaObras.length > 0) setSelectedObraId(listaObras[0].obra_id);
        else setSelectedObraId('nueva');
      } else {
        setSelectedObraId('nueva');
      }

      setLoadingPage(false);
    }

    inicializarTrabajador();
  }, [router]);

  useEffect(() => {
    if (!selectedObraId || selectedObraId === 'nueva') {
      setComentarios([]);
      setBudgets([]);
      setPaymentLogs([]);
      return;
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const clienteUrl = typeof window !== 'undefined' && selectedObraId && selectedObraId !== 'nueva'
    ? `${window.location.origin}/cliente/obra/${selectedObraId}`
    : '';

  const copiarEnlaceCliente = () => {
    if (!clienteUrl) return;
    navigator.clipboard.writeText(clienteUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

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
        registrado_por: 'Cliente (Verificado por Empresa)',
      },
    ]);

    if (!err1 && !err2) {
      alert('Pago verificado e ingresado.');
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

    const { error } = await supabase.from('budgets').insert([
      {
        obra_id: selectedObraId,
        titulo: nuevoTitulo.trim(),
        monto_total: parseFloat(nuevoTotal),
        monto_pagado: 0,
        es_extra: esExtra,
      },
    ]);

    if (!error) {
      setNuevoTitulo('');
      setNuevoTotal('');
      setEsExtra(false);
      recargarPagosYPresupuestos();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        alert('Debes estar autenticado para publicar un parte.');
        router.push('/login');
        return;
      }

      let finalObraId = selectedObraId;
      let finalNombreObra = '';

      if (selectedObraId === 'nueva') {
        if (!nuevaObraNombre.trim()) {
          alert('Por favor, indica un nombre para la nueva reforma.');
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

      const { error: insertError } = await supabase.from('daily_logs').insert([
        {
          obra_id: finalObraId,
          nombre_obra: finalNombreObra,
          room_name: roomName,
          description: description,
          photos_urls: photoUrls,
          user_id: userId,
        },
      ]);

      if (insertError) throw insertError;

      alert('Parte publicado correctamente');

      if (!misObras.some((o) => o.obra_id === finalObraId)) {
        setMisObras([...misObras, { obra_id: finalObraId, nombre_obra: finalNombreObra }]);
      }

      setSelectedObraId(finalObraId);
      setNuevaObraNombre('');
      setRoomName('');
      setDescription('');
      setFiles(null);
    } catch (error: any) {
      alert('Error al guardar el parte: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex items-center justify-center">
        <p className="text-slate-400">Cargando faenas del trabajador...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 md:p-8 max-w-md sm:max-w-xl md:max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-400">Panel del Trabajador</h1>
          <p className="text-xs text-slate-400">Tus faenas activas</p>
        </div>
        <button onClick={handleLogout} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded">
          Cerrar Sesión
        </button>
      </div>

      {clienteUrl && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-300">Enlace privado para enviar al cliente:</label>
          <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded border border-slate-700">
            <span className="text-xs font-mono text-blue-400 truncate">{clienteUrl}</span>
            <button onClick={copiarEnlaceCliente} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shrink-0">
              {copiado ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {/* DISPOSICIÓN EN 2 COLUMNAS PARA ORDENADOR (MD:) / 1 COLUMNA EN MÓVIL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COLUMNA IZQUIERDA: PRESUPUESTOS Y COBROS */}
        {selectedObraId && selectedObraId !== 'nueva' && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              💰 Presupuestos y Cobros
            </h3>

            <div className="space-y-3">
              {budgets.map((b) => (
                <div key={b.id} className="bg-slate-900 p-3 rounded border border-slate-700 text-xs space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-white">{b.titulo} {b.es_extra && <span className="text-amber-400">[EXTRA]</span>}</span>
                    <span className="text-blue-400">{Number(b.monto_total).toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-1">
                    <span>Pagado: <strong className="text-emerald-400">{Number(b.monto_pagado).toFixed(2)} €</strong></span>
                    <span>Pendiente: <strong className="text-rose-400">{(Number(b.monto_total) - Number(b.monto_pagado)).toFixed(2)} €</strong></span>
                  </div>

                  {b.notificacion_pago && b.notificacion_pago > 0 && (
                    <div className="bg-amber-950/60 border border-amber-500/50 p-2.5 rounded text-xs space-y-2">
                      <p className="text-amber-300 font-semibold">
                        📩 El cliente notifica entrega de {Number(b.notificacion_pago).toFixed(2)} €
                      </p>
                      <button
                        onClick={() => handleAprobarNotificacionPago(b)}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs"
                      >
                        ✓ Aprobar Pago
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-700 space-y-2">
              <span className="block text-xs font-medium text-slate-300">Añadir Presupuesto / Extra</span>
              <input
                type="text"
                placeholder="Título (Ej: Presupuesto Base)"
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto Total (€)"
                  value={nuevoTotal}
                  onChange={(e) => setNuevoTotal(e.target.value)}
                  className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                />
                <label className="flex items-center gap-1 text-xs text-slate-300">
                  <input type="checkbox" checked={esExtra} onChange={(e) => setEsExtra(e.target.checked)} />
                  Extra
                </label>
                <button onClick={handleCrearPresupuesto} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COLUMNA DERECHA: PUBLICACIÓN DE PARTE */}
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            📝 Publicar Nuevo Parte Diario
          </h3>

          <div>
            <label className="block text-xs font-medium mb-1">Seleccionar Faena / Obra</label>
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white text-xs"
            >
              {misObras.map((obra) => (
                <option key={obra.obra_id} value={obra.obra_id}>{obra.nombre_obra}</option>
              ))}
              <option value="nueva">+ Registrar nueva reforma...</option>
            </select>

            {selectedObraId === 'nueva' && (
              <input
                type="text"
                required
                placeholder="Nombre de la reforma"
                value={nuevaObraNombre}
                onChange={(e) => setNuevaObraNombre(e.target.value)}
                className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white mt-2 text-xs"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Estancia / Zona</label>
            <input
              type="text"
              required
              placeholder="Ej. Baño principal"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Descripción</label>
            <textarea
              required
              rows={3}
              placeholder="Detalla los avances..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Fotografías</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full text-slate-400 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-bold rounded transition-colors text-xs">
            {loading ? 'Subiendo...' : 'Publicar Parte'}
          </button>
        </form>
      </div>
    </div>
  );
}