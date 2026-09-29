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

export default function ObraClientePage() {
  const params = useParams();
  const obraId = (params?.obraId || params?.id) as string;

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para nuevos comentarios
  const [nuevoComentarioGen, setNuevoComentarioGen] = useState('');
  const [comentariosParte, setComentariosParte] = useState<{ [logId: string]: string }>({});

  useEffect(() => {
    if (!obraId) return;
    cargarDatos();
  }, [obraId]);

  async function cargarDatos() {
    setLoading(true);

    // Cargar partes
    const { data: logsData } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });

    // Cargar comentarios
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: true });

    setLogs(logsData || []);
    setComments(commentsData || []);
    setLoading(false);
  }

  // Enviar comentario (general o de un parte específico)
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
      if (dailyLogId) {
        setComentariosParte({ ...comentariosParte, [dailyLogId]: '' });
      } else {
        setNuevoComentarioGen('');
      }
      cargarDatos();
    } else {
      alert('Error al enviar el comentario: ' + error.message);
    }
  };

  const tituloObra = logs.length > 0 && logs[0].nombre_obra
    ? logs[0].nombre_obra
    : 'Seguimiento de Su Obra';

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-2xl mx-auto space-y-6">
      <header className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-blue-400">{tituloObra}</h1>
        <p className="text-xs text-slate-400 mt-1">Avances diarios y canal de comentarios</p>
      </header>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Cargando avances y comentarios...</div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center text-slate-300">
          Aún no se han publicado avances para esta obra.
        </div>
      ) : (
        <div className="space-y-8">
          {/* LISTADO DE PARTES */}
          {logs.map((log) => {
            const comentariosDelParte = comments.filter((c) => c.daily_log_id === log.id);

            return (
              <article key={log.id} className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4 shadow-md">
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
                        <img src={url} alt={`Foto de ${log.room_name}`} className="w-full h-36 object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {/* HILO DE RESPUESTAS DEL PARTE */}
                <div className="bg-slate-900/60 rounded-lg p-3 space-y-3 mt-4 border border-slate-700/50">
                  <h3 className="text-xs font-semibold text-slate-400">Comentarios en {log.room_name}:</h3>

                  {comentariosDelParte.map((c) => (
                    <div key={c.id} className={`text-xs p-2.5 rounded ${c.autor === 'Cliente' ? 'bg-blue-950/40 border border-blue-800/40 text-blue-200' : 'bg-slate-800 text-slate-200'}`}>
                      <span className="font-bold text-slate-400">{c.autor}: </span>
                      <span>{c.contenido}</span>
                    </div>
                  ))}

                  {/* Formulario responder al parte */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder={`Responder sobre ${log.room_name}...`}
                      value={comentariosParte[log.id] || ''}
                      onChange={(e) => setComentariosParte({ ...comentariosParte, [log.id]: e.target.value })}
                      className="flex-1 p-2 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => enviarComentario(log.id, comentariosParte[log.id] || '')}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors shrink-0"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {/* SECCIÓN DE COMENTARIOS GENERALES DE LA OBRA */}
          <section className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4">
            <h2 className="text-base font-bold text-amber-400">Comentarios Generales de la Obra</h2>

            <div className="space-y-2">
              {comments.filter((c) => !c.daily_log_id).map((c) => (
                <div key={c.id} className={`text-xs p-3 rounded ${c.autor === 'Cliente' ? 'bg-blue-950/40 border border-blue-800/40 text-blue-200' : 'bg-slate-900 text-slate-200'}`}>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold">{c.autor}</span>
                    <span>{new Date(c.created_at).toLocaleString('es-ES')}</span>
                  </div>
                  <p>{c.contenido}</p>
                </div>
              ))}

              {comments.filter((c) => !c.daily_log_id).length === 0 && (
                <p className="text-xs text-slate-400 italic">No hay comentarios generales aún.</p>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <textarea
                rows={2}
                placeholder="Escribe una observación general sobre la obra..."
                value={nuevoComentarioGen}
                onChange={(e) => setNuevoComentarioGen(e.target.value)}
                className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={() => enviarComentario(null, nuevoComentarioGen)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition-colors shrink-0 self-end"
              >
                Publicar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}