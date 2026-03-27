import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: "lima.diogo2023@gmail.com",
    password: "teste123",
    email_confirm: true,
    user_metadata: { full_name: "Diogo Lima" },
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  // Update profile
  if (data.user) {
    await supabaseAdmin.from("profiles").update({ full_name: "Diogo Lima" }).eq("id", data.user.id);
  }

  return new Response(JSON.stringify({ success: true, user_id: data.user?.id }));
});
