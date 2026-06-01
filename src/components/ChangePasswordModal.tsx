import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';

interface ChangePasswordModalProps {
  userId: number;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ userId, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Las contraseñas nuevas no coinciden'); return; }
    if (newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/sellers/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al cambiar contraseña'); return; }
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch {
      setError('No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
          <X className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-sm text-zinc-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Cambiar Contraseña
        </h3>

        {success ? (
          <p className="text-emerald-600 font-semibold text-sm text-center py-4">✓ Contraseña actualizada correctamente</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-3 pr-10 py-2 text-xs border rounded-xl"
                  required
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  {showCurrent ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 pr-10 py-2 text-xs border rounded-xl"
                  required
                />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl"
                required
              />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-xs text-zinc-600">Cancelar</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-[#014ACD] text-white text-xs font-bold rounded-xl disabled:opacity-60">
                {loading ? 'Guardando...' : 'Cambiar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
