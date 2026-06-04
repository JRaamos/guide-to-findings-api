# Editorial Workflow

## Objetivo

Documentar o fluxo editorial completo do Manual dos Achados, desde a pesquisa
de produtos até a publicação e atualização de uma página pública.

Este documento é um blueprint de arquitetura e produto. Ele não implementa
funcionalidades, não cria plugins, não cria telas, não altera banco, schemas ou
endpoints.

## Visão Geral

Exemplo editorial:

```text
Quero criar: Top 10 Serras Mármore
```

Fluxo completo:

```text
Produto
↓
Ranking
↓
IA
↓
Page
↓
SEO
↓
Publicação
↓
Atualização
```

O Strapi Admin será o ambiente operacional. O Next.js continua sendo apenas o
site público que renderiza páginas dinâmicas já aprovadas e publicadas.

## Etapa 1: Pesquisa de Produtos

Fluxo:

```text
Mercado Livre
↓
Busca
↓
Seleção
↓
Importação
```

### Responsável Administrativo

```text
Strapi Admin > Mercado Livre
```

### Entrada do Editor

- termo de busca, por exemplo `serra marmore`;
- limite de resultados;
- categoria interna;
- subcategoria interna;
- critérios editoriais iniciais, como faixa de preço, marca, reputação ou tipo
  de uso.

### Saída Esperada

- lista de produtos normalizados;
- seleção de produtos relevantes;
- criação ou atualização de `Product`;
- criação ou atualização de `AffiliateLink`;
- reutilização de `Marketplace`.

### Estado Após Importação

Produtos importados entram como:

```text
Product.status = imported
```

Isso significa que o produto existe no Strapi, mas ainda não foi revisado nem
aprovado para aparecer em rankings públicos.

## Etapa 2: Construção do Ranking

Fluxo:

```text
Produtos
↓
Ranking
↓
Ordenação
↓
Notas
↓
Justificativas
```

### Responsável Administrativo

```text
Strapi Admin > Ranking Builder
```

### Entrada do Editor

- produtos importados ou aprovados;
- tipo de ranking, por exemplo `top10`, `top5`, `bestCostBenefit`;
- objetivo editorial, como melhor geral, melhor custo-benefício ou guia de
  compra;
- critérios de avaliação;
- categoria e subcategoria relacionadas.

### Decisões Sobre Ranking

#### Ranking existe sem Page?

Sim. Um `Ranking` pode existir antes de uma `Page`.

Isso permite que o editor construa, ordene e revise uma lista antes de decidir
onde ela será publicada. O ranking pode ficar em `draft` ou `review` enquanto a
página ainda não existe.

#### Ranking pode ser reutilizado?

Sim, conceitualmente um ranking pode ser reutilizado como base editorial.

No modelo atual, `Ranking` tem relação `oneToOne` com `Page`, então a
publicação final é uma página para um ranking. Para reutilização futura, o fluxo
recomendado é clonar ou versionar o ranking, não anexar o mesmo registro a
várias páginas.

#### Ranking pode ter múltiplas páginas?

Não no modelo atual.

Como a relação documentada é `Ranking` one-to-one com `Page`, um ranking
publicado deve pertencer a uma única página. Se o produto exigir múltiplas
páginas usando a mesma base, a implementação futura deve criar uma estratégia
explícita de:

- clonagem de ranking;
- versão editorial;
- ou entidade intermediária de coleção.

Até essa decisão ser implementada, a regra editorial é:

```text
1 Ranking publicado = 1 Page
```

### Saída Esperada

- `Ranking` com status editorial;
- `RankingItem` para cada produto selecionado;
- posição;
- nota;
- resumo;
- prós;
- contras;
- destaque;
- CTA;
- vínculo com `Product` e `AffiliateLink`.

## Etapa 3: Geração IA

Fluxo:

```text
Título
Categoria
Produtos
Ranking
↓
Introdução
Comparativo
Resumo
FAQ
Conclusão
SEO
```

### Responsável Administrativo

```text
Strapi Admin > AI Generator
```

### O Que a IA Recebe

A IA deve receber apenas dados necessários para gerar conteúdo editorial:

- título planejado da página;
- tipo de página, por exemplo `ranking`;
- categoria e subcategoria;
- objetivo da página;
- lista ordenada de produtos;
- dados normalizados dos produtos;
- posições e notas do ranking;
- prós e contras definidos pelo editor;
- destaques;
- público-alvo;
- intenção de busca;
- palavra-chave foco;
- palavras-chave secundárias;
- restrições editoriais e tom de voz.

Dados sensíveis, tokens, dados internos de autenticação e logs técnicos não
devem ser enviados para IA.

### O Que a IA Gera

A IA pode gerar rascunhos para:

- `Page.title`, quando ainda não definido;
- `Page.excerpt`;
- `Page.intro`;
- blocos editoriais de comparação;
- resumo geral do ranking;
- texto individual de `RankingItem.summary`;
- perguntas e respostas para `Faq`;
- `Page.conclusion`;
- `Seo.metaTitle`;
- `Seo.metaDescription`;
- `Seo.ogTitle`;
- `Seo.ogDescription`;
- sugestão de `Seo.schemaType`;
- sugestão de `Seo.schemaData`;
- `Seo.focusKeyword`;
- `Seo.secondaryKeywords`.

### O Que é Salvo

O conteúdo gerado deve ser salvo como rascunho revisável. A entidade natural
para registrar auditoria é `AiGenerationLog`, contendo:

- provider;
- model;
- promptType;
- prompt;
- inputData;
- outputData;
- status;
- tokensInput;
- tokensOutput;
- costEstimate;
- generatedAt;
- relação com `Page`, `Product` ou `Ranking`.

O conteúdo aprovado pelo editor pode então ser copiado ou aplicado aos registros
principais (`Page`, `Seo`, `Faq`, `RankingItem`). A IA não deve publicar nada
automaticamente.

## Etapa 4: Revisão

Fluxo:

```text
Draft
↓
Review
↓
Approved
↓
Published
```

### Estados Atuais e Estados Conceituais

Os schemas atuais já possuem estados como:

```text
Page: draft, review, published, archived
Product: imported, review, approved, rejected, archived
Ranking: draft, review, published, archived
RankingItem: active, inactive
Faq: active, inactive
Seo.robots: indexFollow, noIndexFollow, noIndexNoFollow
```

O estado `Approved` é um conceito editorial. Hoje ele existe explicitamente em
`Product.status = approved`, mas não em todos os content-types. Para os demais,
o equivalente operacional pode ser `review` aprovado manualmente antes de
alterar para `published`.

### Quem Aprova?

Papéis recomendados:

- editor: monta ranking, revisa produtos, ajusta textos;
- especialista ou revisor: valida critérios, notas, prós e contras;
- SEO/editor-chefe: aprova título, meta description, canonical, FAQ e intenção
  de busca;
- administrador: resolve exceções, arquivamento e problemas de publicação.

### O Que Pode Ser Editado?

Durante `draft`:

- produtos selecionados;
- ordem do ranking;
- notas;
- texto de apoio;
- intro;
- FAQ;
- SEO;
- imagem destacada;
- canonical;
- links relacionados.

Durante `review`:

- correções editoriais;
- ajustes de SEO;
- troca de produtos problemáticos;
- ajustes de preço e CTA;
- revisão de IA.

Após `published`:

- pequenas correções editoriais;
- atualização de preço;
- substituição de link quebrado;
- ajuste de SEO não destrutivo;
- arquivamento se o conteúdo perder validade.

Mudanças estruturais grandes em página publicada devem retornar a página para
`review` antes de nova publicação.

### O Que Pode Ser Regenerado?

Pode ser regenerado:

- intro;
- resumo;
- FAQ;
- conclusão;
- metaTitle;
- metaDescription;
- schemaData;
- summaries dos ranking items.

Não deve ser regenerado automaticamente sem revisão:

- ordenação do ranking;
- notas;
- recomendação principal;
- CTA;
- status de publicação;
- canonicalUrl.

## Etapa 5: Publicação

Fluxo:

```text
Page
↓
SEO
↓
Sitemap
↓
Frontend
```

### Pré-condições

Para uma página ranking ser publicada:

- `Page.status = published`;
- `Page.category` ativa;
- `Page.slug` definido;
- `Page.pageType = ranking`;
- `Ranking` relacionado e revisado;
- `RankingItem` ativos;
- produtos revisados;
- links afiliados ativos;
- `Seo` preenchido ou fallback seguro disponível;
- FAQ revisado quando existir;
- canonical coerente;
- conteúdo não sensível.

### Resultado Público

Quando publicada, a página passa a ser consumida por:

```text
GET /api/public/pages/:categorySlug/:contentSlug
```

O frontend renderiza:

```text
/{categorySlug}/{contentSlug}
```

O sitemap deve incluir apenas URLs indexáveis:

- páginas publicadas;
- categorias ativas;
- SEO com `robots = indexFollow` ou sem SEO explícito;
- páginas sem bloqueio editorial.

## Etapa 6: Atualização

Exemplos:

```text
Produto saiu de estoque
Produto mudou de preço
Produto foi removido
```

### Produto Mudou de Preço

Reação esperada:

- atualizar `Product.price`;
- atualizar `Product.oldPrice` quando fizer sentido;
- atualizar `Product.lastSyncedAt`;
- manter ranking publicado se a mudança não afetar a recomendação;
- sinalizar revisão se a variação mudar o custo-benefício.

### Produto Saiu de Estoque

Reação esperada:

- marcar produto para revisão;
- avaliar substituto;
- desativar `RankingItem` se necessário;
- manter página publicada apenas se houver alternativas suficientes;
- gerar alerta para editor.

### Produto Foi Removido

Reação esperada:

- marcar `AffiliateLink.status = broken` quando aplicável;
- mover `Product.status` para `archived` ou `rejected`, conforme o caso;
- remover ou substituir o item do ranking;
- retornar `Ranking` e `Page` para `review` se a remoção afetar a qualidade da
  página.

### Link Afiliado Quebrado

Reação esperada:

- marcar `AffiliateLink.status = broken`;
- impedir uso como CTA principal;
- solicitar correção manual ou nova importação;
- manter analytics histórico.

## Decisões Arquiteturais

- `Page` é a única entidade que representa publicação pública.
- `Ranking` pode existir antes da `Page`, mas no modelo atual publica em apenas
  uma página.
- `Product` importado não é automaticamente aprovado.
- IA gera rascunhos, não decisões finais.
- Publicação exige revisão humana.
- Atualizações de produto podem exigir reavaliação editorial.
- Next.js não recebe ferramentas administrativas novas.

## Gargalos Possíveis

- dependência de dados externos do Mercado Livre;
- necessidade de revisão humana para evitar rankings frágeis;
- falta de versionamento formal de ranking;
- ausência de estado `approved` para todos os content-types;
- risco de páginas publicadas com produto indisponível;
- custo e rastreabilidade de uso de IA;
- manutenção de links afiliados e disponibilidade.

## Melhorias Recomendadas Antes da Implementação

- definir papéis e permissões editoriais no Strapi Admin;
- decidir se rankings terão versionamento;
- criar critérios editoriais por categoria;
- definir política de atualização de preço e estoque;
- criar checklist de publicação;
- definir quando IA pode sugerir versus aplicar conteúdo;
- planejar alertas para produto indisponível e link quebrado.

