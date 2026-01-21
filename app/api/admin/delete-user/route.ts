import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Cliente de Supabase con privilegios de admin (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Esta key tiene privilegios de admin
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function DELETE(request: NextRequest) {
  try {
    // Obtener el ID del usuario a eliminar
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario que hace la petición es admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden eliminar usuarios' },
        { status: 403 }
      );
    }

    // Eliminar el usuario de auth.users (esto también eliminará el perfil por CASCADE si está configurado)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error al eliminar usuario:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar el usuario' },
        { status: 500 }
      );
    }

    // Eliminar el perfil de profiles (por si acaso no hay CASCADE)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    return NextResponse.json(
      { message: 'Usuario eliminado completamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en la API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
