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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { authorization: authHeader } } }
    );

    // Use getUser to verify the token (more reliable than getClaims)
    const { data: authUserData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !authUserData?.user) {
      console.error('User verification error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authUserData.user.id;

    // Check if caller is admin using service role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { profileId, email, cpf } = await req.json();

    if (!profileId || !email || !cpf) {
      return new Response(
        JSON.stringify({ error: 'profileId, email and cpf are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate password from CPF (digits only)
    const password = cpf.replace(/\D/g, '');
    
    if (password.length !== 11) {
      return new Response(
        JSON.stringify({ error: 'Invalid CPF format - must have 11 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if profile already has a user
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', profileId)
      .single();

    if (existingProfile?.user_id) {
      return new Response(
        JSON.stringify({ error: 'Member already has system access' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the auth user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error('Create user error:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with user_id
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ user_id: userData.user.id })
      .eq('id', profileId);

    if (updateError) {
      console.error('Update profile error:', updateError);
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to link user to profile: ' + updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add member role
    const { error: memberRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'member'
      });

    if (memberRoleError) {
      console.error('Error adding member role:', memberRoleError);
      // Not critical, continue
    }

    // Create default permissions
    const { error: permissionsError } = await supabaseAdmin
      .from('user_permissions')
      .insert({
        profile_id: profileId,
        can_edit_profile: true,
        can_view_card: true,
        can_view_attendance: true,
        can_register_attendance: true,
        can_view_daily_attendances: false,
      });

    if (permissionsError) {
      console.error('Error creating permissions:', permissionsError);
      // Not critical, continue
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Member access created successfully',
        user_id: userData.user.id,
        password_hint: 'CPF sem pontos e traço'
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
