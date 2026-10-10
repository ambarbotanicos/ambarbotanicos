// ============================================================
// CONFIGURAÇÃO DO SUPABASE — variável global acessível por todos os scripts
// ============================================================
const SUPABASE_URL = 'https://czfygugoufttexgjeivd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZnlndWdvdWZ0dGV4Z2plaXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTg1MTMsImV4cCI6MjEwMDc3NDUxM30.-EWuhvvEOHxlPrJjk_Xa2DEghPe7JI4qbbolejt62zo';

// Usando var para que seja acessível globalmente por admin.js também
var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// UTILIDADE: Sanitizar texto para prevenir XSS
// ============================================================
function sanitize(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

// ============================================================
// VITRINE: Desenhar produtos dinamicamente no HTML
// ============================================================
async function carregarProdutos(containerId, limite) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p class="text-sm opacity-50 col-span-3">Sincronizando catálogo...</p>';

    let query = db.from('produtos').select('*').order('criado_em', { ascending: false });
    if (limite) query = query.limit(limite);

    const { data: produtos, error } = await query;

    if (error) {
        container.innerHTML = '<p class="text-red-500 text-sm col-span-3">Não foi possível carregar o catálogo. Tente novamente mais tarde.</p>';
        return;
    }

    if (!produtos || produtos.length === 0) {
        container.innerHTML = '<p class="text-sm opacity-50 col-span-3">Nenhum produto cadastrado ainda. Acesse /admin.html para adicionar o primeiro.</p>';
        return;
    }

    Shop.cacheProducts(produtos);
    container.replaceChildren(...produtos.map(p => Shop.card(p)));

}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('grid-produtos-home')) {
        carregarProdutos('grid-produtos-home', 3);
    }
    if (document.getElementById('grid-produtos-catalogo')) {
        carregarProdutos('grid-produtos-catalogo', null);
    }
});
