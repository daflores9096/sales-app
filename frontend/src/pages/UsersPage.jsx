import { useEffect, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { createUser, deleteUser, getUsers, resetUserPassword, updateUser } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function UsersPage() {
  const { user: me } = useAuth();
  const isSuperAdmin = me?.role === 'superadmin';
  const currentUserId = Number(me?.id) || 0;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', email: '', role_id: 3 });
  const [editForm, setEditForm] = useState({ id: 0, username: '', email: '', role_id: 3, role_name: '' });
  const [resetForm, setResetForm] = useState({ userId: 0, username: '', password: '', password2: '' });

  function canManageRow(row) {
    if (!me) return false;
    if (me.role === 'admin') return row.role === 'user';
    if (me.role === 'superadmin') {
      if (row.role === 'superadmin' && row.id !== currentUserId) return false;
      return true;
    }
    return false;
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getUsers();
      setUsers(res.data ?? []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function editRoleOptions() {
    if (editForm.role_name === 'superadmin') return [{ value: 1, label: 'Superadmin' }];
    if (isSuperAdmin) {
      return [
        { value: 2, label: 'Admin' },
        { value: 3, label: 'Vendedor' },
      ];
    }
    return [{ value: 3, label: 'Vendedor' }];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500">Alta, edición y restablecimiento de contraseña</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ username: '', password: '', email: '', role_id: 3 });
            setModal('create');
            setError('');
          }}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Nuevo usuario
        </button>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-500">Cargando…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-slate-500">No hay usuarios.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{u.id}</td>
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3 text-right">
                    {canManageRow(u) ? (
                      <>
                        <button type="button" className="mr-2 text-indigo-600 hover:underline" onClick={() => { setEditForm({ id: u.id, username: u.username, email: u.email, role_id: Number(u.role_id), role_name: u.role }); setModal('edit'); setError(''); }}>
                          Editar
                        </button>
                        <button type="button" className="mr-2 text-amber-600 hover:underline" onClick={() => { setResetForm({ userId: u.id, username: u.username, password: '', password2: '' }); setModal('reset'); setError(''); }}>
                          Resetear clave
                        </button>
                        {u.id !== currentUserId && (
                          <button type="button" className="text-red-600 hover:underline" onClick={async () => {
                            if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return;
                            try { await deleteUser(u.id); await load(); } catch (err) { setError(err.message); }
                          }}>
                            Eliminar
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'create' && (
        <Modal title="Nuevo usuario" onClose={() => setModal(null)}>
          <UserFormFields form={form} setForm={setForm} isSuperAdmin={isSuperAdmin} mode="create" />
          <FormActions
            onCancel={() => setModal(null)}
            onSave={async () => {
              try {
                await createUser({ username: form.username, password: form.password, email: form.email, role_id: Number(form.role_id) });
                setModal(null);
                await load();
              } catch (err) { setError(err.message); }
            }}
          />
        </Modal>
      )}
      {modal === 'edit' && (
        <Modal title="Editar usuario" onClose={() => setModal(null)}>
          <UserFormFields form={editForm} setForm={setEditForm} roleOptions={editRoleOptions()} mode="edit" />
          <FormActions
            onCancel={() => setModal(null)}
            onSave={async () => {
              try {
                await updateUser(editForm.id, { username: editForm.username.trim(), email: editForm.email.trim(), role_id: Number(editForm.role_id) });
                setModal(null);
                await load();
              } catch (err) { setError(err.message); }
            }}
          />
        </Modal>
      )}
      {modal === 'reset' && (
        <Modal title={`Restablecer: ${resetForm.username}`} onClose={() => setModal(null)}>
          <Field label="Nueva contraseña" type="password" value={resetForm.password} onChange={(v) => setResetForm((f) => ({ ...f, password: v }))} />
          <Field label="Confirmar" type="password" value={resetForm.password2} onChange={(v) => setResetForm((f) => ({ ...f, password2: v }))} />
          <FormActions
            onCancel={() => setModal(null)}
            onSave={async () => {
              if (resetForm.password.length < 6) { setError('Mínimo 6 caracteres'); return; }
              if (resetForm.password !== resetForm.password2) { setError('Las contraseñas no coinciden'); return; }
              try {
                await resetUserPassword(resetForm.userId, resetForm.password);
                setModal(null);
                await load();
              } catch (err) { setError(err.message); }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function UserFormFields({ form, setForm, isSuperAdmin, roleOptions, mode }) {
  return (
    <div className="space-y-3">
      {mode !== 'edit' && (
        <Field label="Contraseña" type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} />
      )}
      <Field label="Usuario" value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} />
      <Field label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
      <div>
        <label className="mb-1 block text-sm font-medium">Rol</label>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          value={form.role_id}
          onChange={(e) => setForm((f) => ({ ...f, role_id: Number(e.target.value) }))}
        >
          {(roleOptions ?? [
            { value: 3, label: 'Vendedor' },
            ...(isSuperAdmin ? [{ value: 2, label: 'Admin' }] : []),
          ]).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {!isSuperAdmin && mode === 'create' && (
          <p className="mt-1 text-xs text-slate-500">Como admin solo puedes crear vendedores.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FormActions({ onCancel, onSave }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onCancel}>Cancelar</button>
      <button type="button" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white" onClick={onSave}>Guardar</button>
    </div>
  );
}
