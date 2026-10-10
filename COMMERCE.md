# Carrinho e pedidos pelo WhatsApp

## Ativação

1. No projeto Supabase já usado pelo site, abra o SQL Editor e execute `supabase/commerce-v2.sql`. O script adiciona os campos de venda sem apagar os produtos existentes.
2. Em Authentication > Users, copie o UUID do usuário administrador existente e execute a instrução comentada ao final do arquivo para registrá-lo em `loja_admins`. Não coloque senhas ou chaves privadas nos arquivos públicos do site.
3. Entre em `admin.html`. Configure o WhatsApp (país + DDD + número, somente dígitos) e o limite de frete cortesia.
4. Edite os produtos para informar preço único ou variações de peso e preço. Produtos antigos sem preço exibem “Preço sob consulta” e não podem ser adicionados ao carrinho.
5. Publique os arquivos do site no GitHub Pages e confira o pedido na página inicial, catálogo e detalhe do produto.

O botão Carrinho abre um painel lateral com itens, quantidades e subtotal. Finalizar compra mostra os dados do comprador e da entrega dentro do mesmo painel. A vitrine não exibe campos de checkout.

Produtos e configurações usam Supabase para serem compartilhados entre clientes. O navegador mantém o carrinho em `cart-v2` e caches de catálogo/configuração. Dados pessoais de checkout não são gravados no navegador ou no Supabase. O cliente confere e envia a mensagem pelo próprio WhatsApp; disponibilidade, frete e pagamento dependem da confirmação da loja.

As permissões existentes de produtos e do bucket `produtos-imagens` são mantidas. A nova tabela de configurações permite leitura pública e atualização somente a administradores registrados, usando as políticas do Supabase: https://supabase.com/docs/guides/database/postgres/row-level-security

## Verificação

Sirva a pasta por HTTP e abra `tests/commerce.html` e `tests/admin.html`. Os testes usam produtos, compradores, consultas de CEP e respostas de banco fictícios; nenhum pedido é enviado e nenhum dado de produção é alterado. `tests/responsive.html` mostra a página pública em um quadro de 390 pixels para verificar o layout móvel.

A migração e as políticas precisam ser verificadas no projeto Supabase antes da publicação; os testes locais não substituem essa verificação. O cache mantém o último catálogo para consulta local, mas o catálogo público continua sendo carregado do Supabase.
