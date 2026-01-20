'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { RiDrinksFill } from 'react-icons/ri';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    email: string;
  } | null;
}

export default function ProductDetail() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUser(session.user);
    };

    checkAuth();
    fetchProduct();
    fetchComments();
  }, [productId, router]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (err: any) {
      console.error('Error al cargar producto:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles!inner (
            name,
            email
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments((data as any) || []);
    } catch (err: any) {
      console.error('Error al cargar comentarios:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    setError(null);

    try {
      // Insertar comentario
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          product_id: productId,
          user_id: user.id,
        });

      if (commentError) throw commentError;

      // Limpiar formulario y recargar comentarios
      setNewComment('');
      await fetchComments();
    } catch (err: any) {
      console.error('Error al enviar comentario:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-oswald text-2xl font-semibold text-gray-900 mb-4">
            Producto no encontrado
          </h2>
          <Link
            href="/menu"
            className="font-montserrat text-orange-600 hover:underline"
          >
            ← Volver al menú
          </Link>
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
            <Link
              href="/menu"
              className="font-montserrat text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              ← Volver al menú
            </Link>
            <h1 className="font-oswald text-2xl font-bold text-gray-900">
              <RiDrinksFill className="inline-block mr-2" /> Cafetería
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Detalle del producto */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Imagen del producto */}
            <div className="relative h-96 md:h-full min-h-[400px] bg-gray-100">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-orange-100 to-orange-200">
                  <svg
                    className="w-32 h-32 text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Información del producto */}
            <div className="p-8">
              <h1 className="font-oswald text-4xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>
              
              <div className="mb-6">
                <span className="font-oswald text-4xl font-bold text-orange-600">
                  ${product.price.toFixed(2)}
                </span>
              </div>

              <div className="mb-8">
                <h3 className="font-oswald text-lg font-semibold text-gray-900 mb-2">
                  Descripción
                </h3>
                <p className="font-montserrat text-gray-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-montserrat font-medium py-3 px-6 rounded-lg transition-colors duration-200">
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>

        {/* Sección de comentarios */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="font-oswald text-3xl font-bold text-gray-900 mb-6">
            Comentarios ({comments.length})
          </h2>

          {/* Formulario para nuevo comentario */}
          <form onSubmit={handleSubmitComment} className="mb-8">
            <div className="mb-4">
              <label
                htmlFor="comment"
                className="block font-montserrat font-medium text-gray-700 mb-2"
              >
                Deja tu comentario
              </label>
              <textarea
                id="comment"
                rows={4}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="¿Qué opinas de esta bebida?"
                className="w-full font-montserrat px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-montserrat text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="font-montserrat bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : 'Publicar comentario'}
            </button>
          </form>

          {/* Lista de comentarios */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="font-montserrat text-gray-600 mt-4">
                  Aún no hay comentarios. ¡Sé el primero en opinar!
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-b border-gray-200 pb-6 last:border-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-oswald font-semibold">
                        {comment.profiles?.name?.[0]?.toUpperCase() || 
                         comment.profiles?.email?.[0]?.toUpperCase() || 
                         'U'}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="mb-2">
                        <h4 className="font-montserrat font-semibold text-gray-900">
                          {comment.profiles?.name || comment.profiles?.email || 'Usuario'}
                        </h4>
                        <p className="font-montserrat text-sm text-gray-500">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                      <p className="font-montserrat text-gray-700 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
