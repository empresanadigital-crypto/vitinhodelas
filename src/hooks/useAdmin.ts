import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (data && !error) {
        setIsAdmin(true);
      } else if (user.email === "empresa.nadigital@gmail.com") {
        setIsAdmin(true);
        try {
          await supabase.from("user_roles").upsert(
            { user_id: user.id, role: "admin" },
            { onConflict: "user_id,role" }
          );
        } catch {}
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, loading };
};
