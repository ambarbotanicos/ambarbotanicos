// ============================================================
// ÂMBAR — Lógica da página de detalhe de produto (produto.html)
// Depende de: supabase-js e js/script.js (variável global `db`)
// ============================================================

/**
 * Desenha o gráfico de radar SVG dado um array de { axis, value }.
 * @param {Array<{axis: string, value: number}>} dados
 */
function desenharRadar(dados) {
    const size = 240, r = 85, cx = size / 2, cy = size / 2, levels = 5, n = dados.length;
    const angle = i => (Math.PI * 2 * i) / n - Math.PI / 2;
    const point = (i, radius) => ({ x: cx + radius * Math.cos(angle(i)), y: cy + radius * Math.sin(angle(i)) });

    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

    // Grades de fundo
    for (let lvl = 1; lvl <= levels; lvl++) {
        const pts = dados.map((_, i) => { const p = point(i, (lvl / levels) * r); return `${p.x},${p.y}`; }).join(' ');
        svg += `<polygon points="${pts}" fill="none" stroke="rgba(42,37,32,0.1)" stroke-width="1" />`;
    }

    // Eixos
    dados.forEach((_, i) => {
        const p = point(i, r);
        svg += `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="rgba(42,37,32,0.1)" stroke-width="1" />`;
    });

    // Polígono de dados
    const dPts = dados.map((d, i) => { const p = point(i, (d.value / 5) * r); return `${p.x},${p.y}`; }).join(' ');
    svg += `<polygon points="${dPts}" fill="#8A6F4E" fill-opacity="0.18" stroke="#8A6F4E" stroke-width="1.5" stroke-linejoin="round" />`;

    // Rótulos
    dados.forEach((d, i) => {
        const p = point(i, r + 20);
        svg += `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-family="'Roboto Mono', monospace" fill="#7A7165">${d.axis}</text>`;
    });

    svg += `</svg>`;
    document.getElementById('radar-container').innerHTML = svg;
}

/**
 * Retorna uma linha <tr> para a ficha técnica.
 * @param {string} label
 * @param {string|null} valor
 * @param {boolean} [italico]
 * @returns {string}
 */
function fichaLinha(label, valor, italico = false) {
    if (!valor) return '';
    const safe = sanitize(valor);
    const td = italico ? `<em>${safe}</em>` : safe;
    return `
    <tr class="border-t border-[rgba(42,37,32,0.14)]">
        <td class="py-3.5 pr-6 text-[10px] font-mono uppercase tracking-widest text-[#7A7165] align-top w-36">${sanitize(label)}</td>
        <td class="py-3.5 text-foreground leading-relaxed">${td}</td>
    </tr>`;
}

// ============================================================
// Inicialização — carrega dados do produto ao abrir a página
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Radar padrão (enquanto não há dados ou sem id na URL)
    const radarPadrao = [
        { axis: 'Doce', value: 0 }, { axis: 'Cítrico', value: 0 },
        { axis: 'Amargo', value: 0 }, { axis: 'Seco', value: 0 },
        { axis: 'Intenso', value: 0 }, { axis: 'Aromático', value: 0 }
    ];
    desenharRadar(radarPadrao);

    const params = new URLSearchParams(window.location.search);
    let id = params.get('id');

    // Suporte para URLs amigáveis: /produtos/:id
    if (!id) {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts[0] === 'produtos' && pathParts[1]) {
            id = pathParts[1];
        } else if (pathParts[0] === 'produto' && pathParts[1]) {
            id = pathParts[1];
        }
    }

    if (!id) return;

    const { data: p, error } = await db.from('produtos').select('*').eq('id', id).single();
    if (error || !p) return;

    // --- SEO Dinâmico ---
    const prodUrl = `https://ambarbotanicos.com.br/produtos/${p.id}`;
    const prodDesc = p.descricao_curta || `${sanitize(p.nome)} — ingrediente botânico selecionado pela Âmbar Botânicos. Peça via WhatsApp!`;

    document.title = `${sanitize(p.nome)} | Âmbar Botânicos`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', prodDesc.substring(0, 160));
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', prodUrl);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${sanitize(p.nome)} | Âmbar Botânicos`);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', prodDesc.substring(0, 160));
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', prodUrl);
    if (p.imagem_url) {
        document.querySelector('meta[property="og:image"]')?.setAttribute('content', p.imagem_url);
    }

    // JSON-LD Product dinâmico
    const jsonldEl = document.getElementById('jsonld-produto');
    if (jsonldEl) {
        jsonldEl.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": p.nome,
            "description": prodDesc,
            "image": p.imagem_url || '',
            "url": prodUrl,
            "brand": { "@type": "Brand", "name": "Âmbar Botânicos" }
        });
    }

    // --- Cabeçalho ---
    document.getElementById('prod-img').src = p.imagem_url;
    document.getElementById('prod-img').alt = sanitize(p.nome);
    document.getElementById('prod-nome').textContent = p.nome;
    if (p.descricao_curta) {
        document.getElementById('prod-descricao-curta').textContent = p.descricao_curta;
    } else {
        document.getElementById('prod-descricao-curta').textContent = '';
    }

    // --- Ficha técnica ---
    let fichaHtml = fichaLinha('Produto', p.nome) +
        fichaLinha('Nome científico', p.nome_cientifico, true);

    if (p.produtor && p.produtor.includes('(')) {
        const parts = p.produtor.split('|').map(x => x.trim());
        parts.forEach(part => {
            const match = part.match(/(.*?)\s*\((.*?)\/(.*?)\)/);
            if (match) {
                fichaHtml += fichaLinha('Produtor', match[1].trim());
                fichaHtml += fichaLinha('Região', match[2].trim());
            } else {
                fichaHtml += fichaLinha('Produtor', part);
            }
        });
    } else {
        fichaHtml += fichaLinha('Região / Origem', p.regiao) +
            fichaLinha('Produtor / Coletor', p.produtor);
    }

    fichaHtml += fichaLinha('Tipo', p.tipo) +
        fichaLinha('Dicas de uso', p.dicas_uso);

    document.getElementById('ficha-body').innerHTML = fichaHtml;

    // --- Descrição sensorial ---
    if (p.descricao) {
        document.getElementById('prod-descricao').textContent = p.descricao;
    }

    // --- Radar com dados reais ---
    desenharRadar([
        { axis: 'Doce', value: p.s_doce || 0 },
        { axis: 'Cítrico', value: p.s_citrico || 0 },
        { axis: 'Amargo', value: p.s_amargo || 0 },
        { axis: 'Seco', value: p.s_seco || 0 },
        { axis: 'Intenso', value: p.s_intenso || 0 },
        { axis: 'Aromático', value: p.s_aromatico || 0 },
    ]);

    // --- Parceiros ---
    const sectionParceiros = document.getElementById('section-parceiros');
    const containerParceiros = document.getElementById('parceiros-container-front');
    if (sectionParceiros && containerParceiros) {
        if (p.parceiros) {
            try {
                const parcList = JSON.parse(p.parceiros);
                if (parcList && parcList.length > 0) {
                    let parcHtml = '';
                    parcList.forEach(pc => {
                        const iconHtml = pc.icone && pc.icone.startsWith('http')
                            ? `<img src="${sanitize(pc.icone)}" alt="${sanitize(pc.nome)}" class="w-full h-full object-cover">`
                            : `<span class="text-[9px] font-mono text-muted-foreground uppercase tracking-widest text-center px-2">${sanitize(pc.icone || 'logo')}</span>`;

                        parcHtml += `
                        <div class="flex flex-col items-center gap-3">
                            <div class="w-28 h-28 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                                ${iconHtml}
                            </div>
                            <span class="text-sm text-foreground text-center">${sanitize(pc.nome)}</span>
                        </div>
                        `;
                    });
                    containerParceiros.innerHTML = parcHtml;
                } else {
                    sectionParceiros.style.display = 'none';
                }
            } catch (e) {
                sectionParceiros.style.display = 'none';
            }
        } else {
            sectionParceiros.style.display = 'none';
        }
    }
});
