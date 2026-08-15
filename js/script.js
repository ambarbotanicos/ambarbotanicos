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
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

    container.innerHTML = produtos.map(p => `
        <a href="/produtos/${encodeURIComponent(p.id)}" class="cursor-pointer group bg-card border border-[rgba(42,37,32,0.14)] rounded-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div class="h-44 overflow-hidden bg-[#DDD9CE]">
                <img src="${sanitize(p.imagem_url)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${sanitize(p.nome)}" loading="lazy" />
            </div>
            <div class="p-4">
                <p class="font-sans text-sm font-medium leading-snug group-hover:underline mb-1">${sanitize(p.nome)}</p>
                <p class="text-[10px] font-mono uppercase tracking-widest text-[#7A7165] flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    ${sanitize(p.regiao)} · ${sanitize(p.tipo)}
                </p>
            </div>
        </a>
    `).join('');
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
