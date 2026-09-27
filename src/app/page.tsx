import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Gestión de Obras
          </h1>
          <p className="mt-3 text-slate-400 text-sm">
            Plataforma de gestión interna y seguimiento diario.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <Link
            href="/trabajador/nuevo-parte"
            className="w-full flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg"
          >
            Panel del Trabajador (Nuevo Parte)
          </Link>

          <Link
            href="/admin/obras"
            className="w-full flex items-center justify-center px-6 py-3.5 border border-slate-700 text-base font-medium rounded-lg text-amber-400 bg-slate-800 hover:bg-slate-700 transition-colors shadow-lg"
          >
            Panel de Administrador (Todas las Obras)
          </Link>
        </div>
      </div>
	  <footer className="mt-8 text-center text-xs text-slate-500">
  <Link href="/privacidad" className="hover:text-slate-300 underline transition-colors">
    Aviso Legal y Política de Privacidad
  </Link>
</footer>
    </main>
  );
}