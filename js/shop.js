/* Shared storefront, cart and checkout. No buyer details are persisted. */
const Shop = (() => {
    const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const digits = value => String(value).replace(/\D/g, '');
    const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
    const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be disabled. */ } };
    const validPrice = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
    const image = value => { if (typeof value !== 'string' || !value.trim()) return ''; try { const u = new URL(value, location.href); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
    const normalize = p => ({ id: String(p.id), name: p.nome ?? p.name ?? '', description: p.descricao_curta ?? p.description ?? '', image: image(p.imagem_url ?? p.image), price: validPrice(p.preco ?? p.price) ? Number(p.preco ?? p.price) : null, hasVariations: Boolean(p.tem_variacoes ?? p.hasVariations), variations: Array.isArray(p.variacoes ?? p.variations) ? (p.variacoes ?? p.variations).filter(v => v.id && v.weight && validPrice(v.price)).map(v => ({id: String(v.id), weight: String(v.weight), price: Number(v.price)})) : [] });
    const cachedSettings = read('shop-settings-v2', {});
    let settings = { whatsapp: typeof cachedSettings.whatsapp === 'string' ? cachedSettings.whatsapp : '5521967453706', freeShipping: validPrice(cachedSettings.freeShipping) ? Number(cachedSettings.freeShipping) : 150 };
    let settingsReady;
    let cart = read('cart-v2', []);
    cart = Array.isArray(cart) ? cart.filter(i => i && typeof i.key === 'string' && typeof i.name === 'string' && validPrice(i.price) && Number.isInteger(i.quantity) && i.quantity > 0).map(i => ({...i, price:Number(i.price)})) : [];
    let checkout, toastTimer;
    const maskCpf = v => { const d=digits(v).slice(0,11); return d.slice(0,3)+(d.length>3?'.'+d.slice(3,6):'')+(d.length>6?'.'+d.slice(6,9):'')+(d.length>9?'-'+d.slice(9):''); };
    const maskCnpj = v => { const d=digits(v).slice(0,14); return d.slice(0,2)+(d.length>2?'.'+d.slice(2,5):'')+(d.length>5?'.'+d.slice(5,8):'')+(d.length>8?'/'+d.slice(8,12):'')+(d.length>12?'-'+d.slice(12):''); };
    const maskPhone = v => { const d = digits(v).slice(0,11); return d.length <= 2 ? d : `(${d.slice(0,2)}) ${d.slice(2, d.length > 10 ? 7 : 6)}${d.length > 6 ? '-' + d.slice(d.length > 10 ? 7 : 6) : ''}`; };
    const maskCep = v => digits(v).slice(0,8).replace(/(\d{5})(\d)/,'$1-$2');
    const subtotal = () => cart.reduce((cents,i) => cents + Math.round(i.price * 100) * i.quantity, 0) / 100;
    const freight = () => subtotal() >= settings.freeShipping ? `Seu pedido atingiu ${money(settings.freeShipping)}. Condição de frete cortesia por conta da loja sujeito à confirmação da área atendida.` : `Faltam ${money(settings.freeShipping-subtotal())} para atingir ${money(settings.freeShipping)} de frete cortesia. Frete a combinar pelo WhatsApp.`;
    function renderCart() {
        save('cart-v2', cart);
        document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = cart.reduce((s,i) => s+i.quantity,0));
        const list = document.getElementById('cart-items');
        if (list) list.innerHTML = cart.length ? cart.map(i => `<li class="cart-item">${image(i.image) ? `<img class="cart-thumbnail" src="${escape(image(i.image))}" alt="${escape(i.productName||i.name)}">` : '<div class="cart-thumbnail cart-thumbnail-empty"></div>'}<div class="cart-item-info"><div class="cart-item-heading"><strong>${escape(i.productName||i.name)}</strong><span>${money(i.price*i.quantity)}</span></div><p class="cart-item-option">${escape(i.weight||'')} <span>${money(i.price)} por unidade</span></p><div class="cart-item-bottom"><div class="quantity"><button type="button" data-change="-1" data-key="${escape(i.key)}" aria-label="Diminuir quantidade de ${escape(i.name)}">−</button><span>${i.quantity}</span><button type="button" data-change="1" data-key="${escape(i.key)}" aria-label="Aumentar quantidade de ${escape(i.name)}">+</button></div><button type="button" class="cart-remove" data-remove="${escape(i.key)}" aria-label="Remover ${escape(i.name)}">Remover</button></div></div></li>`).join('') : '<li class="cart-empty">Seu carrinho está vazio.</li>';
        const total = document.getElementById('cart-total');
        if (total) total.textContent = money(subtotal());
        const hint = document.getElementById('cart-freight');
        if (hint) hint.textContent = freight();
        const finalize = document.getElementById('cart-finalize');
        if (finalize) finalize.disabled = !cart.length;
        document.querySelectorAll('[data-shipping-banner]').forEach(el => el.textContent = `Pedidos acima de ${money(settings.freeShipping)}: condição de frete cortesia (sujeito à confirmação da região)`);
    }
    function toast(message) {
        let el = document.getElementById('shop-toast');
        if (!el) { el = document.createElement('div'); el.id='shop-toast'; el.setAttribute('role','status'); document.body.append(el); }
        el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(() => el.classList.remove('visible'),3000);
    }
    function add(p, variant) {
        const price = variant ? variant.price : p.price;
        if (!validPrice(price) || (p.hasVariations && !variant)) return;
        const key = variant ? `${p.id}__${variant.id}` : p.id;
        const name = p.name + (variant ? ` (${variant.weight})` : '');
        const existing = cart.find(i => i.key === key);
        if (existing) existing.quantity++; else cart.push({key,productId:p.id,variationId:variant?.id ?? null,name,productName:p.name,weight:variant?.weight||'',image:p.image,price,quantity:1});
        renderCart(); toast(`Adicionado ao carrinho: ${name}`);
    }
    function purchase(p) {
        const wrap = document.createElement('div'); wrap.className='purchase';
        let selected = p.hasVariations ? p.variations[0] : null;
        const price = document.createElement('strong'); price.className='product-price';
        const update = () => price.textContent = validPrice(selected?.price ?? p.price) && (!p.hasVariations || selected) ? money(selected?.price ?? p.price) : 'Preço sob consulta';
        wrap.append(price);
        if (p.hasVariations) {
            const pills = document.createElement('div'); pills.className='weight-options'; pills.setAttribute('aria-label','Escolha o peso');
            p.variations.forEach(v => { const b = document.createElement('button'); b.type='button'; b.textContent=v.weight; b.setAttribute('aria-pressed', String(v===selected)); b.onclick=() => { selected=v; pills.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x===b))); update(); }; pills.append(b); }); wrap.append(pills);
        }
        const button = document.createElement('button'); button.type='button'; button.className='shop-button'; button.textContent='Adicionar'; button.disabled=p.hasVariations ? !selected : !validPrice(p.price); button.onclick=() => add(p,selected); wrap.append(button); update(); return wrap;
    }
    function card(raw) {
        const p = normalize(raw);
        const article = document.createElement('article'); article.className='shop-card';
        article.innerHTML = `<a href="produto.html?id=${encodeURIComponent(p.id)}"><div class="shop-image">${p.image ? `<img src="${escape(p.image)}" alt="${escape(p.name)}" loading="lazy">` : ''}</div><h2>${escape(p.name)}</h2></a><p>${escape(p.description)}</p>`;
        article.append(purchase(p)); return article;
    }
    const field = (name,label,max,required=true,type='text',value='') => `<label>${label}<input name="${name}" type="${type}" maxlength="${max}" ${required?'required':''} value="${escape(value)}"></label>`;
    let focusBeforeDrawer, inertBeforeDrawer = new Map();
    function setupDrawer(aside) {
        aside.className='cart-panel cart-drawer';aside.hidden=true;aside.setAttribute('role','dialog');aside.setAttribute('aria-modal','true');aside.setAttribute('aria-labelledby','cart-title');
        const backdrop=document.createElement('div');backdrop.id='cart-backdrop';backdrop.className='cart-backdrop';backdrop.hidden=true;backdrop.onclick=closeDrawer;
        const header=document.createElement('header');header.className='drawer-header';const title=aside.querySelector('h2');title.id='cart-title';
        const close=document.createElement('button');close.type='button';close.id='cart-close';close.textContent='Fechar';close.setAttribute('aria-label','Fechar carrinho');close.onclick=closeDrawer;header.append(title,close);
        const body=document.createElement('div');body.className='drawer-body';const summary=document.createElement('section');summary.id='cart-summary';summary.append(aside.querySelector('#cart-items'));
        const details=document.createElement('section');details.id='cart-checkout';details.hidden=true;
        const back=document.createElement('button');back.type='button';back.className='cart-back';back.textContent='Voltar ao carrinho';back.onclick=()=>openDrawer('summary');details.append(back,aside.querySelector('h3'),aside.querySelector('.buyer-toggle'),aside.querySelector('#checkout-form'));
        body.append(summary,details);
        const footer=document.createElement('footer');footer.className='drawer-footer';const subtotalEl=aside.querySelector('.cart-subtotal');subtotalEl.firstChild.textContent='Subtotal';
        const finalize=document.createElement('button');finalize.id='cart-finalize';finalize.type='button';finalize.className='shop-button';finalize.textContent='Finalizar compra';finalize.onclick=()=>openDrawer('checkout');
        const full=document.createElement('button');full.type='button';full.className='cart-full';full.textContent='Ver carrinho completo';full.onclick=()=>{openDrawer('summary');body.scrollTop=0;};
        footer.append(subtotalEl,aside.querySelector('#cart-freight'),finalize,full);aside.append(header,body,footer);document.body.append(backdrop,aside);
        document.addEventListener('keydown',e=>{
            if(aside.hidden)return;
            if(e.key==='Escape'){e.preventDefault();closeDrawer();}
            if(e.key==='Tab'){
                const controls=Array.from(aside.querySelectorAll('button,input,textarea,a[href]')).filter(el=>!el.disabled&&el.getClientRects().length);
                const first=controls[0],last=controls[controls.length-1];
                if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
                else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
            }
        });
    }
    function openDrawer(step) {
        const aside=document.getElementById('cart-panel');if(!aside)return;
        if(aside.hidden){focusBeforeDrawer=document.activeElement;inertBeforeDrawer=new Map();for(const el of document.body.children){if(el!==aside&&el.id!=='cart-backdrop'&&el.id!=='shop-toast'){inertBeforeDrawer.set(el,el.inert);el.inert=true;}}}
        aside.hidden=false;document.getElementById('cart-backdrop').hidden=false;document.body.classList.add('cart-open');
        document.querySelector('.cart-header')?.setAttribute('aria-expanded','true');
        const detail=step==='checkout';document.getElementById('cart-summary').hidden=detail;document.getElementById('cart-checkout').hidden=!detail;
        document.getElementById('cart-finalize').hidden=detail;aside.querySelector('.cart-full').hidden=detail;
        document.getElementById('cart-title').textContent=detail?'Dados do pedido':'Seu carrinho';aside.querySelector('.drawer-body').scrollTop=0;
        (detail?aside.querySelector('#cart-checkout .cart-back'):aside.querySelector('#cart-close')).focus();
    }
    function closeDrawer() {
        const aside=document.getElementById('cart-panel');if(!aside)return;aside.hidden=true;document.getElementById('cart-backdrop').hidden=true;document.body.classList.remove('cart-open');document.querySelector('.cart-header')?.setAttribute('aria-expanded','false');
        for(const [el,wasInert] of inertBeforeDrawer)el.inert=wasInert;inertBeforeDrawer.clear();focusBeforeDrawer?.focus();
    }
    function mount() {
        const grid = document.getElementById('grid-produtos-catalogo') || document.getElementById('product-overview');
        if (!grid) return;
        const banner = document.createElement('p'); banner.className='shipping-banner'; banner.dataset.shippingBanner=''; grid.parentNode.insertBefore(banner,grid);
        if (grid.id==='grid-produtos-catalogo') grid.className='shop-grid';
        const aside = document.createElement('aside'); aside.id='cart-panel'; aside.className='cart-panel'; aside.innerHTML=`<h2>Seu carrinho</h2><ul id="cart-items" aria-live="polite"></ul><div class="cart-subtotal">Subtotal dos produtos <strong id="cart-total"></strong></div><p id="cart-freight" class="freight-hint" aria-live="polite"></p><h3>Dados para o pedido</h3><div class="buyer-toggle"><button type="button" data-buyer="pf" aria-pressed="true">Pessoa Física (CPF)</button><button type="button" data-buyer="pj" aria-pressed="false">Pessoa Jurídica (CNPJ)</button></div><form id="checkout-form"><fieldset data-fields="pf">${field('name','Nome completo',120)}${field('cpf','CPF',14)}${field('phone','Telefone / WhatsApp',15,true,'tel')}${field('email','E-mail',254,false,'email')}</fieldset><fieldset data-fields="pj" hidden disabled>${field('cnpj','CNPJ completo',18)}${field('legalName','Nome do Estabelecimento (Razão Social)',150)}${field('tradeName','Nome Fantasia',120)}${field('ie','Inscrição Estadual (IE)',30)}${field('businessEmail','E-mail Comercial',254,true,'email')}${field('businessPhone','Telefone / WhatsApp da empresa',15,true,'tel')}</fieldset><fieldset><legend>Endereço de entrega</legend>${field('cep','CEP',9)}<p id="cep-feedback" role="status"></p>${field('address','Endereço (Rua e número)',180)}${field('complement','Complemento',100,false)}${field('district','Bairro',90)}${field('city','Cidade',100,true,'text','Rio de Janeiro')}${field('state','UF',2,true,'text','RJ')}<label>Observações<textarea name="notes" maxlength="500" rows="3" placeholder="Instruções de entrega, horário..."></textarea></label></fieldset><p id="checkout-error" role="alert"></p><button type="submit" class="shop-button">Enviar pedido pelo WhatsApp</button></form>`; setupDrawer(aside);
        const nav = document.querySelector('nav > div > div');
        if (nav) { const b=document.createElement('button'); b.type='button'; b.className='cart-header'; b.innerHTML='Carrinho (<span data-cart-count>0</span>)'; b.setAttribute('aria-controls','cart-panel'); b.setAttribute('aria-expanded','false'); b.onclick=()=>openDrawer('summary'); nav.append(b); }
        checkout=document.getElementById('checkout-form'); checkout.noValidate=true; checkout.dataset.buyer='pf';
        aside.querySelectorAll('[data-buyer]').forEach(b => b.onclick=() => {checkout.dataset.buyer=b.dataset.buyer; aside.querySelectorAll('[data-buyer]').forEach(x => x.setAttribute('aria-pressed',String(x===b))); checkout.querySelectorAll('[data-fields]').forEach(f => {f.hidden=f.dataset.fields!==b.dataset.buyer; f.disabled=f.hidden;});});
        aside.addEventListener('click',e => {const remove=e.target.closest('[data-remove]'); if(remove){cart=cart.filter(i=>i.key!==remove.dataset.remove);renderCart();return;} const b=e.target.closest('[data-change]'); if(!b)return; cart=cart.map(i=>i.key===b.dataset.key?{...i,quantity:i.quantity+Number(b.dataset.change)}:i).filter(i=>i.quantity>0);renderCart(); const next=Array.from(aside.querySelectorAll('[data-change]')).find(x=>x.dataset.key===b.dataset.key&&x.dataset.change===b.dataset.change);(next||aside.querySelector('#cart-close')).focus();});
        const masks={cpf:maskCpf,cnpj:maskCnpj,phone:maskPhone,businessPhone:maskPhone,cep:maskCep};
        Object.entries(masks).forEach(([name,mask]) => {checkout.elements[name].inputMode='numeric';checkout.elements[name].addEventListener('input',e=>{e.target.value=mask(e.target.value);e.target.setCustomValidity('');});});
        checkout.elements.state.addEventListener('input',e=>{e.target.value=e.target.value.replace(/[^a-z]/gi,'').toUpperCase();e.target.setCustomValidity('');});
        checkout.elements.cep.addEventListener('input',lookupCep);
        checkout.addEventListener('submit',send); renderCart();
    }
    let cepRequest=0;
    async function lookupCep() {
        const request=++cepRequest, cep=digits(checkout.elements.cep.value), feedback=document.getElementById('cep-feedback');
        feedback.textContent=''; if(cep.length!==8)return;
        feedback.textContent='Buscando endereço pelo CEP...';
        const originals=Object.fromEntries(['address','district','city','state'].map(n=>[n,checkout.elements[n].value]));
        try {
            const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`); if(!response.ok)throw new Error(); const data=await response.json(); if(request!==cepRequest)return;
            if(data.erro)throw new Error();
            Object.entries({address:data.logradouro,district:data.bairro,city:data.localidade,state:data.uf}).forEach(([n,v])=>{if(v && checkout.elements[n].value===originals[n])checkout.elements[n].value=v;});
            feedback.textContent='Endereço preenchido automaticamente. Complete o número do imóvel.';
        } catch { if(request===cepRequest)feedback.textContent='CEP não encontrado. Preencha o endereço manualmente.'; }
    }
    function message(values, buyer) {
        const lines=['*NOVO PEDIDO PELO SITE*','','*Itens:*',...cart.map(i=>`${i.quantity}x ${i.name} — ${money(i.price*i.quantity)}`),'',`*Subtotal dos produtos:* ${money(subtotal())}`,`*Frete:* ${subtotal()>=settings.freeShipping?`Pedido acima de ${money(settings.freeShipping)} — verificar condição de frete cortesia`:'Frete a combinar pelo WhatsApp.'}`,''];
        if(buyer==='pj')lines.push('*Tipo de Comprador:* Pessoa Jurídica (CNPJ)',`CNPJ: ${values.cnpj}`,`Razão Social: ${values.legalName}`,`Nome Fantasia: ${values.tradeName}`,`Inscrição Estadual (IE): ${values.ie}`,`E-mail Comercial: ${values.businessEmail}`,`Telefone / WhatsApp: ${values.businessPhone}`);
        else lines.push('*Tipo de Comprador:* Pessoa Física (CPF)',`Nome: ${values.name}`,`CPF: ${values.cpf}`,`WhatsApp: ${values.phone}`,...(values.email?[`E-mail: ${values.email}`]:[]));
        lines.push('','*Endereço de Entrega:*',`Endereço: ${values.address}`,...(values.complement?[`Complemento: ${values.complement}`]:[]),`Bairro: ${values.district}`,`Cidade/UF: ${values.city}/${values.state}`,`CEP: ${values.cep}`,...(values.notes?[`Observações: ${values.notes}`]:[]),'','Aguardo confirmação de disponibilidade, frete e dados de pagamento.'); return lines.join('\n');
    }
    function send(e) {
        e.preventDefault();const error=document.getElementById('checkout-error');error.textContent='';
        if(!cart.length){error.textContent='Seu carrinho está vazio.';return;}
        if(!/^\d{12,15}$/.test(settings.whatsapp)){error.textContent='O lojista precisa configurar o número de WhatsApp no painel de administração.';return;}
        const buyer=checkout.dataset.buyer;
        const checks=buyer==='pj'?{cnpj:14,businessPhone:10}:{cpf:11,phone:10};checks.cep=8;
        Object.entries(checks).forEach(([n,len])=>{const size=digits(checkout.elements[n].value).length;checkout.elements[n].setCustomValidity(n.toLowerCase().includes('phone')?(size>=10?'':'Informe ao menos 10 dígitos.'):(size===len?'':`Informe ${len} dígitos.`));});
        checkout.elements.state.setCustomValidity(/^[A-Z]{2}$/.test(checkout.elements.state.value)?'':'Informe a UF com duas letras.');
        for(const input of checkout.querySelectorAll('input[required]')) {if(!input.closest('fieldset').disabled && !input.value.trim())input.setCustomValidity('Preencha este campo.');else if(!checks[input.name] && input.name!=='state')input.setCustomValidity('');}
        if(!checkout.reportValidity())return;
        const values=Object.fromEntries(new FormData(checkout));const url=`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message(values,buyer))}`;
        window.open(url,'_blank','noopener,noreferrer');
    }
    async function loadSettings() {
        try {const {data,error}=await db.from('loja_config').select('whatsapp,frete_cortesia').eq('id',1).single();if(!error&&data){settings={whatsapp:String(data.whatsapp??''),freeShipping:validPrice(data.frete_cortesia)?Number(data.frete_cortesia):150};save('shop-settings-v2',settings);}} catch { /* Defaults remain usable during first deployment. */ }
        renderCart();return settings;
    }
    document.addEventListener('DOMContentLoaded',()=>{mount();settingsReady=loadSettings();});
    window.addEventListener('storage',e=>{if(e.key==='cart-v2'){const saved=read('cart-v2',[]);cart=Array.isArray(saved)?saved.filter(i=>i&&typeof i.key==='string'&&typeof i.name==='string'&&validPrice(i.price)&&Number.isInteger(i.quantity)&&i.quantity>0):[];renderCart();}});
    return {money,escape,image,normalize,card,purchase,maskCpf,maskCnpj,maskPhone,maskCep,message,validPrice,loadSettings,getSettings:()=>settings,saveSettings(value){settings=value;save('shop-settings-v2',value);renderCart();},cacheProducts(products){save('products-v2',products);},settingsReady:()=>settingsReady};
})();
