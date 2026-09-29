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

export default function ObraClientePage() {
  const params = useParams();
  const obraId = (params?.obraId || params?.id) as string;

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPartesObra() {
      if (!obraId) return;

      setLoading(true);

      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLogs(data);
      }

      setLoading(false);
    }

    cargarPartesObra();
  }, [obraId]);

  // Nombre legible de la obra
  const tituloObra = logs.length > 0 && logs[0].nombre_obra
    ? logs[0].nombre_obra
    : 'Seguimiento de Su Obra';

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-2xl mx-auto">
      <header className="border-b border-slate-800 pb-4 mb-6">
        {/* Mostramos el nombre descriptivo que puso el trabajador */}
        <h1 className="text-2xl font-bold text-blue-400">{tituloObra}</h1>
        <p className="text-xs text-slate-400 mt-1">
          Acceso privado seguro mediante identificador único
        </p>
      </header>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Cargando los avances de su obra...</div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center text-slate-300">
          Aún no se han publicado avances para esta obra.
        </div>
      ) : (
        <div className="space-y-6">
          {logs.map((log) => (
            <article key={log.id} className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-700 pb-2">
                <h2 className="text-lg font-semibold text-white">{log.room_name}</h2>
                <span className="text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <p className="text-slate-300 text-sm whitespace-pre-line">{log.description}</p>

              {log.photos_urls && log.photos_urls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {log.photos_urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded border border-slate-700 hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={url}
                        alt={`Foto de ${log.room_name}`}
                        className="w-full h-36 object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}