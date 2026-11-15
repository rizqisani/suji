import React, { useState } from 'react';
import { GraduationCap, Loader2, LockKeyhole } from 'lucide-react';

interface LoginScreenProps {
  busy: boolean;
  error: string;
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ busy, error, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onLogin(username, password);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-800 text-white">
            <GraduationCap className="h-8 w-8 text-amber-300" />
          </div>
          <h1 className="text-xl font-black text-slate-900">SI-UJIAN</h1>
          <p className="mt-1 text-sm text-slate-500">Login untuk membuka data aplikasi Anda</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">Nama pengguna</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">Kata sandi</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          {busy ? 'Menghubungkan…' : 'Login'}
        </button>
        <p className="text-center text-xs leading-relaxed text-slate-500">
          Login pertama kali harus dilakukan dari browser yang menyimpan data lama agar bank soal dapat diimpor ke server.
        </p>
      </form>
    </main>
  );
};
