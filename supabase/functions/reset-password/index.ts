import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let isAuthorized = false;

    if (serviceRoleKey && token === serviceRoleKey) {
      isAuthorized = true;
    } else {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (!userError && user) {
        const callerUserId = user.id;

        // Verify caller has admin role
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', callerUserId)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleData?.role === 'admin') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Acesso restrito a administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { userId, newPassword, profileId, email } = body;

    if (!newPassword || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve conter no mínimo 6 caracteres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetUserId = userId;

    // Se targetUserId não veio ou profileId foi passado
    if (!targetUserId && profileId) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('user_id, email')
        .eq('id', profileId)
        .maybeSingle();
      if (prof?.user_id) {
        targetUserId = prof.user_id;
      } else if (prof?.email) {
        // Tentar achar por email
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === prof.email.toLowerCase());
        if (existingUser) {
          targetUserId = existingUser.id;
          await supabaseAdmin.from('profiles').update({ user_id: existingUser.id }).eq('id', profileId);
        }
      }
    }

    if (!targetUserId && email) {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        targetUserId = existingUser.id;
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Usuário não localizado para redefinição de senha.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user password via Supabase Admin Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Update password error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Senha atualizada com sucesso!' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});