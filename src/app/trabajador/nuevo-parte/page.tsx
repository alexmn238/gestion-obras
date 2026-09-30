'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface ObraInfo {
  obra_id: string; // UUID aleatorio único
  nombre_obra: string; // Nombre legible (ej: "Reforma Cocina Don Mateo")
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
  es_extra: boolean;
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

  // Estados para comentarios
  const [comentarios, setComentarios] = useState<Comment[]>([]);
  const [nuevoComentarioTrabajador, setNuevoComentarioTrabajador] = useState('');

  // Estados para presupuestos y cobros
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoTotal, setNuevoTotal] = useState('');
  const [esExtra, setEsExtra] = useState(false);

  // 1. Cargar faenas asociadas al trabajador autenticado
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
        if (listaObras.length > 0) {
          setSelectedObraId(listaObras[0].obra_id);
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

  // 2. Cargar comentarios y presupuestos al cambiar la obra seleccionada
  useEffect(() => {
    if (!selectedObraId || selectedObraId === 'nueva') {
      setComentarios([]);
      setBudgets([]);
      return;
    }

    async function cargarDatosObra() {
      // Cargar Comentarios
      const { data: dataComments } = await supabase
        .from('comments')
        .select('*')
        .eq('obra_id', selectedObraId)
        .order('created_at', { ascending: true });

      if (dataComments) setComentarios(dataComments);

      // Cargar Presupuestos
      const { data: dataBudgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('obra_id', selectedObraId)
        .order('created_at', { ascending: true });

      if (dataBudgets) setBudgets(dataBudgets);
    }

    cargarDatosObra();
  }, [selectedObraId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Enlace UUID del cliente
  const clienteUrl = typeof window !== 'undefined' && selectedObraId && selectedObraId !== 'nueva'
    ? `${window.location.origin}/cliente/obra/${selectedObraId}`
    : '';

  const copiarEnlaceCliente = () => {
    if (!clienteUrl) return;
    navigator.clipboard.writeText(clienteUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Enviar comentario desde el trabajador
  const handleEnviarComentario = async () => {
    if (!nuevoComentarioTrabajador.trim() || !selectedObraId || selectedObraId === 'nueva') return;

    const { error } = await supabase.from('comments').insert([
      {
        obra_id: selectedObraId,
        daily_log_id: null,
        autor: 'Trabajador',
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
    } else {
      alert('Error al enviar respuesta: ' + error.message);
    }
  };

  // Crear Presupuesto o Extra
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
      const { data } = await supabase
        .from('budgets')
        .select('*')
        .eq('obra_id', selectedObraId)
        .order('created_at', { ascending: true });
      if (data) setBudgets(data);
    } else {
      alert('Error al crear presupuesto: ' + error.message);
    }
  };

  // Registrar pago / abono recibido del cliente
  const handleRegistrarPago = async (budgetId: string, montoExistente: number, abono: number) => {
    const { error } = await supabase
      .from('budgets')
      .update({ monto_pagado: montoExistente + abono })
      .eq('id', budgetId);

    if (!error) {
      const { data } = await supabase
        .from('budgets')
        .select('*')
        .eq('obra_id', selectedObraId)
        .order('created_at', { ascending: true });
      if (data) setBudgets(data);
    } else {
      alert('Error al actualizar pago: ' + error.message);
    }
  };

  // 3. Publicar parte diario
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
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-lg mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Panel de Trabajador</h1>
          <p className="text-xs text-slate-400">Tus faenas asignadas</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* BLOQUE 1: ENLACE PRIVADO CLIENTE */}
      {clienteUrl && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            Enlace privado para enviar al cliente:
          </label>
          <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded border border-slate-700">
            <span className="text-xs font-mono text-blue-400 truncate">
              {clienteUrl}
            </span>
            <button
              type="button"
              onClick={copiarEnlaceCliente}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shrink-0 transition-colors"
            >
              {copiado ? '✓ ¡Copiado!' : 'Copiar Enlace'}
            </button>
          </div>
        </div>
      )}

      {/* BLOQUE 2: GESTIÓN DE PRESUPUESTOS Y COBROS (INTERFAZ GRÁFICA AÑADIDA) */}
      {selectedObraId && selectedObraId !== 'nueva' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            💰 Presupuestos y Cobros de la Obra
          </h3>

          <div className="space-y-2">
            {budgets.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay presupuestos asignados aún.</p>
            ) : (
              budgets.map((b) => (
                <div key={b.id} className="bg-slate-900 p-3 rounded border border-slate-700 text-xs space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-white">{b.titulo} {b.es_extra && <span className="text-amber-400">[EXTRA]</span>}</span>
                    <span className="text-blue-400">{Number(b.monto_total).toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-1">
                    <span>Pagado: <strong className="text-emerald-400">{Number(b.monto_pagado).toFixed(2)} €</strong></span>
                    <span>Pendiente: <strong className="text-rose-400">{(Number(b.monto_total) - Number(b.monto_pagado)).toFixed(2)} €</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const abono = prompt('Indica la cantidad abonada por el cliente:');
                      if (abono && !isNaN(parseFloat(abono))) {
                        handleRegistrarPago(b.id, Number(b.monto_pagado), parseFloat(abono));
                      }
                    }}
                    className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded text-[11px] transition-colors font-medium"
                  >
                    + Registrar Pago / Entrega
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-700 space-y-2">
            <span className="block text-xs font-medium text-slate-300">Añadir Nuevo Presupuesto o Extra</span>
            <input
              type="text"
              placeholder="Título (Ej: Presupuesto Base o Extra Falso Techo)"
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
              <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={esExtra}
                  onChange={(e) => setEsExtra(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900"
                />
                ¿Es Extra?
              </label>
              <button
                type="button"
                onClick={handleCrearPresupuesto}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shrink-0 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 3: COMENTARIOS Y OBSERVACIONES CON EL CLIENTE */}
      {selectedObraId && selectedObraId !== 'nueva' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            💬 Comentarios y Observaciones de la Obra
          </h3>

          {comentarios.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sin comentarios registrados en esta obra.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className={`p-2.5 rounded border text-xs space-y-1 ${
                    c.autor === 'Cliente'
                      ? 'bg-blue-950/40 border-blue-800/40 text-blue-200'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="font-bold">{c.autor}</span>
                    <span>{new Date(c.created_at).toLocaleString('es-ES')}</span>
                  </div>
                  <p>{c.contenido}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-700">
            <input
              type="text"
              placeholder="Responder al cliente..."
              value={nuevoComentarioTrabajador}
              onChange={(e) => setNuevoComentarioTrabajador(e.target.value)}
              className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleEnviarComentario}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition-colors shrink-0"
            >
              Responder
            </button>
          </div>
        </div>
      )}

      {/* BLOQUE 4: FORMULARIO PUBLICAR PARTE */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Seleccionar Faena / Obra</label>
          <select
            value={selectedObraId}
            onChange={(e) => setSelectedObraId(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {misObras.map((obra) => (
              <option key={obra.obra_id} value={obra.obra_id}>
                {obra.nombre_obra}
              </option>
            ))}
            <option value="nueva">+ Registrar nueva reforma...</option>
          </select>

          {selectedObraId === 'nueva' && (
            <input
              type="text"
              required
              placeholder="Nombre de la reforma (ej. Reforma Cocina Don Mateo)"
              value={nuevaObraNombre}
              onChange={(e) => setNuevaObraNombre(e.target.value)}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2 text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Estancia / Zona</label>
          <input
            type="text"
            required
            placeholder="Ej. Baño principal"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descripción de los avances</label>
          <textarea
            required
            rows={4}
            placeholder="Detalla los avances del día..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Fotografías de la obra</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFiles(e.target.files)}
            className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold rounded transition-colors disabled:opacity-50 mt-4 text-sm"
        >
          {loading ? 'Subiendo fotos y datos...' : 'Publicar Parte'}
        </button>
      </form>
    </div>
  );
}