# Âmbar Botânicos Site

Site institucional estático para Âmbar Botânicos.

## Visão Geral
- **Páginas**: Sobre (`index.html`), Nossos Produtos (`produtos.html`).
- **Tecnologia**: HTML5, CSS3, JavaScript (Vanilla).
- **Design**: Minimalista, focado em tipografia e imagens.

## Estrutura
```
/
├── assets/
│   ├── img/       # Imagens de produtos e parceiros
│   └── icons/     # Ícones (logo, favicon)
├── index.html     # Página inicial (Sobre)
├── produtos.html  # Página de produtos
├── styles.css     # Estilos globais
├── script.js      # Lógica de menu e navegação
└── README.md      # Documentação
```

## Como Abrir Localmente
1. Clone ou baixe este repositório.
2. Abra a pasta do projeto.
3. Clique duas vezes em `index.html` para abrir no navegador.
   - *Alternativa*: Se tiver VS Code com Live Server, clique em "Go Live".

## Como Versionar e Subir no GitHub
1. Inicialize o repositório:
   ```bash
   git init
   ```
2. Adicione os arquivos:
   ```bash
   git add .
   ```
3. Commit inicial:
   ```bash
   git commit -m "Initial commit: Site structure and content"
   ```
4. Crie um repositório no GitHub.
5. Conecte e suba:
   ```bash
   git remote add origin https://github.com/seu-usuario/ambar-botanicos-site.git
   git branch -M main
   git push -u origin main
   ```

## Como Publicar no GitHub Pages
1. Vá no repositório no GitHub.
2. Clique em **Settings** > **Pages**.
3. Em **Build and deployment** > **Source**, escolha **Deploy from a branch**.
4. Em **Branch**, selecione `main` e a pasta `/root` (ou `/` se for a raiz).
5. Clique em **Save**.
6. Aguarde alguns minutos e o link estará disponível.

## Checklist Rápido
- [x] Responsividade (Mobile/Desktop)
- [x] Menu Hambúrguer funcionando
- [x] SEO Tags básicas
- [x] Links de navegação
