document.addEventListener('DOMContentLoaded',async()=>{
    const list=document.getElementById('institutional-list');if(!list)return;
    try{
        const {data,error}=await db.from('produtos').select('id,nome,produtor,parceiros').order('nome');if(error)throw error;
        const entries=new Map();
        for(const product of data||[]){
            let values=[];
            if(list.dataset.kind==='producers')values=String(product.produtor||'').split('|').map(text=>({name:text.trim(),image:''})).filter(v=>v.name&&!v.name.startsWith('('));
            else{let partners=product.parceiros;try{if(typeof partners==='string')partners=JSON.parse(partners);}catch{partners=[];}if(Array.isArray(partners))values=partners.filter(v=>v&&typeof v.nome==='string'&&v.nome.trim()).map(v=>({name:v.nome.trim(),image:Shop.image(v.icone)}));}
            for(const value of values){const key=value.name.toLocaleLowerCase('pt-BR');if(!entries.has(key))entries.set(key,{...value,products:new Map()});const entry=entries.get(key);if(!entry.image&&value.image)entry.image=value.image;entry.products.set(product.id,product);}
        }
        list.replaceChildren();
        for(const entry of entries.values()){
            const card=document.createElement('article');card.className='bg-card border border-border rounded-sm p-6';
            if(entry.image){const img=document.createElement('img');img.src=entry.image;img.alt=entry.name;img.loading='lazy';img.className='w-24 h-24 object-contain mb-5';card.append(img);}
            const heading=document.createElement('h2');heading.textContent=entry.name;heading.className='text-lg font-medium mb-4';card.append(heading);
            const products=document.createElement('ul');products.className='space-y-2';
            for(const product of entry.products.values()){const item=document.createElement('li'),link=document.createElement('a');link.href='produto.html?id='+encodeURIComponent(product.id);link.textContent=product.nome;link.className='text-sm underline underline-offset-4 hover:opacity-70';item.append(link);products.append(item);}card.append(products);list.append(card);
        }
        if(!entries.size){const text=document.createElement('p');text.className='text-sm text-muted-foreground';text.textContent=list.dataset.kind==='producers'?'Os produtores e coletores serão apresentados aqui conforme as informações do catálogo.':'Os parceiros serão apresentados aqui conforme as informações do catálogo.';list.append(text);}
    }catch{list.textContent='Não foi possível carregar as informações. Atualize a página para tentar novamente.';}
});
