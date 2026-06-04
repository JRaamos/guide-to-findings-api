# Content Lifecycle

## Objetivo

Definir o ciclo de vida dos conteúdos do Manual dos Achados, desde registros
importados até páginas públicas atualizadas.

Este documento não altera schemas nem implementa automações. Ele descreve o
comportamento esperado para orientar as próximas fases.

## Ciclo Completo

```text
Imported
↓
Draft
↓
Review
↓
Approved
↓
Published
↓
Updated
↓
Archived
```

Nem todos os content-types possuem todos esses estados hoje. Este ciclo é uma
camada editorial conceitual que deve ser aplicada usando os campos existentes
até que uma implementação futura formalize novos estados, se necessário.

## Product

Estados atuais:

```text
imported
review
approved
rejected
archived
```

### Imported

Produto veio de integração ou cadastro inicial. Ainda não deve ser usado como
recomendação pública sem revisão.

### Review

Produto está sendo avaliado por editor. Devem ser conferidos:

- nome;
- imagem;
- preço;
- marca;
- modelo;
- atributos;
- link original;
- link afiliado;
- categoria;
- subcategoria.

### Approved

Produto pode ser usado em rankings. Isso não significa que aparecerá
automaticamente no frontend.

### Rejected

Produto não deve ser usado em rankings, por baixa relevância, dados ruins,
produto incompatível ou problema comercial.

### Archived

Produto preservado para histórico, mas fora do fluxo editorial ativo.

## Ranking

Estados atuais:

```text
draft
review
published
archived
```

### Draft

Ranking em construção. Pode não ter página relacionada.

### Review

Ranking pronto para avaliação editorial. Devem ser revisados:

- ordem;
- notas;
- justificativas;
- prós;
- contras;
- destaques;
- CTAs;
- consistência entre produtos.

### Published

Ranking validado e associado a uma `Page` publicada ou pronta para publicação.

### Archived

Ranking fora de uso. Pode permanecer vinculado a histórico, mas não deve
alimentar páginas novas.

## RankingItem

Estados atuais:

```text
active
inactive
```

### Active

Item aparece no ranking quando a página é publicada.

### Inactive

Item permanece no registro, mas não deve aparecer na página pública. Útil para
produto removido, indisponível ou substituído.

## Page

Estados atuais:

```text
draft
review
published
archived
```

### Draft

Página em montagem. Pode receber conteúdo de IA, SEO inicial, FAQ e relações.

### Review

Página pronta para revisão editorial e SEO.

### Published

Página disponível publicamente se também atender aos filtros do endpoint
público. O campo `publishedAt` registra a data editorial de publicação quando o
Publication Workflow aplica esse estado.

### Approved

`approvedAt` registra quando a página foi aprovada editorialmente antes da
publicação. O status atual ainda usa `draft`, `review`, `published` e
`archived`; portanto `approvedAt` é o marcador de aprovação nesta fase.

### Archived

Página fora de publicação. Deve sair do sitemap e não deve ser retornada
publicamente.

## Seo

SEO possui status editorial próprio para revisão e aprovação, mas acompanha a
`Page` na publicação pública.

Campos críticos:

- metaTitle;
- metaDescription;
- canonicalUrl;
- robots;
- status;
- approvedAt;
- schemaType;
- schemaData;
- focusKeyword;
- secondaryKeywords.

Regra editorial:

```text
Seo aprovado é pré-condição para Page publicada.
```

Se `Seo.robots` for diferente de `indexFollow`, a página não deve ser tratada
como indexável no sitemap.

## Faq

Estados atuais:

```text
active
inactive
```

FAQ ativa aparece na página pública. FAQ inativa permanece para histórico ou
revisão, sem renderização pública. `generatedByAi` indica se a resposta veio de
rascunho de IA, e `approvedAt` registra a aprovação editorial.

## AffiliateLink

Estados atuais:

```text
active
inactive
broken
```

### Active

Pode ser usado como CTA.

### Inactive

Não deve ser usado no frontend.

### Broken

Link precisa de correção. Deve gerar revisão do produto e do ranking se for o
link principal do item.

## Marketplace

Estados atuais:

```text
active
inactive
```

Marketplace inativo não deve ser usado para novas importações ou links novos.

## Publication Gate

Antes de publicar uma página:

```text
Category active
SubCategory active quando existir
Page published
Ranking revisado quando pageType = ranking
RankingItems active
Products approved ou revisados
AffiliateLinks active
Seo completo ou fallback aprovado
Faqs active ou ausentes
Canonical correto
Robots indexFollow para sitemap
```

## Atualização de Conteúdo Publicado

### Atualização Simples

Pode ocorrer sem despublicar:

- correção de texto;
- ajuste de meta description;
- atualização de preço;
- troca de imagem;
- ajuste de FAQ;
- correção de link afiliado.

### Atualização Estrutural

Deve retornar para revisão:

- troca de produto no top 3;
- alteração de posição relevante;
- mudança de critério editorial;
- substituição de categoria;
- mudança de canonical;
- remoção de grande parte do conteúdo.

## Arquivamento

Arquivar quando:

- a intenção de busca deixou de existir;
- todos os produtos ficaram indisponíveis;
- a página perdeu validade editorial;
- a categoria foi descontinuada;
- há risco de SEO ou compliance.

Página arquivada:

- não retorna no endpoint público;
- não entra no sitemap;
- pode manter histórico interno.

## Auditoria Recomendada

Mesmo sem implementar agora, o produto deve prever auditoria para:

- quem importou produtos;
- quem aprovou produtos;
- quem gerou IA;
- quem aplicou conteúdo gerado;
- quem publicou;
- quando preço/link mudou;
- quando ranking foi reordenado.
