'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import ProductCard from '@/app/components/ProductCard';
import { useRouter } from 'next/navigation';
import { RiDrinksFill } from "react-icons/ri";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

export default function Menu() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Verificar autenticación
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUser(session.user);
    };

    checkAuth();
    fetchProducts();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (err: any) {
      console.error('Error al cargar productos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="font-montserrat text-gray-600 mt-4">Cargando menú...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-oswald text-3xl font-bold text-gray-900">
              <RiDrinksFill className="inline-block mr-2" /> Cafetería
              </h1>
              <p className="font-montserrat text-sm text-gray-600 mt-1">
                Hola! {user?.user_metadata.name}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="font-montserrat bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Título y descripción */}
        <div className="text-center mb-12">
          <h2 className="font-oswald text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nuestro Menú
          </h2>
          <p className="font-montserrat text-lg text-gray-600 max-w-2xl mx-auto">
            Descubre nuestra selección de bebidas artesanales preparadas con los mejores ingredientes
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-montserrat text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Grid de productos */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="font-oswald text-2xl font-semibold text-gray-900 mt-4 mb-2">
              No hay bebidas disponibles
            </h3>
            <p className="font-montserrat text-gray-600">
              Pronto agregaremos productos deliciosos a nuestro menú
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
