/* Buyer details are saved on this device only with optional, revocable consent. */
const Shop = (() => {
    const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const digits = value => String(value).replace(/\D/g, '');
    const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
    const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be disabled. */ } };
    const validPrice = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
    const image = value => { if (typeof value !== 'string' || !value.trim()) return ''; try { const u = new URL(value, location.href); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
    function sensory(p) {
        return [['Doce','s_doce'],['Cítrico','s_citrico'],['Amargo','s_amargo'],['Seco','s_seco'],['Intenso','s_intenso'],['Aromático','s_aromatico']]
            .map(([label,key],order)=>({label,score:Number(p[key]),order}))
            .filter(item=>Number.isFinite(item.score)&&item.score>0)
            .sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,3).map(item=>item.label);
    }
    const normalize = p => ({ id: String(p.id), name: p.nome ?? p.name ?? '', description: p.descricao_curta ?? p.description ?? '', usage: String(p.dicas_uso ?? p.usage ?? '').trim(), sensory: Array.isArray(p.sensory) ? p.sensory.slice(0,3) : sensory(p), image: image(p.imagem_url ?? p.image), price: validPrice(p.preco ?? p.price) ? Number(p.preco ?? p.price) : null, hasVariations: Boolean(p.tem_variacoes ?? p.hasVariations), variations: Array.isArray(p.variacoes ?? p.variations) ? (p.variacoes ?? p.variations).filter(v => v.id && v.weight && validPrice(v.price)).map(v => ({id: String(v.id), weight: String(v.weight), price: Number(v.price), image:image(v.image)})) : [] });
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
        document.querySelectorAll('[data-shipping-banner]').forEach(el => el.textContent = `Frete grátis acima de ${money(settings.freeShipping)}`);
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
        if (existing) existing.quantity++; else cart.push({key,productId:p.id,variationId:variant?.id ?? null,name,productName:p.name,weight:variant?.weight||'',image:variant?.image||p.image,price,quantity:1});
        renderCart(); toast(`Adicionado ao carrinho: ${name}`);
    }
    function purchase(p, photo) {
        const wrap = document.createElement('div'); wrap.className='purchase';
        let selected = p.hasVariations ? p.variations[0] : null;
        const price = document.createElement('strong'); price.className='product-price';
        const update = () => {price.textContent = validPrice(selected?.price ?? p.price) && (!p.hasVariations || selected) ? money(selected?.price ?? p.price) : 'Preço sob consulta';if(photo){const src=selected?.image||p.image;if(src)photo.src=src;else photo.removeAttribute('src');}};
        wrap.append(price);
        if (p.hasVariations) {
            const pills = document.createElement('div'); pills.className='weight-options'; pills.setAttribute('aria-label','Escolha o peso');
            p.variations.forEach(v => { const b = document.createElement('button'); b.type='button'; b.textContent=v.weight; b.setAttribute('aria-pressed', String(v===selected)); b.onclick=() => { selected=v; pills.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x===b))); update(); }; pills.append(b); }); wrap.append(pills);
        }
        const button = document.createElement('button'); button.type='button'; button.className='shop-button'; button.textContent='Adicionar'; button.disabled=p.hasVariations ? !selected : !validPrice(p.price); button.onclick=() => add(p,selected); wrap.append(button); update(); return wrap;
    }
    function usageMarkup(value) {
        const references={
            'mimo café':'guia-mimo.html', 'mimo':'guia-mimo.html',
            'iced latte':'guia-mimo.html#iced-latte',
            '111 music bar':'guia-111-music-bar.html',
            'dois mundos':'guia-111-music-bar.html#dois-mundos',
            'pindorama punch':'guia-111-music-bar.html#pindorama-punch',
            'mix nuts':'guia-111-music-bar.html#mix-nuts',
            'picco':'guia-picco.html', '777':'guia-picco.html#777',
            'chai latte':'guia-picco.html#chai-latte',
            'lab cup':'guia-lab-cup.html', 'volante café':'guia-volante.html',
            'aruna café':'guia-aruna.html', 'mato café':'guia-mato.html',
            'guia âmbar':'quem-acredita.html'
        };
        const pattern=/(?<![\p{L}\p{N}])(?:111 Music Bar|Pindorama Punch|Volante Café|Guia Âmbar|Dois Mundos|Chai Latte|Iced latte|Aruna Café|Mimo Café|Mato Café|Mix Nuts|Lab Cup|Picco|Mimo|777)(?![\p{L}\p{N}])/giu;
        const text=String(value ?? '');let result='',cursor=0;
        for(const match of text.matchAll(pattern)){
            result+=escape(text.slice(cursor,match.index));
            result+=`<a class="usage-reference" href="${references[match[0].toLocaleLowerCase('pt-BR')]}"><em>${escape(match[0])}</em></a>`;
            cursor=match.index+match[0].length;
        }
        return result+escape(text.slice(cursor));
    }
    function card(raw) {
        const p = normalize(raw);
        const article = document.createElement('article'); article.className='shop-card';
        const url = `produto.html?id=${encodeURIComponent(p.id)}`;
        article.innerHTML = `<div class="shop-card-media"><a href="${url}"><div class="shop-image">${p.image ? `<img src="${escape(p.image)}" alt="${escape(p.name)}" loading="lazy">` : ''}</div></a>${p.usage ? `<button type="button" class="usage-toggle" aria-expanded="false" aria-controls="usage-${escape(p.id)}">Guia de usos</button><div id="usage-${escape(p.id)}" class="usage-preview" hidden><h3>Guia de usos</h3><p>${usageMarkup(p.usage)}</p><a href="${url}#guia-usos">Ver guia completo →</a></div>` : ''}</div><h2><a href="${url}">${escape(p.name)}</a></h2><p>${escape(p.description)}</p>${p.sensory.length ? `<p class="shop-sensory"><span>Sensorial:</span> ${escape(p.sensory.join(' · '))}</p>` : ''}`;
        const media=article.querySelector('.shop-card-media'), toggle=article.querySelector('.usage-toggle'), preview=article.querySelector('.usage-preview');
        if(toggle){
            let pinned=false;
            const show=open=>{preview.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
            media.addEventListener('pointerenter',()=>{if(matchMedia('(hover: hover)').matches)show(true);});
            media.addEventListener('pointerleave',()=>{if(!pinned&&!media.contains(document.activeElement))show(false);});
            media.addEventListener('focusin',()=>show(true));
            media.addEventListener('focusout',event=>{if(!pinned&&!media.contains(event.relatedTarget))show(false);});
            toggle.addEventListener('click',()=>{pinned=!pinned;show(pinned);});
            media.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();pinned=false;toggle.focus();show(false);}});
        }
        article.append(purchase(p,article.querySelector('.shop-image img'))); return article;
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
        footer.append(subtotalEl,aside.querySelector('#cart-freight'),finalize);aside.append(header,body,footer);document.body.append(backdrop,aside);
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
        document.getElementById('cart-finalize').hidden=detail;
        document.getElementById('cart-title').textContent=detail?'Dados do pedido':'Seu carrinho';aside.querySelector('.drawer-body').scrollTop=0;
        (detail?aside.querySelector('#cart-checkout .cart-back'):aside.querySelector('#cart-close')).focus();
    }
    function closeDrawer() {
        const aside=document.getElementById('cart-panel');if(!aside)return;aside.hidden=true;document.getElementById('cart-backdrop').hidden=true;document.body.classList.remove('cart-open');document.querySelector('.cart-header')?.setAttribute('aria-expanded','false');
        for(const [el,wasInert] of inertBeforeDrawer)el.inert=wasInert;inertBeforeDrawer.clear();focusBeforeDrawer?.focus();
    }
    function mount() {
        const grid = document.getElementById('grid-produtos-catalogo') || document.getElementById('product-overview');
        if (!grid && !document.body.hasAttribute('data-storefront')) return;
        const banner = document.createElement('p'); banner.className='shipping-banner'; banner.title='Frete cortesia sujeito à confirmação da região'; banner.innerHTML='<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h11v11H3zM14 10h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg><span data-shipping-banner></span>'; const header=document.querySelector('nav');if(header)header.before(banner);else document.body.prepend(banner);
        if (grid?.id==='grid-produtos-catalogo') grid.className='shop-grid';
        const aside = document.createElement('aside'); aside.id='cart-panel'; aside.className='cart-panel'; aside.innerHTML=`<h2>Seu carrinho</h2><ul id="cart-items" aria-live="polite"></ul><div class="cart-subtotal">Subtotal dos produtos <strong id="cart-total"></strong></div><p id="cart-freight" class="freight-hint" aria-live="polite"></p><h3>Dados para o pedido</h3><div class="buyer-toggle"><button type="button" data-buyer="pf" aria-pressed="true">Pessoa Física (CPF)</button><button type="button" data-buyer="pj" aria-pressed="false">Pessoa Jurídica (CNPJ)</button></div><form id="checkout-form"><fieldset data-fields="pf">${field('cpf','CPF',14)}${rememberControls('pf')}${field('name','Nome completo',120)}${field('phone','Telefone / WhatsApp',15,true,'tel')}${field('email','E-mail',254,false,'email')}</fieldset><fieldset data-fields="pj" hidden disabled>${field('cnpj','CNPJ completo',18)}${rememberControls('pj')}${field('legalName','Nome do Estabelecimento (Razão Social)',150)}${field('tradeName','Nome Fantasia',120)}${field('ie','Inscrição Estadual (IE)',30)}${field('businessEmail','E-mail Comercial',254,true,'email')}${field('businessPhone','Telefone / WhatsApp da empresa',15,true,'tel')}</fieldset><fieldset><legend>Endereço de entrega</legend>${field('cep','CEP',9)}<p id="cep-feedback" role="status"></p>${field('address','Rua / Logradouro',180)}${field('number','Número',20)}${field('complement','Complemento',100,false)}${field('district','Bairro',90)}${field('city','Cidade',100,true,'text','Rio de Janeiro')}${field('state','UF',2,true,'text','RJ')}<label>Observações<textarea name="notes" maxlength="500" rows="3" placeholder="Instruções de entrega, horário..."></textarea></label></fieldset><p id="checkout-error" role="alert"></p><button type="submit" class="shop-button">Enviar pedido pelo WhatsApp</button></form>`; setupDrawer(aside);
        const nav = document.querySelector('nav > div > div');
        if (nav) { const b=document.createElement('button'); b.type='button'; b.className='cart-header'; b.innerHTML='Carrinho (<span data-cart-count>0</span>)'; b.setAttribute('aria-controls','cart-panel'); b.setAttribute('aria-expanded','false'); b.onclick=()=>openDrawer('summary'); nav.append(b); }
        checkout=document.getElementById('checkout-form'); checkout.noValidate=true; checkout.dataset.buyer='pf';
        aside.querySelectorAll('[data-buyer]').forEach(b => b.onclick=() => {if(checkout.dataset.buyer!==b.dataset.buyer){clearRestoredBuyer();setRememberChoice(false);}checkout.dataset.buyer=b.dataset.buyer; aside.querySelectorAll('[data-buyer]').forEach(x => x.setAttribute('aria-pressed',String(x===b))); checkout.querySelectorAll('[data-fields]').forEach(f => {f.hidden=f.dataset.fields!==b.dataset.buyer; f.disabled=f.hidden;});});
        aside.addEventListener('click',e => {const remove=e.target.closest('[data-remove]'); if(remove){cart=cart.filter(i=>i.key!==remove.dataset.remove);renderCart();return;} const b=e.target.closest('[data-change]'); if(!b)return; cart=cart.map(i=>i.key===b.dataset.key?{...i,quantity:i.quantity+Number(b.dataset.change)}:i).filter(i=>i.quantity>0);renderCart(); const next=Array.from(aside.querySelectorAll('[data-change]')).find(x=>x.dataset.key===b.dataset.key&&x.dataset.change===b.dataset.change);(next||aside.querySelector('#cart-close')).focus();});
        const masks={cpf:maskCpf,cnpj:maskCnpj,phone:maskPhone,businessPhone:maskPhone,cep:maskCep};
        Object.entries(masks).forEach(([name,mask]) => {checkout.elements[name].inputMode='numeric';checkout.elements[name].addEventListener('input',e=>{e.target.value=mask(e.target.value);e.target.setCustomValidity('');});});
        checkout.elements.state.addEventListener('input',e=>{e.target.value=e.target.value.replace(/[^a-z]/gi,'').toUpperCase();e.target.setCustomValidity('');});
        checkout.elements.cep.addEventListener('input',lookupCep);
        ['cpf','cnpj'].forEach(name=>checkout.elements[name].addEventListener('input',restoreBuyer));
        checkout.querySelectorAll('.remember-data').forEach(el=>el.onchange=()=>{setRememberChoice(el.checked);if(!el.checked)forgetBuyer();else rememberStatus('Os dados serão salvos quando você enviar o pedido.');});
        checkout.querySelectorAll('.forget-buyer').forEach(el=>el.onclick=()=>forgetBuyer(true));
        restoreBuyer();checkout.addEventListener('submit',send); renderCart();
    }
    const buyerStorageKey='shop-buyer-v1',buyerConsentVersion=1;
    const commonBuyerFields=['cep','address','number','complement','district','city','state'];
    const personalBuyerFields={pf:['name','cpf','phone','email'],pj:['cnpj','legalName','tradeName','ie','businessEmail','businessPhone']};
    function rememberControls(type){return `<div class="remember-panel"><label class="remember-label"><input type="checkbox" class="remember-data" aria-describedby="remember-info-${type}"><span>Lembrar meus dados para compras futuras</span></label><p id="remember-info-${type}">Opcional. Ao enviar o pedido, autorizo salvar meus dados de identificação, contato e entrega neste navegador por 90 dias para preencher compras futuras após digitar o mesmo CPF ou CNPJ. Evite usar em aparelhos compartilhados.</p><button type="button" class="forget-buyer">Apagar meus dados salvos</button><p class="remember-status" role="status"></p><details><summary>Como meus dados são usados</summary><p>A Âmbar Botânicos usa os dados informados para preparar e atender seu pedido. Ao clicar em Enviar pedido pelo WhatsApp, os dados do comprador e de entrega são incluídos na mensagem aberta no WhatsApp da loja. Esta opção de lembrar é independente da compra e não autoriza publicidade.</p><p>Se você marcar a opção, CPF ou CNPJ, nome ou dados da empresa, telefone, e-mail e endereço serão salvos apenas neste navegador. Observações do pedido não serão salvas. Você pode revogar a autorização desmarcando a opção ou usando Apagar meus dados salvos. Os dados expirados são descartados na próxima abertura do site.</p><p>Para informações ou pedidos sobre seus dados enviados à loja, entre em contato pelo WhatsApp indicado no rodapé. Apagar neste navegador não apaga mensagens ou registros de pedidos já recebidos pela loja.</p></details></div>`;}
    function setRememberChoice(checked){checkout.querySelectorAll('.remember-data').forEach(el=>el.checked=checked);}
    function rememberStatus(text){checkout.querySelectorAll('.remember-status').forEach(el=>el.textContent=text);}
    function forgetBuyer(clearForm=false){
        try{localStorage.removeItem(buyerStorageKey);}catch{rememberStatus('Não foi possível apagar os dados neste navegador. Tente limpar os dados do site nas configurações do navegador.');return;}
        setRememberChoice(false);
        if(clearForm){restoredBuyer=null;cepRequest++;for(const name of [...commonBuyerFields,...personalBuyerFields.pf,...personalBuyerFields.pj]){checkout.elements[name].value='';checkout.elements[name].setCustomValidity('');}document.getElementById('cep-feedback').textContent='';}
        rememberStatus('Dados salvos apagados deste navegador.');
    }
    let restoredBuyer=null;
    function clearRestoredBuyer(){
        if(!restoredBuyer)return;
        for(const name of [...commonBuyerFields,...personalBuyerFields[restoredBuyer.buyer]]){
            if(name==='cpf'||name==='cnpj')continue;
            checkout.elements[name].value='';checkout.elements[name].setCustomValidity('');
        }
        restoredBuyer=null;cepRequest++;document.getElementById('cep-feedback').textContent='';
        setRememberChoice(false);rememberStatus('Digite o CPF ou CNPJ correspondente para preencher os dados salvos neste navegador.');
    }
    function restoreBuyer(){
        let saved;try{saved=JSON.parse(localStorage.getItem(buyerStorageKey));}catch{forgetBuyer();return;}
        if(!saved){clearRestoredBuyer();return;}
        if(saved.consentVersion!==buyerConsentVersion||!['pf','pj'].includes(saved.buyer)||!Number.isFinite(saved.expiresAt)||saved.expiresAt<=Date.now()||!saved.values||typeof saved.values!=='object'){forgetBuyer();return;}
        const buyer=checkout.dataset.buyer,documentName=buyer==='pj'?'cnpj':'cpf',documentValue=digits(checkout.elements[documentName].value);
        if(restoredBuyer&&(restoredBuyer.buyer!==buyer||restoredBuyer.document!==documentValue))clearRestoredBuyer();
        if(saved.buyer!==buyer||documentValue.length!==(buyer==='pj'?14:11)||documentValue!==digits(saved.values[documentName]))return;
        if(restoredBuyer)return;
        restoredBuyer={buyer,document:documentValue};
        for(const name of [...commonBuyerFields,...personalBuyerFields[saved.buyer]]){const input=checkout.elements[name],value=saved.values[name];if(typeof value==='string'&&value.length<=input.maxLength)input.value=value;}
        setRememberChoice(true);rememberStatus('Documento reconhecido neste navegador. Confira os dados preenchidos; você pode editá-los ou apagar.');
    }
    function rememberBuyer(values,buyer){
        if(!checkout.querySelector('.remember-data').checked)return;
        const allowed=[...commonBuyerFields,...personalBuyerFields[buyer]],savedValues=Object.fromEntries(allowed.map(name=>[name,String(values[name]??'').trim()]));
        const now=Date.now();
        try{localStorage.setItem(buyerStorageKey,JSON.stringify({consentVersion:buyerConsentVersion,consentedAt:now,expiresAt:now+90*24*60*60*1000,buyer,values:savedValues}));rememberStatus('Dados salvos neste navegador por 90 dias.');}catch{rememberStatus('Este navegador não permitiu salvar seus dados. O pedido pode continuar normalmente.');}
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
        lines.push('','*Endereço de Entrega:*',`Rua / Logradouro: ${values.address}`,`Número: ${values.number}`,...(values.complement?[`Complemento: ${values.complement}`]:[]),`Bairro: ${values.district}`,`Cidade/UF: ${values.city}/${values.state}`,`CEP: ${values.cep}`,...(values.notes?[`Observações: ${values.notes}`]:[]),'','Aguardo confirmação de disponibilidade, frete e dados de pagamento.'); return lines.join('\n');
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
        const values=Object.fromEntries(new FormData(checkout));rememberBuyer(values,buyer);const url=`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message(values,buyer))}`;
        window.open(url,'_blank','noopener,noreferrer');
    }
    async function loadSettings() {
        try {const {data,error}=await db.from('loja_config').select('whatsapp,frete_cortesia').eq('id',1).single();if(!error&&data){settings={whatsapp:String(data.whatsapp??''),freeShipping:validPrice(data.frete_cortesia)?Number(data.frete_cortesia):150};save('shop-settings-v2',settings);}} catch { /* Defaults remain usable during first deployment. */ }
        renderCart();return settings;
    }
    document.addEventListener('DOMContentLoaded',()=>{mount();settingsReady=loadSettings();});
    window.addEventListener('storage',e=>{if(e.key===buyerStorageKey&&!e.newValue&&checkout){setRememberChoice(false);rememberStatus('Dados salvos apagados em outra aba.');}if(e.key==='cart-v2'){const saved=read('cart-v2',[]);cart=Array.isArray(saved)?saved.filter(i=>i&&typeof i.key==='string'&&typeof i.name==='string'&&validPrice(i.price)&&Number.isInteger(i.quantity)&&i.quantity>0):[];renderCart();}});
    return {money,escape,image,normalize,sensory,usageMarkup,card,purchase,maskCpf,maskCnpj,maskPhone,maskCep,message,validPrice,loadSettings,getSettings:()=>settings,saveSettings(value){settings=value;save('shop-settings-v2',value);renderCart();},cacheProducts(products){save('products-v2',products);},settingsReady:()=>settingsReady};
})();
