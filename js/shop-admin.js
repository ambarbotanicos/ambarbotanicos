const ShopAdmin = (() => {
    let root;
    function row(variant={id:crypto.randomUUID(),weight:'',price:''}) {
        const div=document.createElement('div');div.className='variation-row';div.dataset.id=variant.id;
        div.innerHTML=`<label>Peso/opção<input class="variation-weight" maxlength="100" required value="${Shop.escape(variant.weight)}" placeholder="250g"></label><label>Preço (R$)<input class="variation-price" type="number" min="0" step="0.01" required value="${Shop.escape(variant.price)}"></label><button type="button">Remover</button>`;
        div.querySelector('button').onclick=()=>{if(root.querySelectorAll('.variation-row').length>1)div.remove();};root.querySelector('#variation-rows').append(div); toggle();
    }
    function toggle() {
        const on=root.querySelector('#has-variations').checked;
        root.querySelector('#variation-table').hidden=!on;root.querySelector('#single-price').hidden=on;
        root.querySelector('#product-price').disabled=on;root.querySelector('#product-price').required=!on;
        root.querySelectorAll('.variation-row input').forEach(i=>i.disabled=!on);
    }
    function populate(raw) {
        if(!root)return;const p=Shop.normalize(raw);root.querySelector('#product-price').value=p.price??'';root.querySelector('#has-variations').checked=p.hasVariations;root.querySelector('#product-image-url').value=p.image||'';root.querySelector('#variation-rows').replaceChildren();
        (p.variations.length?p.variations:[{id:crypto.randomUUID(),weight:'',price:''}]).forEach(row);toggle();
    }
    function payload() {
        const on=root.querySelector('#has-variations').checked;
        const variants=on?Array.from(root.querySelectorAll('.variation-row')).map(r=>({id:r.dataset.id,weight:r.querySelector('.variation-weight').value.trim(),price:Number(r.querySelector('.variation-price').value)})):[];
        if(on && (!variants.length || variants.some(v=>!v.weight || !Shop.validPrice(v.price))))throw new Error('Informe peso e preço para cada variação.');
        if(new Set(variants.map(v=>v.weight.toLowerCase())).size!==variants.length)throw new Error('Use opções de peso diferentes para cada variação.');
        return {preco:on?Math.min(...variants.map(v=>v.price)):Number(root.querySelector('#product-price').value),tem_variacoes:on,variacoes:variants};
    }
    function imageUrl() {return root?.querySelector('#product-image-url').value.trim()||'';}
    document.addEventListener('DOMContentLoaded',()=>{
        const form=document.getElementById('formProdutoCria');
        if(form) {
            root=document.createElement('section');root.className='commerce-admin';root.innerHTML=`<h2>Venda e opções de peso</h2><label id="single-price">Preço de venda único (R$)<input id="product-price" type="number" min="0" step="0.01" required></label><label><input type="checkbox" id="has-variations">Criar variações de peso e preço</label><div id="variation-table" hidden><div id="variation-rows"></div><button id="add-variation" type="button">Adicionar variação</button><div class="shortcuts">${['100g','250g','500g','1kg','2kg','5kg'].map(w=>`<button type="button" data-weight="${w}">+ ${w}</button>`).join('')}</div></div><label>Foto por link/URL (alternativa ao upload)<input type="url" id="product-image-url" placeholder="https://..."></label>`;
            form.querySelector('#step-1').insertBefore(root,form.querySelector('#step-1').firstChild);
            document.getElementById('nome').maxLength=100;document.getElementById('descricao_curta').maxLength=250;
            row();root.querySelector('#has-variations').onchange=toggle;root.querySelector('#add-variation').onclick=()=>row();root.querySelectorAll('[data-weight]').forEach(b=>b.onclick=()=>{const blank=Array.from(root.querySelectorAll('.variation-row')).find(r=>!r.querySelector('.variation-weight').value.trim());if(blank)blank.querySelector('.variation-weight').value=b.dataset.weight;else row({id:crypto.randomUUID(),weight:b.dataset.weight,price:''});});
            root.querySelector('#product-image-url').addEventListener('input',e=>{const safe=Shop.image(e.target.value);e.target.setCustomValidity(e.target.value&&!safe?'Use um link HTTP ou HTTPS válido.':'');if(safe){const preview=document.getElementById('previewImg');preview.src=safe;preview.classList.remove('hidden');}});
            document.getElementById('btn-proximo').addEventListener('click',()=>{const first=form.querySelector('#step-1');const invalid=Array.from(first.querySelectorAll('input,textarea')).find(i=>!i.disabled&&!i.checkValidity());if(invalid){first.classList.remove('hidden');form.querySelector('#step-2').classList.add('hidden');invalid.reportValidity();}});
            form.addEventListener('invalid',e=>{if(e.target.closest('#step-1')){document.getElementById('step-1').classList.remove('hidden');document.getElementById('step-2').classList.add('hidden');}},true);
        }
        if(document.getElementById('grid-admin-produtos'))mountSettings();
    });
    async function mountSettings() {
        const panel=document.createElement('section');panel.className='commerce-admin';panel.innerHTML='<h2>Configurações de pedidos</h2><form id="settings-form"><label>WhatsApp da loja (país + DDD + número)<input name="whatsapp" inputmode="numeric" maxlength="15" placeholder="5521967453706"></label><label>Limite de frete cortesia (R$)<input name="shipping" type="number" min="0" step="0.01" required></label><p id="settings-status" role="status"></p><button class="shop-button" type="submit">Salvar configurações</button></form>';
        document.getElementById('grid-admin-produtos').before(panel);await Shop.settingsReady();const form=panel.querySelector('form'),settings=Shop.getSettings();form.elements.whatsapp.value=settings.whatsapp;form.elements.shipping.value=settings.freeShipping;
        form.onsubmit=async e=>{e.preventDefault();const status=panel.querySelector('#settings-status');const value={whatsapp:form.elements.whatsapp.value.trim(),freeShipping:Number(form.elements.shipping.value)};if(value.whatsapp&&!/^\d{12,15}$/.test(value.whatsapp)){status.textContent='Informe o número com código do país, DDD e telefone, somente dígitos.';return;}const button=form.querySelector('button');button.disabled=true;status.textContent='Salvando...';try{const {data,error}=await db.from('loja_config').update({whatsapp:value.whatsapp,frete_cortesia:value.freeShipping}).eq('id',1).select('id');if(error||!data?.length)throw new Error();Shop.saveSettings(value);status.textContent='Configurações salvas.';}catch{status.textContent='Não foi possível salvar. Confira a atualização do banco e a permissão de administrador.';}finally{button.disabled=false;}};
    }
    return {populate,payload,imageUrl};
})();
