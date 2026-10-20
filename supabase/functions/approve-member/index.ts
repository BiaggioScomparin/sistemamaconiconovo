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

    // Create admin client for role check and user creation
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

    // Verify the caller using admin client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User verification error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Verify caller has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { profileId, email, lodgeId, cpf } = await req.json();

    if (!profileId || !email) {
      return new Response(
        JSON.stringify({ error: 'Profile ID and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if profile already exists and has user_id
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, email, cpf')
      .eq('id', profileId)
      .maybeSingle();

    let authUserId = existingProfile?.user_id;

    if (!authUserId) {
      // Check if user already registered in auth.users by email
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        // Create new user in auth
        const tempPassword = cpf ? cpf.replace(/\D/g, '') : 'Membro@2026';
        const passwordToUse = tempPassword.length >= 6 ? tempPassword : 'Membro@' + Math.floor(1000 + Math.random() * 9000);
        
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: passwordToUse,
          email_confirm: true,
        });

        if (createError) {
          console.error('Create user error:', createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        authUserId = userData.user.id;
      }
    }

    // Try sending password reset / recovery email (non-fatal if SMTP is not configured)
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      });
    } catch (resetErr) {
      console.warn('generateLink warning (non-fatal):', resetErr);
    }

    // Add member role in user_roles
    if (authUserId) {
      await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: authUserId,
          role: 'member'
        }, { onConflict: 'user_id,role', ignoreDuplicates: true });
    }

    // Update profile
    const updateData: Record<string, unknown> = {
      status: 'membro',
      member_status: 'active'
    };
    if (authUserId) {
      updateData.user_id = authUserId;
    }
    if (lodgeId) {
      updateData.lodge_id = lodgeId;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', profileId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Membro aprovado com sucesso!',
        user_id: authUserId 
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