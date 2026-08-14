# 📄 Documentação de Segurança e Configurações — Supabase
Projeto: Âmbar Botânicos (ambarbotanicos.com.br)

Data de Atualização: Agosto de 2026

## 🔒 1. Autenticação e Configurações Globais
**Site URL:** [https://ambarbotanicos.com.br](https://ambarbotanicos.com.br) (ou URL oficial da Vercel)

**Redirect URLs:** Mesma URL do site cadastrada para evitar erros de login em produção.

**Email Provider:**
Confirmação de e-mail ativa para garantir segurança na autenticação de administradores.

## 🗄️ 2. Tabela: `public.produtos`
A Row Level Security (RLS) está ativa nesta tabela com exatamente 2 políticas de acesso:

### 🟢 Política 1: Leitura Pública
- **Nome:** Produtos visiveis para todos
- **Comando SQL (FOR):** SELECT
- **Público-alvo (TO):** public (qualquer pessoa, logada ou não)
- **Condição (USING):** `true`
- **Objetivo:** Permite que os visitantes do site visualizem todos os produtos exibidos na vitrine sem precisar de login.

### 🔒 Política 2: Administração Total
- **Nome:** Controle Total para Logados
- **Comando SQL (FOR):** ALL (SELECT, INSERT, UPDATE, DELETE)
- **Público-alvo (TO):** authenticated (apenas usuários logados)
- **Condição (USING):** `(auth.role() = 'authenticated'::text)`
- **Validação (WITH CHECK):** `(auth.role() = 'authenticated'::text)`
- **Objetivo:** Garante que a criação, edição ou exclusão de qualquer produto seja exclusiva do painel administrativo via autenticação do Supabase.

## 🖼️ 3. Storage: Bucket `produtos-imagens`
**Visibilidade:** Public (Arquivos acessíveis via URL direta pelo navegador para exibição no site).

**Limitação de Listagem:** Desabilitada a listagem de arquivos da pasta pública para impedir a raspagem (scraping) de dados por bots externos.

A Row Level Security (RLS) da tabela `storage.objects` contém 2 políticas de segurança ativas direcionadas ao bucket:

### 🔒 Política 1: Upload de Imagens
- **Nome:** Upload para autenticados
- **Comando SQL (FOR):** INSERT
- **Público-alvo (TO):** authenticated
- **Validação (WITH CHECK):**
```sql
(bucket_id = 'produtos-imagens'::text) AND (auth.role() = 'authenticated'::text)
```
- **Objetivo:** Apenas o usuário autenticado pode enviar novas fotos de produtos.

### 🔒 Política 2: Exclusão / Gerenciamento de Imagens
- **Nome:** Exclusao storage para autenticados
- **Comando SQL (FOR):** DELETE
- **Público-alvo (TO):** authenticated
- **Condição (USING):**
```sql
(bucket_id = 'produtos-imagens'::text) AND (auth.role() = 'authenticated'::text)
```
- **Objetivo:** Apenas o usuário autenticado pode remover imagens salvas no storage.

## 🛠️ 4. Script SQL para Reinstalação / Restauração do RLS
Caso precise recriar o ambiente do zero no futuro, este é o script SQL consolidado que aplica exatamente a estrutura acima:

```sql
-------------------------------------------------------
-- 1. CONFIGURAÇÃO DA TABELA PRODUTOS
-------------------------------------------------------
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Leitura pública do catálogo
CREATE POLICY "Produtos visiveis para todos"
ON public.produtos FOR SELECT
TO public
USING (true);

-- Controle total para administradores logados
CREATE POLICY "Controle Total para Logados"
ON public.produtos FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-------------------------------------------------------
-- 2. CONFIGURAÇÃO DO STORAGE DE IMAGENS
-------------------------------------------------------
-- Upload restrito a usuários logados
CREATE POLICY "Upload para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'produtos-imagens' AND auth.role() = 'authenticated');

-- Exclusão restrita a usuários logados
CREATE POLICY "Exclusao storage para autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'produtos-imagens' AND auth.role() = 'authenticated');
```
