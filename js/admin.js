// ============================================================
// LÓGICA DO PAINEL ADMIN (Gestão e Cadastro)
// ============================================================

// --- 0. SEGURANÇA: CHECAGEM DE AUTENTICAÇÃO ---
async function verificarSessao() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}
verificarSessao();

async function deslogar() {
    await db.auth.signOut();
    window.location.href = 'login.html';
}

// --- 1. VARIÁVEIS GLOBAIS DE EDIÇÃO ---
let editIdGlobal = null;
let editImagemUrlGlobal = null;

// --- 2. WIDGET DE SELECT CUSTOMIZÁVEL (Estilo Notion) ---
class CustomSelectWidget {
    constructor(container) {
        this.container = container;
        this.storageKey = container.getAttribute('data-storage-key');
        this.placeholderString = container.getAttribute('data-placeholder');
        this.inputClass = container.getAttribute('data-input-class');

        this.container.innerHTML = `
            <input type="hidden" class="${this.inputClass}" value="">
            <div class="custom-select-wrapper">
                <div class="custom-select-trigger" tabindex="0">
                    <span class="text-sm text-foreground/50 select-none pointer-events-none pl-2">${this.placeholderString}</span>
                </div>
                <div class="custom-select-dropdown">
                    <input type="text" class="custom-select-search" placeholder="Selecione ou crie um novo...">
                    <div class="custom-select-options"></div>
                </div>
            </div>
        `;

        this.trigger = this.container.querySelector('.custom-select-trigger');
        this.dropdown = this.container.querySelector('.custom-select-dropdown');
        this.searchInput = this.container.querySelector('.custom-select-search');
        this.optionsContainer = this.container.querySelector('.custom-select-options');
        this.hiddenInput = this.container.querySelector('input[type="hidden"]');

        this.options = this.loadOptions();
        this.selectedValue = null;

        this.bindEvents();
    }

    loadOptions() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return [];
    }

    saveOptions() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.options));
    }

    renderOptions(filterText = '') {
        this.optionsContainer.innerHTML = '';
        const lowerFilter = filterText.toLowerCase();

        let hasExactMatch = false;

        this.options.forEach(opt => {
            if (opt.toLowerCase().includes(lowerFilter)) {
                if (opt.toLowerCase() === lowerFilter) hasExactMatch = true;
                this.addOptionElement(opt);
            }
        });

        if (filterText.trim() && !hasExactMatch) {
            const createEl = document.createElement('div');
            createEl.className = 'custom-option-create';
            const createLabel = document.createElement('span');
            createLabel.className = 'text-foreground/50 text-xs uppercase tracking-wider';
            createLabel.textContent = 'Criar';
            const createBadge = document.createElement('span');
            createBadge.className = 'tag-badge';
            createBadge.textContent = filterText;
            createEl.appendChild(createLabel);
            createEl.appendChild(document.createTextNode(' '));
            createEl.appendChild(createBadge);
            createEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const newOpt = filterText.trim();
                this.options.push(newOpt);
                this.saveOptions();
                this.selectOption(newOpt);
                this.closeDropdown();
            });
            this.optionsContainer.appendChild(createEl);
        }
    }

    addOptionElement(opt) {
        const el = document.createElement('div');
        el.className = 'custom-option';

        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.textContent = opt;

        const delBtn = document.createElement('span');
        delBtn.className = 'btn-delete-option';
        delBtn.title = 'Excluir opção';
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

        el.appendChild(badge);
        el.appendChild(delBtn);

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectOption(opt);
            this.closeDropdown();
        });

        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.options = this.options.filter(o => o !== opt);
            this.saveOptions();
            if (this.selectedValue === opt) this.selectOption(null);
            this.renderOptions(this.searchInput.value);
        });

        this.optionsContainer.appendChild(el);
    }

    selectOption(opt) {
        this.selectedValue = opt;
        this.hiddenInput.value = opt || '';
        this.trigger.innerHTML = '';

        if (opt) {
            const badge = document.createElement('span');
            badge.className = 'tag-badge ml-1';
            badge.textContent = opt + ' ';

            const removeBtn = document.createElement('span');
            removeBtn.className = 'tag-badge-remove ml-1';
            removeBtn.title = 'Remover';
            removeBtn.textContent = 'x';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectOption(null);
            });

            badge.appendChild(removeBtn);
            this.trigger.appendChild(badge);
        } else {
            const placeholder = document.createElement('span');
            placeholder.className = 'text-sm text-foreground/50 select-none pointer-events-none pl-2';
            placeholder.textContent = this.placeholderString;
            this.trigger.appendChild(placeholder);
        }
    }

    openDropdown() {
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('open'));
        this.dropdown.classList.add('open');
        this.searchInput.value = '';
        this.renderOptions();
        this.searchInput.focus();
    }

    closeDropdown() {
        this.dropdown.classList.remove('open');
    }

    bindEvents() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.dropdown.classList.contains('open')) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        });

        this.searchInput.addEventListener('input', (e) => {
            this.renderOptions(e.target.value);
        });

        this.dropdown.addEventListener('click', (e) => e.stopPropagation());
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('open'));
});


// --- 1. SLIDERS PERFIL SENSORIAL ---
const EIXOS = ['doce', 'citrico', 'amargo', 'seco', 'intenso', 'aromatico'];
const LABELS = { doce: 'Doce', citrico: 'Cítrico', amargo: 'Amargo', seco: 'Seco', intenso: 'Intenso', aromatico: 'Aromático' };

function renderizarSliders() {
    const container = document.getElementById('sliders-container');
    if (!container) return;

    container.innerHTML = EIXOS.map(eixo => `
        <div>
            <div class="flex justify-between items-center text-xs font-medium mb-3 text-foreground/80">
                <span>${LABELS[eixo]}</span>
                <span id="val-${eixo}" class="text-foreground">0</span>
            </div>
            <input type="range" id="s_${eixo}" min="0" max="5" step="0.5" value="0"
                oninput="document.getElementById('val-${eixo}').textContent = this.value.replace('.', ',')">
        </div>
    `).join('');
}


// --- 2. EVENTOS DO FORM E WIDGETS ---
function inicializarEventosForm() {
    const btnProximo = document.getElementById('btn-proximo');
    const btnVoltar = document.getElementById('btn-voltar');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');

    // Inicializa widgets dos grupos de produtor já presentes no HTML estático
    document.querySelectorAll('#produtores-container .custom-select-widget').forEach(w => {
        if (!w.querySelector('input[type="hidden"]')) {
            new CustomSelectWidget(w);
        }
    });

    const imagemFile = document.getElementById('imagemFile');
    const uploadIcon = document.getElementById('uploadIcon');
    const uploadLabel = document.getElementById('uploadLabel');
    const previewImg = document.getElementById('previewImg');

    if (imagemFile) {
        imagemFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (previewImg) {
                    previewImg.src = ev.target.result;
                    previewImg.classList.remove('hidden');
                }
                if (uploadIcon) uploadIcon.classList.add('opacity-0');
                if (uploadLabel) uploadLabel.classList.add('opacity-0');
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnProximo) {
        btnProximo.addEventListener('click', () => {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
        });
    }

    if (btnVoltar) {
        btnVoltar.addEventListener('click', () => {
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
        });
    }

    const btnAddProdutor = document.getElementById('btn-add-produtor');
    if (btnAddProdutor) {
        btnAddProdutor.addEventListener('click', () => {
            adicionarProdutorForm('', '', '');
        });
    }

    const btnAddParceiro = document.getElementById('btn-add-parceiro');
    if (btnAddParceiro) {
        btnAddParceiro.addEventListener('click', () => {
            adicionarParceiroForm('', '');
        });
    }
}

// --- LOGICA REUTILIZAVEL DE PARCEIRO ---
function adicionarParceiroForm(urlVal = '', nomeVal = '') {
    const container = document.getElementById('parceiros-container');
    const template = document.getElementById('template-parceiro');
    if (!template || !container) return;

    const clone = template.content.cloneNode(true);
    clone.querySelector('.btn-remover-parceiro').addEventListener('click', (e) => {
        e.target.closest('.parceiro-group').remove();
    });
    clone.querySelector('.parceiro-url-input').value = urlVal;
    clone.querySelector('.parceiro-nome-input').value = nomeVal;

    let infoMsg = '';
    if (urlVal) {
        infoMsg = `<p class="text-[10px] text-muted-foreground mt-1">Imagem salva carregada.</p>`;
    }
    const flex1 = clone.querySelector('.flex-1');
    if (flex1 && infoMsg) {
        flex1.insertAdjacentHTML('beforeend', infoMsg);
    }

    container.appendChild(clone);
}

// --- LOGICA REUTILIZAVEL DE PRODUTOR ---
function adicionarProdutorForm(nomeVal = '', origemVal = '', tipoVal = '') {
    const container = document.getElementById('produtores-container');
    const template = document.getElementById('template-produtor');

    if (!template || !container) return;

    const clone = template.content.cloneNode(true);

    clone.querySelector('.btn-remover-produtor').addEventListener('click', (e) => {
        e.target.closest('.produtor-group').remove();
    });

    const widgetsElements = clone.querySelectorAll('.custom-select-widget');
    const widgets = Array.from(widgetsElements).map(w => new CustomSelectWidget(w));

    if (nomeVal && widgets[0]) widgets[0].selectOption(nomeVal);
    if (origemVal && widgets[1]) widgets[1].selectOption(origemVal);
    if (tipoVal && widgets[2]) widgets[2].selectOption(tipoVal);

    container.appendChild(clone);
}


// --- 3. SALVAR NOVO PRODUTO / EDITAR ---
const formProdutoCria = document.getElementById('formProdutoCria');
if (formProdutoCria) {
    formProdutoCria.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);

        const imagemFile = document.getElementById('imagemFile');
        const file = imagemFile ? imagemFile.files[0] : null;
        if (!file && !ShopAdmin.imageUrl() && !editImagemUrlGlobal) {
            mostrarMsg('error', 'Por favor selecione uma foto do produto (Etapa 1).');
            setLoading(false);
            return;
        }

        try {
            if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) throw new Error('Use uma foto JPG, PNG ou WebP de até 5 MB.');
            const commerce = ShopAdmin.payload();
            const produtorGroups = document.querySelectorAll('#produtores-container .produtor-group');
            const produtores = [];
            produtorGroups.forEach(group => {
                produtores.push({
                    nome: group.querySelector('.produtor-input')?.value?.trim() || '',
                    origem: group.querySelector('.origem-input')?.value?.trim() || '',
                    tipo: group.querySelector('.tipo-input')?.value?.trim() || ''
                });
            });

            const produtorString = produtores.map(p => `${p.nome} (${p.origem}/${p.tipo})`).join(' | ');

            const parceirosGroups = document.querySelectorAll('#parceiros-container .parceiro-group');
            const parceirosData = [];

            for (let i = 0; i < parceirosGroups.length; i++) {
                const group = parceirosGroups[i];
                const nm = group.querySelector('.parceiro-nome-input')?.value?.trim() || '';
                const fileInput = group.querySelector('.parceiro-imagem-input');
                let ic = group.querySelector('.parceiro-url-input')?.value?.trim() || ''; // hidden field

                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const pFile = fileInput.files[0];
                    const pFileName = `${Date.now()}-parceiro-${pFile.name.replace(/\s+/g, '-')}`;
                    const { error: pUploadError } = await db.storage
                        .from('produtos-imagens')
                        .upload(pFileName, pFile, { cacheControl: '3600', upsert: false });
                    if (!pUploadError) {
                        const { data: pUrlData } = db.storage.from('produtos-imagens').getPublicUrl(pFileName);
                        ic = pUrlData.publicUrl;
                    }
                }

                if (nm) parceirosData.push({ icone: ic, nome: nm });
            }

            const nomeArquivo = file ? `${Date.now()}-${file.name.replace(/\s+/g, '-')}` : null;
            let finalImageUrl = ShopAdmin.imageUrl() || editImagemUrlGlobal || '';

            if (file) {
                const { error: uploadError } = await db.storage
                    .from('produtos-imagens')
                    .upload(nomeArquivo, file, { cacheControl: '3600', upsert: false });

                if (uploadError) {
                    mostrarMsg('error', 'Erro ao enviar foto: ' + uploadError.message);
                    setLoading(false);
                    return;
                }
                const { data: urlData } = db.storage.from('produtos-imagens').getPublicUrl(nomeArquivo);
                finalImageUrl = urlData.publicUrl;
            }

            const payload = {
                ...commerce,
                nome: v('nome').slice(0, 100),
                nome_cientifico: v('nome_cientifico'),
                descricao_curta: v('descricao_curta').slice(0, 250),
                produtor: produtorString,
                regiao: produtores[0]?.origem || '',
                tipo: produtores[0]?.tipo || '',
                descricao: v('descricao'),
                dicas_uso: v('dicas_uso'),
                imagem_url: finalImageUrl,
                parceiros: JSON.stringify(parceirosData),
                s_doce: parseFloat(sv('doce')),
                s_citrico: parseFloat(sv('citrico')),
                s_amargo: parseFloat(sv('amargo')),
                s_seco: parseFloat(sv('seco')),
                s_intenso: parseFloat(sv('intenso')),
                s_aromatico: parseFloat(sv('aromatico')),
            };

            let dbError;
            if (editIdGlobal) {
                const res = await db.from('produtos').update(payload).eq('id', editIdGlobal).select();
                dbError = res.error;
            } else {
                const res = await db.from('produtos').insert([payload]).select();
                dbError = res.error;
            }

            if (dbError) {
                mostrarMsg('error', 'Não foi possível salvar. Confira os campos e se a atualização do banco para preços e variações foi aplicada.');
                setLoading(false);
                return;
            }

            mostrarMsg('success', editIdGlobal ? 'Produto atualizado com sucesso!' : 'Produto publicado com sucesso!');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);

        } catch (err) {
            mostrarMsg('error', 'Erro inesperado: ' + err.message);
        }
        setLoading(false);
    });
}

// Helpers
function v(id) { return (document.getElementById(id) || {}).value?.trim() || ''; }
function sv(eixo) { return document.getElementById(`s_${eixo}`)?.value || '0'; }
function setLoading(on) {
    const btn = document.getElementById('btnSalvar');
    const t = document.getElementById('btnTexto');
    const s = document.getElementById('spinner');
    if (btn) btn.disabled = on;
    if (t) t.textContent = on ? 'Salvando...' : 'Salvar';
    if (s) s.classList.toggle('hidden', !on);
}
function mostrarMsg(tipo, texto) {
    const msg = document.getElementById('msg');
    if (!msg) return;
    msg.classList.remove('hidden');
    msg.className = `text-sm font-medium text-center p-3 rounded-sm mb-4 ${tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
    msg.textContent = texto;
}

// ===================================
// LÓGICA DA GRID ADMIN E PREENCHIMENTO EDIÇÃO
// ===================================

async function carregarParaEdicao(id) {
    const { data: p, error } = await db.from('produtos').select('*').eq('id', id).single();
    if (error) {
        mostrarMsg('error', 'Erro ao carregar produto para edição.');
        return;
    }

    ShopAdmin.populate(p);
    document.getElementById('nome').value = p.nome || '';
    document.getElementById('nome_cientifico').value = p.nome_cientifico || '';
    document.getElementById('descricao_curta').value = p.descricao_curta || '';
    document.getElementById('dicas_uso').value = p.dicas_uso || '';
    document.getElementById('descricao').value = p.descricao || '';

    // Preview de foto nativa preexistente
    editImagemUrlGlobal = p.imagem_url;
    if (p.imagem_url) {
        const previewImg = document.getElementById('previewImg');
        const uploadIcon = document.getElementById('uploadIcon');
        const uploadLabel = document.getElementById('uploadLabel');
        if (previewImg) {
            previewImg.src = p.imagem_url;
            previewImg.classList.remove('hidden');
            if (uploadIcon) uploadIcon.classList.add('opacity-0');
            if (uploadLabel) uploadLabel.classList.add('opacity-0');
        }
    }

    // Sliders
    EIXOS.forEach(eixo => {
        const val = p[`s_${eixo}`];
        const slider = document.getElementById(`s_${eixo}`);
        if (slider && val !== undefined) {
            slider.value = val;
            document.getElementById(`val-${eixo}`).textContent = String(val).replace('.', ',');
        }
    });

    // Povoar parceiros
    const parcContainer = document.getElementById('parceiros-container');
    if (parcContainer) {
        parcContainer.innerHTML = '';
        if (p.parceiros) {
            try {
                const parcList = JSON.parse(p.parceiros);
                parcList.forEach(pc => adicionarParceiroForm(pc.icone, pc.nome));
            } catch (e) { }
        }
        if (parcContainer.children.length === 0) adicionarParceiroForm('', '');
    }

    // Povoar produtores
    const container = document.getElementById('produtores-container');
    if (container) {
        container.innerHTML = '';
        if (p.produtor) {
            const parts = p.produtor.split('|').map(x => x.trim());
            parts.forEach(part => {
                const match = part.match(/(.*?)\s*\((.*?)\/(.*?)\)/);
                if (match) adicionarProdutorForm(match[1].trim(), match[2].trim(), match[3].trim());
                else adicionarProdutorForm(part, '', '');
            });
        } else {
            adicionarProdutorForm('', '', '');
        }
    }
}

async function deletarProduto(id) {
    if (!confirm('Tem certeza que deseja excluir permanentemente este produto?')) return;
    try {
        const { error } = await db.from('produtos').delete().eq('id', id);
        if (error) throw error;
        carregarGridAdmin();
    } catch (e) {
        mostrarMsg('error', 'Erro ao excluir o produto. Tente novamente.');
    }
}

async function copiarProduto(id) {
    try {
        const { data, error } = await db.from('produtos').select('*').eq('id', id).single();
        if (error) throw error;

        delete data.id;
        delete data.criado_em;
        if (data.atualizado_em) delete data.atualizado_em;

        data.nome = data.nome + " (Cópia)";

        const { error: insertError } = await db.from('produtos').insert([data]);
        if (insertError) throw insertError;

        carregarGridAdmin();
    } catch (e) {
        mostrarMsg('error', 'Erro ao duplicar o produto. Tente novamente.');
    }
}

async function carregarGridAdmin() {
    const grid = document.getElementById('grid-admin-produtos');
    const loadingMsg = document.getElementById('loading-msg');
    if (!grid) return;

    const { data: produtos, error } = await db
        .from('produtos').select('*')
        .order('criado_em', { ascending: false });

    if (loadingMsg) loadingMsg.style.display = 'none';

    if (error || !produtos) {
        grid.innerHTML += '<p class="text-sm text-red-500">Erro ao carregar os produtos.</p>';
        return;
    }

    const cartoes = Array.from(grid.children).filter(c => c.tagName === 'DIV');
    cartoes.forEach(c => c.remove());

    produtos.forEach(p => {
        const dataFormatada = p.criado_em
            ? new Date(p.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            : 'Desconhecida';

        const card = document.createElement('div');
        card.className = 'relative flex flex-col justify-between min-h-[220px] bg-[#F5F5F5] border border-border rounded-sm p-5';

        const header = document.createElement('div');
        header.className = 'flex items-start justify-between';

        const nomeProd = document.createElement('p');
        nomeProd.className = 'font-medium text-foreground text-sm';
        nomeProd.textContent = p.nome;

        const menuBtn = document.createElement('button');
        menuBtn.className = 'p-1 hover:bg-[#EBEBEB] rounded transition-colors';
        menuBtn.title = 'Opções';
        menuBtn.setAttribute('onclick', `toggleMenu('${p.id}')`);
        menuBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>`;

        header.appendChild(nomeProd);
        header.appendChild(menuBtn);

        const dataEl = document.createElement('p');
        dataEl.className = 'text-[10px] italic text-[#7A7165]';
        dataEl.textContent = `Última atualização: ${dataFormatada}`;

        const menu = document.createElement('div');
        menu.id = `menu-${p.id}`;
        menu.className = 'hidden absolute top-12 right-4 w-40 bg-white border border-border rounded-sm shadow-md z-10 flex-col';
        menu.innerHTML = `
            <button onclick="window.location.href='criar-produto.html?edit=${p.id}'" class="flex items-center justify-between w-full p-3 text-sm text-foreground hover:bg-gray-50 border-b border-border text-left">Editar <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
            <button onclick="copiarProduto('${p.id}')" class="flex items-center justify-between w-full p-3 text-sm text-foreground hover:bg-gray-50 border-b border-border text-left">Criar cópia <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button onclick="deletarProduto('${p.id}')" class="flex items-center justify-between w-full p-3 text-sm text-red-600 hover:bg-red-50 text-left">Remover <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        `;

        card.appendChild(header);
        card.appendChild(dataEl);
        card.appendChild(menu);
        grid.appendChild(card);
    });
}

function toggleMenu(id) {
    const todosMenus = document.querySelectorAll('[id^="menu-"]');
    todosMenus.forEach(menu => {
        if (menu.id !== `menu-${id}`) {
            menu.classList.add('hidden');
            menu.classList.remove('flex');
        }
    });

    const menu = document.getElementById(`menu-${id}`);
    if (menu) {
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            menu.classList.add('flex');
        } else {
            menu.classList.add('hidden');
            menu.classList.remove('flex');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.deletarProduto = deletarProduto;
    window.copiarProduto = copiarProduto;
    window.toggleMenu = toggleMenu;
    window.deslogar = deslogar;

    renderizarSliders();
    inicializarEventosForm();
    carregarGridAdmin();

    // Inicialização da Edição
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
        editIdGlobal = editId;
        const tituloEl = document.querySelector('h1');
        if (tituloEl) tituloEl.textContent = 'Editar produto';
        carregarParaEdicao(editId);
    } else {
        const container = document.getElementById('produtores-container');
        if (container && container.children.length === 0) {
            adicionarProdutorForm('', '', '');
        }
        const pContainer = document.getElementById('parceiros-container');
        if (pContainer && pContainer.children.length === 0) {
            adicionarParceiroForm('', '');
        }
    }
});
