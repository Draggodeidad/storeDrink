import { supabase } from './supabaseClient';
import { logError, toPublicErrorMessage } from './errorHandling';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
  };
}

export const addToCart = async (productId: string, quantity: number = 1) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No autenticado');

    const userId = session.user.id;

    // Verificar si el producto ya está en el carrito
    const { data: existingItem, error: checkError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingItem) {
      // Si ya existe, actualizar cantidad
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        // Defensa en profundidad: evitar IDOR incluso si alguien logra obtener un UUID ajeno
        .eq('id', existingItem.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } else {
      // Si no existe, crear nuevo item
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          product_id: productId,
          quantity: quantity,
        });

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error: any) {
    logError('cart:addToCart', error);
    return { success: false, error: toPublicErrorMessage(error) };
  }
};

export const getCartItems = async (): Promise<CartItem[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        created_at,
        products (
          id,
          name,
          description,
          price,
          image_url
        )
      `)
      .eq('user_id', session.user.id);

    if (error) throw error;
    return (data as any) || [];
  } catch (error) {
    logError('cart:getCartItems', error);
    return [];
  }
};

export const updateCartItemQuantity = async (cartItemId: string, quantity: number) => {
  try {
    if (quantity <= 0) {
      return removeFromCart(cartItemId);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No autenticado');

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      // Defensa en profundidad contra IDOR
      .eq('id', cartItemId)
      .eq('user_id', session.user.id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logError('cart:updateCartItemQuantity', error);
    return { success: false, error: toPublicErrorMessage(error) };
  }
};

export const removeFromCart = async (cartItemId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No autenticado');

    const { error } = await supabase
      .from('cart_items')
      .delete()
      // Defensa en profundidad contra IDOR
      .eq('id', cartItemId)
      .eq('user_id', session.user.id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logError('cart:removeFromCart', error);
    return { success: false, error: toPublicErrorMessage(error) };
  }
};

export const clearCart = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No autenticado');

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', session.user.id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logError('cart:clearCart', error);
    return { success: false, error: toPublicErrorMessage(error) };
  }
};

export const getCartCount = async (): Promise<number> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 0;

    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', session.user.id);

    if (error) throw error;
    
    const total = data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    return total;
  } catch (error) {
    logError('cart:getCartCount', error);
    return 0;
  }
};
