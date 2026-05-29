import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, KeyRound, Pencil, Search, Trash2 } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.id, u.username, u.email, u.role, u.role_id]
        .some((value) => String(value ?? '').toLowerCase().includes(q)),
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  function canManageRow(row) {
    if (!me) return false;
    if (me.role === 'admin') return row.role === 'user';
    if (me.role === 'superadmin') {
      if (row.role === 'superadmin' && row.id !== currentUserId) return false;
      return true;
    }
    return false;
  }

  function canResetPasswordRow(row) {
    if (!me) return false;
    if (me.role === 'superadmin') return true;
    if (me.role === 'admin') return row.role !== 'superadmin';
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

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

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
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="text-sm text-white/75">Alta, edición y restablecimiento de contraseña</p>
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
          <div>
            <ListToolbar
              search={search}
              setSearch={setSearch}
              pageSize={pageSize}
              setPageSize={setPageSize}
              total={filteredUsers.length}
            />
            <div className="overflow-x-auto">
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
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No hay usuarios que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{u.id}</td>
                        <td className="px-4 py-3 font-medium">{u.username}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">{u.role}</td>
                        <td className="px-4 py-3 text-right">
                          {canManageRow(u) ? (
                            <>
                              <IconButton
                                label="Editar"
                                onClick={() => {
                                  setEditForm({ id: u.id, username: u.username, email: u.email, role_id: Number(u.role_id), role_name: u.role });
                                  setModal('edit');
                                  setError('');
                                }}
                              >
                                <Pencil size={16} />
                              </IconButton>
                              {canResetPasswordRow(u) && (
                                <IconButton
                                  label="Cambiar contraseña"
                                  warning
                                  onClick={() => {
                                    setResetForm({ userId: u.id, username: u.username, password: '', password2: '' });
                                    setModal('reset');
                                    setError('');
                                  }}
                                >
                                  <KeyRound size={16} />
                                </IconButton>
                              )}
                              {u.id !== currentUserId && (
                                <IconButton
                                  label="Eliminar"
                                  danger
                                  onClick={async () => {
                                    if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return;
                                    try { await deleteUser(u.id); await load(); } catch (err) { setError(err.message); }
                                  }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              )}
                            </>
                          ) : canResetPasswordRow(u) ? (
                            <IconButton
                              label="Cambiar contraseña"
                              warning
                              onClick={() => {
                                setResetForm({ userId: u.id, username: u.username, password: '', password2: '' });
                                setModal('reset');
                                setError('');
                              }}
                            >
                              <KeyRound size={16} />
                            </IconButton>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={`${filteredUsers.length} usuario${filteredUsers.length === 1 ? '' : 's'}`}
            />
          </div>
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
        <Modal title={`Cambiar contraseña: ${resetForm.username}`} onClose={() => setModal(null)}>
          <PasswordField label="Nueva contraseña" value={resetForm.password} onChange={(v) => setResetForm((f) => ({ ...f, password: v }))} />
          <PasswordField label="Confirmar contraseña" value={resetForm.password2} onChange={(v) => setResetForm((f) => ({ ...f, password2: v }))} />
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

function ListToolbar({ search, setSearch, pageSize, setPageSize, total }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuario, email o rol..."
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>{total} resultados</span>
        <select
          className="rounded-lg border border-slate-300 px-2 py-1.5"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {[5, 10, 20, 50].map((value) => (
            <option key={value} value={value}>
              {value} por página
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange, summary }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
      <span className="text-slate-500">
        Página {page} de {totalPages} · {summary}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} className="rounded-lg border px-2 py-1 disabled:opacity-40" onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, index) => (
          <span key={p} className="flex items-center gap-1">
            {index > 0 && p - pages[index - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
            <button
              type="button"
              className={`min-w-8 rounded-lg border px-2 py-1 ${p === page ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          </span>
        ))}
        <button type="button" disabled={page >= totalPages} className="rounded-lg border px-2 py-1 disabled:opacity-40" onClick={() => onPageChange(page + 1)} aria-label="Página siguiente">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function IconButton({ label, children, onClick, danger, warning }) {
  return (
    <button
      type="button"
      className={`mr-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100 ${
        danger ? 'text-red-600' : warning ? 'text-amber-600' : 'text-indigo-600'
      }`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
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

function PasswordField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
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
