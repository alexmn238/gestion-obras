'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function NuevoPartePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [misObras, setMisObras] = useState<string[]>([]);
  const [obraId, setObraId] = useState('');
  const [nuevaObraInput, setNuevaObraInput] = useState('');
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [copiado, setCopiado] = useState(false);

  // 1. Verificar sesión del trabajador y cargar ÚNICAMENTE sus obras asignadas
  useEffect(() => {
    async function inicializarTrabajador() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

      // Consultar únicamente las obras creadas/asociadas al user_id del trabajador actual
      const { data, error } = await supabase
        .from('daily_logs')
        .select('obra_id')
        .eq('user_id', user.id);

      if (!error && data) {
        const unicas = Array.from(new Set(data.map((item) => item.obra_id))).filter(Boolean);
        setMisObras(unicas);
        if (unicas.length > 0) {
          setObraId(unicas[0]);
        } else {
          setObraId('nueva');
        }
      } else {
        setObraId('nueva');
      }

      setLoadingPage(false);
    }

    inicializarTrabajador();
  }, [router]);

  // Manejador para cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Enlace directo de la obra seleccionada para el cliente
  const obraActualParaLink = obraId === 'nueva' ? nuevaObraInput.trim() : obraId;
  const clienteUrl = typeof window !== 'undefined' && obraActualParaLink
    ? `${window.location.origin}/cliente/obra/${obraActualParaLink}`
    : '';

  const copiarEnlaceCliente = () => {
    if (!clienteUrl) return;
    navigator.clipboard.writeText(clienteUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // 2. Publicar nuevo parte vinculándolo obligatoriamente al user_id
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        alert('Debes estar autenticado para publicar un parte.');
        router.push('/login');
        return;
      }

      const targetObraId = obraId === 'nueva' ? nuevaObraInput.trim() : obraId;

      if (!targetObraId) {
        alert('Por favor, especifica un código o nombre de obra.');
        setLoading(false);
        return;
      }

      const photoUrls: string[] = [];

      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
          const filePath = `${targetObraId}/${fileName}`;

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
          obra_id: targetObraId,
          room_name: roomName,
          description: description,
          photos_urls: photoUrls,
          user_id: userId, // Garantiza que solo este trabajador sea el dueño
        },
      ]);

      if (insertError) throw insertError;

      alert('Parte publicado correctamente');

      if (!misObras.includes(targetObraId)) {
        setMisObras([...misObras, targetObraId]);
      }
      setObraId(targetObraId);
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
        <p className="text-slate-400">Verificando faenas del trabajador...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-lg mx-auto space-y-6">
      {/* Encabezado */}
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

      {/* BLOQUE PARA COPIAR ENLACE AL CLIENTE */}
      {obraActualParaLink && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            Enlace directo para tu cliente:
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

      {/* FORMULARIO DE REGISTRO DE PARTE */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Seleccionar tu Faena / Obra</label>
          <select
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          >
            {misObras.map((obra) => (
              <option key={obra} value={obra}>
                {obra}
              </option>
            ))}
            <option value="nueva">+ Registrar nueva faena...</option>
          </select>

          {obraId === 'nueva' && (
            <input
              type="text"
              required
              placeholder="Código o nombre de la nueva obra"
              value={nuevaObraInput}
              onChange={(e) => setNuevaObraInput(e.target.value)}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Estancia / Zona</label>
          <input
            type="text"
            required
            placeholder="Ej. Cocina, Fachada principal"
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
            placeholder="Detalla lo realizado en el día..."
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