'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión actual
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          console.log('Usuario autenticado:', session?.user);
        }
      }
    );

    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
          <p className="font-montserrat text-gray-600 mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="font-oswald text-4xl font-semibold text-gray-900 mb-4">
            ¡Bienvenido a Cafetería!
          </h1>
          
          <div className="mb-6">
            <p className="font-montserrat text-gray-600 mb-2">
              Has iniciado sesión correctamente.
            </p>
            <p className="font-montserrat text-sm text-gray-500">
              Email: <span className="font-medium text-gray-700">{user.email}</span>
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="font-montserrat bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
