// Edge Function: invite-user
// Creates a new Supabase Auth user and sets tenant_id + rol in app_metadata.
// Only callable by Admin users (verified via JWT app_metadata.rol).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = new Set(['auditor', 'supervisor', 'admin'])

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json({ error: 'UNAUTHORIZED' }, 401)

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify caller is admin
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { authorization: authHeader, apikey: anonKey },
  })
  if (!userRes.ok) return json({ error: 'UNAUTHORIZED' }, 401)
  const { user: caller } = await userRes.json()
  if (!caller || caller.app_metadata?.rol !== 'admin') {
    return json({ error: 'FORBIDDEN', message: 'Solo administradores pueden invitar usuarios' }, 403)
  }

  const callerTenantId = caller.app_metadata?.tenant_id as string | undefined
  if (!callerTenantId) return json({ error: 'TENANT_NOT_CONFIGURED' }, 403)

  let body: { email?: string; rol?: string; nombre?: string }
  try { body = await req.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }

  const { email, rol, nombre } = body
  if (!email || !rol || !nombre) return json({ error: 'MISSING_FIELDS' }, 400)
  if (!ALLOWED_ROLES.has(rol)) return json({ error: 'INVALID_ROL' }, 400)

  // Create user with SERVICE_ROLE_KEY (bypasses email confirmation)
  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      email_confirm: true,
      app_metadata: { tenant_id: callerTenantId, rol },
      user_metadata: { nombre },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.json()
    return json({ error: 'CREATE_FAILED', message: err.message ?? 'Error al crear usuario' }, 400)
  }

  const { user: newUser } = await createRes.json()

  // Upsert profile record
  await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: newUser.id,
      tenant_id: callerTenantId,
      nombre,
    }),
  })

  // Send password reset (acts as invite email)
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${newUser.id}`, {
    method: 'PUT',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_confirm: true }),
  })

  return json({ success: true, user_id: newUser.id })
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
