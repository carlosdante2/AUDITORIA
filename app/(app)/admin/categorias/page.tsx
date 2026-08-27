import { redirect } from 'next/navigation'

// Categorías se integró como pestaña dentro de /admin/catalogo (Parte 2).
// La ruta vieja se conserva como redirect permanente para no romper enlaces.
export default function CategoriasPage() {
  redirect('/admin/catalogo?tab=categorias')
}
