// Client Supabase avec privilèges admin (pour créer des users côté admin)
// ⚠️ NE JAMAIS importer ce fichier depuis un composant client !
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)