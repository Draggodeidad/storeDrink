'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RiDrinksFill, RiUserAddLine, RiDeleteBin6Line, RiAdminLine, RiUserLine } from 'react-icons/ri';
import { logError, toPublicErrorMessage } from '@/app/lib/errorHandling';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }

    setCurrentUserId(session.user.id);

    // Verificar si el usuario es admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/menu');
      return;
    }

    setIsAdmin(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logError('admin:users:fetchUsers', error);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    if (userId === currentUserId) {
      alert('No puedes cambiar tu propio rol');
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) {
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      logError('admin:users:toggleRole', error, { userId, newRole });
      alert(toPublicErrorMessage(error, 'Error al cambiar el rol del usuario'));
      return;
    }

    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      alert('No puedes eliminar tu propia cuenta');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción eliminará completamente su cuenta y no se puede deshacer.')) {
      return;
    }

    try {
      // Obtener el token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      // Llamar a la API para eliminar el usuario completamente
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      alert('Usuario eliminado completamente de la base de datos y autenticación.');
      fetchUsers();
    } catch (error) {
      logError('admin:users:deleteUser', error, { userId });
      alert(toPublicErrorMessage(error, 'Error al eliminar el usuario'));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="font-montserrat text-gray-600 mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="font-oswald text-2xl font-bold text-gray-900">
                <RiDrinksFill className="inline-block mr-2" /> Admin Panel
              </h1>
              <nav className="flex gap-4">
                <Link href="/admin/products" className="font-montserrat text-gray-600 hover:text-gray-900">
                  Productos
                </Link>
                <Link href="/admin/users" className="font-montserrat text-orange-600 font-medium">
                  Usuarios
                </Link>
              </nav>
            </div>
            <Link href="/menu" className="font-montserrat text-gray-600 hover:text-gray-900">
              ← Volver al menú
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div>
            <h2 className="font-oswald text-4xl font-bold text-gray-900 mb-2">
              Gestión de Usuarios
            </h2>
            <p className="font-montserrat text-gray-600">
              {users.length} usuarios registrados
            </p>
          </div>
        </div>

        {/* Alerta informativa */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-montserrat text-sm text-blue-800">
            <strong>Nota:</strong> Los usuarios se crean automáticamente cuando inician sesión con Google OAuth. 
            Puedes cambiar sus roles entre "user" y "admin".
          </p>
        </div>

        {/* Tabla de usuarios */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Fecha de registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-oswald font-semibold">
                        {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                      <span className="font-montserrat font-medium text-gray-900">
                        {user.name || 'Sin nombre'}
                      </span>
                      {user.id === currentUserId && (
                        <span className="font-montserrat text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Tú
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-montserrat text-sm text-gray-600">
                      {user.email}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-montserrat font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.role === 'admin' ? (
                        <>
                          <RiAdminLine /> Admin
                        </>
                      ) : (
                        <>
                          <RiUserLine /> Usuario
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-montserrat text-sm text-gray-600">
                      {formatDate(user.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleToggleRole(user.id, user.role)}
                      disabled={user.id === currentUserId}
                      className={`mr-4 font-montserrat text-sm ${
                        user.id === currentUserId
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-blue-600 hover:text-blue-900'
                      }`}
                    >
                      Cambiar rol
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.id === currentUserId}
                      className={`${
                        user.id === currentUserId
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-900'
                      }`}
                    >
                      <RiDeleteBin6Line className="inline text-xl" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sección de ayuda */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-oswald text-xl font-semibold text-gray-900 mb-4">
            Roles y Permisos
          </h3>
          <div className="space-y-3 font-montserrat text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <RiUserLine className="text-gray-400 mt-1" />
              <div>
                <strong className="text-gray-900">Usuario:</strong> Puede ver el menú, agregar productos al carrito y dejar comentarios.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RiAdminLine className="text-purple-600 mt-1" />
              <div>
                <strong className="text-gray-900">Admin:</strong> Tiene acceso completo al panel de administración, puede gestionar productos y usuarios.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
