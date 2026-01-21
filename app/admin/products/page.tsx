'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { RiDrinksFill, RiAddLine, RiEdit2Line, RiDeleteBin6Line, RiImageAddLine } from 'react-icons/ri';
import { logError, toPublicErrorMessage } from '@/app/lib/errorHandling';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  created_at: string;
}

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const EXT_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };

  useEffect(() => {
    checkAdminAccess();
    fetchProducts();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }

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
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logError('admin:products:fetchProducts', error);
      return;
    }

    setProducts(data || []);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormError(null);

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setImageFile(null);
        setImagePreview('');
        alert('Tipo de imagen no permitido. Usa JPG/PNG/WEBP/GIF.');
        return;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        setImageFile(null);
        setImagePreview('');
        alert('La imagen es demasiado grande. Máximo 5MB.');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error('Tipo de archivo no permitido');
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Archivo demasiado grande');
      }

      const nameExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined;
      const mimeExt = EXT_BY_MIME[file.type];
      const fileExt = nameExt || mimeExt;
      if (!fileExt) {
        throw new Error('No se pudo determinar la extensión del archivo');
      }

      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      logError('admin:products:uploadImage', error, { fileType: file?.type, fileSize: file?.size });
      alert(toPublicErrorMessage(error, 'Error al subir la imagen. Verifica el archivo e intenta de nuevo.'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formData.name.trim();
    const description = formData.description.trim();
    const priceRaw = formData.price?.toString().trim();
    const price = Number(priceRaw);

    if (!name) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (!description) {
      setFormError('La descripción es obligatoria.');
      return;
    }
    if (!priceRaw || Number.isNaN(price) || !Number.isFinite(price)) {
      setFormError('El precio no es válido.');
      return;
    }
    if (price < 0) {
      setFormError('El precio no puede ser negativo.');
      return;
    }

    let imageUrl = formData.image_url;

    // Si hay una nueva imagen, subirla
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        return; // Si falla la subida, no continuar
      }
    }

    const productData = {
      name,
      description,
      price,
      image_url: imageUrl,
    };

    if (editingProduct) {
      // Actualizar producto existente
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        logError('admin:products:update', error);
        alert(toPublicErrorMessage(error, 'Error al actualizar el producto'));
        return;
      }
    } else {
      // Crear nuevo producto
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) {
        logError('admin:products:create', error);
        alert(toPublicErrorMessage(error, 'Error al crear el producto'));
        return;
      }
    }

    // Resetear form y recargar productos
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', image_url: '' });
    setImageFile(null);
    setImagePreview('');
    fetchProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      image_url: product.image_url,
    });
    setImagePreview(product.image_url);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      logError('admin:products:delete', error);
      alert(toPublicErrorMessage(error, 'Error al eliminar el producto'));
      return;
    }

    fetchProducts();
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', image_url: '' });
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
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
                <Link href="/admin/products" className="font-montserrat text-orange-600 font-medium">
                  Productos
                </Link>
                <Link href="/admin/users" className="font-montserrat text-gray-600 hover:text-gray-900">
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-oswald text-4xl font-bold text-gray-900 mb-2">
              Gestión de Productos
            </h2>
            <p className="font-montserrat text-gray-600">
              {products.length} productos en total
            </p>
          </div>
          <button
            onClick={openNewProductModal}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-montserrat font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            <RiAddLine className="text-xl" />
            Nuevo Producto
          </button>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-right text-xs font-montserrat font-semibold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gradient-to-br from-orange-100 to-orange-200">
                            <RiDrinksFill className="text-orange-400" />
                          </div>
                        )}
                      </div>
                      <span className="font-montserrat font-medium text-gray-900">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-montserrat text-sm text-gray-600 line-clamp-2 max-w-md">
                      {product.description}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-oswald text-lg font-bold text-orange-600">
                      ${product.price.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <RiEdit2Line className="inline text-xl" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <RiDeleteBin6Line className="inline text-xl" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal para crear/editar producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-oswald text-2xl font-bold text-gray-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-montserrat text-red-600 text-sm">{formError}</p>
                </div>
              )}
              {/* Imagen */}
              <div>
                <label className="block font-montserrat font-medium text-gray-700 mb-2">
                  Imagen del producto
                </label>
                
                {imagePreview && (
                  <div className="mb-4 relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-500 transition-colors">
                      <div className="flex flex-col items-center gap-2">
                        <RiImageAddLine className="text-3xl text-gray-400" />
                        <span className="font-montserrat text-sm text-gray-600">
                          {imageFile ? imageFile.name : 'Subir imagen desde dispositivo'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </div>
                  </label>
                </div>

              
              </div>

              {/* Nombre */}
              <div>
                <label className="block font-montserrat font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full font-montserrat px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ej: Café Americano"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block font-montserrat font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full font-montserrat px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="Descripción detallada del producto..."
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block font-montserrat font-medium text-gray-700 mb-2">
                  Precio * (MXN)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full font-montserrat px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-montserrat font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-montserrat font-medium py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Subiendo imagen...' : editingProduct ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
