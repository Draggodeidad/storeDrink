'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/app/lib/supabaseClient';
import { getCartItems, updateCartItemQuantity, removeFromCart, clearCart, CartItem } from '@/app/lib/cartHelpers';
import { RiDrinksFill, RiShoppingCartLine, RiDeleteBin6Line } from 'react-icons/ri';

export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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
    loadCart();
  }, [router]);

  const loadCart = async () => {
    setLoading(true);
    const items = await getCartItems();
    setCartItems(items);
    setLoading(false);
  };

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    const result = await updateCartItemQuantity(cartItemId, newQuantity);
    if (result.success) {
      await loadCart();
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    const result = await removeFromCart(cartItemId);
    if (result.success) {
      await loadCart();
    }
  };

  const handleClearCart = async () => {
    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
      const result = await clearCart();
      if (result.success) {
        await loadCart();
      }
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.products.price * item.quantity);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="font-montserrat text-gray-600 mt-4">Cargando carrito...</p>
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
            <Link href="/menu" className="font-montserrat text-gray-600 hover:text-gray-900 flex items-center gap-2">
              ← Volver al menú
            </Link>
            <h1 className="font-oswald text-2xl font-bold text-gray-900">
              <RiDrinksFill className="inline-block mr-2" /> Cafetería
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-oswald text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <RiShoppingCartLine /> Mi Carrito
          </h1>
          <p className="font-montserrat text-gray-600">
            {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'} en tu carrito
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <RiShoppingCartLine className="mx-auto text-gray-400 text-6xl mb-4" />
            <h2 className="font-oswald text-2xl font-semibold text-gray-900 mb-2">
              Tu carrito está vacío
            </h2>
            <p className="font-montserrat text-gray-600 mb-6">
              Explora nuestro menú y agrega algunas bebidas deliciosas
            </p>
            <Link
              href="/menu"
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-montserrat font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Ver Menú
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Lista de productos */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex gap-4">
                    {/* Imagen */}
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {item.products.image_url ? (
                        <Image
                          src={item.products.image_url}
                          alt={item.products.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-orange-100 to-orange-200">
                          <RiDrinksFill className="text-orange-400 text-3xl" />
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-1">
                      <h3 className="font-oswald text-xl font-semibold text-gray-900 mb-1">
                        {item.products.name}
                      </h3>
                      <p className="font-montserrat text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.products.description}
                      </p>
                      <p className="font-oswald text-lg font-bold text-orange-600">
                        ${item.products.price.toFixed(2)}
                      </p>
                    </div>

                    {/* Controles */}
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Eliminar"
                      >
                        <RiDeleteBin6Line className="text-xl" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-montserrat font-bold transition-colors"
                        >
                          -
                        </button>
                        <span className="font-montserrat font-semibold text-gray-900 w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-montserrat font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleClearCart}
                className="w-full font-montserrat text-red-600 hover:text-red-700 font-medium py-2 transition-colors"
              >
                Vaciar carrito
              </button>
            </div>

            {/* Resumen */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
                <h2 className="font-oswald text-2xl font-bold text-gray-900 mb-6">
                  Resumen
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between font-montserrat text-gray-600">
                    <span>Subtotal</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-montserrat text-gray-600">
                    <span>Envío</span>
                    <span>Gratis</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-oswald text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-orange-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-montserrat font-medium py-3 px-6 rounded-lg transition-colors duration-200 mb-3">
                  Proceder al pago
                </button>

                <Link
                  href="/menu"
                  className="block w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-montserrat font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Seguir comprando
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
