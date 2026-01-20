import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/menu/${product.id}`}>
      <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer">
        {/* Imagen del producto */}
        <div className="relative h-56 w-full overflow-hidden bg-gray-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-orange-100 to-orange-200">
              <svg
                className="w-20 h-20 text-orange-400"
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
        <div className="p-5">
          <h3 className="font-oswald text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
            {product.name}
          </h3>
          
          <p className="font-montserrat text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="font-oswald text-2xl font-bold text-orange-600">
              ${product.price.toFixed(2)}
            </span>
            <span className="font-montserrat text-sm text-orange-600 group-hover:underline">
              Ver detalles →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
