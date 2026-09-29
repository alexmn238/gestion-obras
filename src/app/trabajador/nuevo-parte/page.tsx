'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface ObraInfo {
  obra_id: string; // UUID aleatorio único
  nombre_obra: string; // Nombre amigable (ej: "Reforma Chalet Torrent")
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

  // 1. Cargar únicamente las faenas del trabajador autenticado
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
        // Agrupar obras únicas conservando su UUID y nombre
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Enlace del cliente basado en el UUID
  const clienteUrl = typeof window !== 'undefined' && selectedObraId && selectedObraId !== 'nueva'
    ? `${window.location.origin}/cliente/obra/${selectedObraId}`
    : '';

  const copiarEnlaceCliente = () => {
    if (!clienteUrl) return;
    navigator.clipboard.writeText(clienteUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // 2. Publicar nuevo parte
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
        // Generar un UUID seguro e imposible de adivinar
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
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Panel de Trabajador</h1>
          <p className="text-xs text-slate-400">Tus faenas activas</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* BLOQUE ENLACE UUID AL CLIENTE */}
      {clienteUrl && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            Enlace privado y seguro para tu cliente:
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

      {/* FORMULARIO */}
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
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
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
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold rounded transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? 'Subiendo fotos y datos...' : 'Publicar Parte'}
        </button>
      </form>
    </div>
  );
}