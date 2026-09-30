'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegistroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert('Error al registrar cuenta: ' + error.message);
    } else {
      alert('Cuenta creada con éxito. Ya puedes acceder con tus credenciales.');
      router.push('/login');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleRegister}
        className="bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-sm w-full space-y-5 shadow-2xl"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-400">Registro de Trabajadores</h1>
          <p className="text-xs text-slate-400 mt-1">Crea tu cuenta para gestionar tus obras</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="tu-email@empresa.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Confirmar contraseña
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Repite tu contraseña"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>

        <div className="text-center pt-2 space-y-2">
          <p className="text-xs text-slate-400">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
          <div>
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Volver al Inicio
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}