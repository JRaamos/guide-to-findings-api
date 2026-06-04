# Ranking to Page Workflow

## Objetivo

Definir exatamente como um `Ranking` se transforma em uma `Page` dentro do
Manual dos Achados.

Este documento é uma definição editorial e arquitetural. Ele não implementa
código, não altera schemas, não altera banco, não altera endpoints, não cria
plugins e não cria UI.

## Princípio Central

```text
Ranking
↓
AI
↓
Page
↓
SEO
↓
Publicação
```

O `Ranking` é a estrutura editorial da recomendação. A `Page` é a publicação
pública. A IA atua como geradora de rascunhos editoriais e SEO, sempre com
revisão humana antes da publicação.

## 1. Campos Que Pertencem ao Ranking

O `Ranking` e seus `RankingItem` devem concentrar a decisão editorial sobre os
produtos e a ordem da recomendação.

### Ranking

Pertence ao `Ranking`:

- título interno do ranking;
- descrição interna ou editorial;
- tipo de ranking, como `top10`, `top5`, `bestCostBenefit`, `bestOverall` ou
  `comparison`;
- status editorial do ranking;
- indicação se foi gerado ou assistido por IA;
- data de revisão;
- relação futura com `Page`, quando houver.

### RankingItem

Pertence ao `RankingItem`:

- produto selecionado;
- link afiliado escolhido para o produto;
- posição;
- título do item;
- resumo do item;
- prós;
- contras;
- destaque;
- nota;
- texto de CTA;
- status do item, como `active` ou `inactive`.

### Categoria e Subcategoria

Categoria e subcategoria são contexto editorial compartilhado. No modelo atual,
elas existem diretamente em `Page` e `Product`, mas o Ranking Builder deve
trabalhar com esse contexto para filtrar produtos e sugerir a futura página.

Recomendação:

```text
Category/SubCategory orientam o Ranking Builder.
Page armazena a relação pública final.
Product mantém a classificação do item importado.
```

### Slug

O slug público não pertence ao `Ranking`.

O `Ranking` pode ter um título editorial interno, mas o slug final pertence à
`Page`, porque é a `Page` que define URL pública, canonical e sitemap.

## 2. Campos Que Pertencem à IA

IA não deve ser proprietária definitiva de campos públicos. Ela gera rascunhos,
sugestões e versões aplicáveis aos content-types principais.

### Entrada da IA

A IA recebe:

- título planejado;
- intenção da página;
- tipo de página;
- categoria;
- subcategoria;
- lista ordenada do ranking;
- produtos;
- atributos relevantes dos produtos;
- preços e disponibilidade conhecidos;
- posições;
- notas;
- prós;
- contras;
- destaques;
- palavra-chave foco;
- palavras-chave secundárias;
- tom editorial;
- restrições de qualidade.

Não deve receber:

- secrets;
- tokens;
- credenciais;
- dados pessoais sensíveis;
- IPs;
- payload bruto desnecessário do marketplace;
- logs técnicos internos que não ajudam a geração editorial.

### Saída da IA

A IA pode gerar:

- introdução;
- excerpt;
- resumo geral do ranking;
- comparativo entre produtos;
- justificativas textuais;
- resumo de cada ranking item;
- FAQ;
- conclusão;
- meta title;
- meta description;
- Open Graph title;
- Open Graph description;
- sugestão de schema type;
- sugestão de schema data;
- palavras-chave secundárias;
- variações de título.

### Onde a Saída é Salva

A saída da IA deve ser registrada em `AiGenerationLog` como histórico e
auditoria.

Depois da revisão, o editor pode aplicar a saída nos registros finais:

- `Page.excerpt`;
- `Page.intro`;
- `Page.content`;
- `Page.conclusion`;
- `Faq`;
- `Seo`;
- `RankingItem.summary`.

Regra:

```text
IA sugere. Editor aplica ou aprova.
```

## 3. Campos Que Pertencem à Page

A `Page` é a entidade pública final. Ela concentra URL, conteúdo aprovado,
relações públicas e status de publicação.

Pertence à `Page`:

- título público;
- slug público;
- page type;
- status público/editorial;
- excerpt final;
- intro final;
- content blocks finais;
- conclusion final;
- data de publicação;
- canonical URL;
- featured image;
- category;
- subCategory;
- relação com `Seo`;
- relação com `Faq`;
- relação com `Ranking`;
- related pages.

### Slug Público

O slug público pertence à `Page`.

Exemplo:

```text
Page.slug = top-10-serras-marmore
URL = /construcao/top-10-serras-marmore
```

### Conteúdo Final

Conteúdo final é o conteúdo aprovado pelo editor, mesmo quando começou como
rascunho gerado por IA.

### Relacionamentos

A `Page` deve relacionar:

- `Category`;
- `SubCategory`, quando houver;
- `Ranking`, quando `pageType = ranking`;
- `Seo`;
- `Faq`;
- `relatedPages`.

## 4. Fluxo Ideal

Fluxo recomendado:

```text
Criar Ranking
↓
Selecionar Produtos
↓
Salvar Ranking
↓
Gerar Conteúdo IA
↓
Criar Draft da Page
↓
Revisar
↓
Publicar
```

### Etapa 1: Criar Ranking

O editor inicia no Ranking Builder com uma intenção editorial.

Exemplo:

```text
Top 10 Serras Mármore
```

O ranking nasce em estado conceitual `Draft`.

### Etapa 2: Selecionar Produtos

O editor seleciona produtos já importados e revisados, ou produtos que serão
enviados para revisão antes da publicação.

O Ranking Builder deve priorizar produtos com:

- `Product.status = approved`;
- `AffiliateLink.status = active`;
- categoria e subcategoria coerentes.

### Etapa 3: Salvar Ranking

O ranking é salvo com:

- título;
- tipo;
- descrição;
- itens;
- posições;
- notas;
- prós;
- contras;
- destaques;
- CTAs.

Nesse momento, a `Page` ainda não precisa existir.

### Etapa 4: Gerar Conteúdo IA

O editor solicita rascunho editorial com base no ranking.

A IA gera:

- introdução;
- resumo;
- FAQ;
- conclusão;
- SEO;
- Open Graph;
- sugestões de conteúdo.

Nada é publicado automaticamente.

### Etapa 5: Criar Draft da Page

Após a geração de conteúdo, o Publication Workflow cria uma `Page` em `draft`
ou aplica o conteúdo a uma `Page` draft existente.

A `Page` recebe:

- título público;
- slug público;
- page type;
- category;
- subCategory;
- ranking;
- seo;
- faq;
- conteúdo final em rascunho.

### Etapa 6: Revisar

O editor revisa:

- produtos;
- ordenação;
- notas;
- copy gerada por IA;
- FAQ;
- SEO;
- canonical;
- links relacionados;
- featured image;
- risco de conteúdo duplicado.

### Etapa 7: Publicar

Quando aprovado:

- `Page.status = published`;
- `Ranking.status = published`, quando aplicável;
- FAQs relevantes ficam `active`;
- SEO fica aprovado editorialmente;
- sitemap passa a incluir a URL quando `robots = indexFollow`;
- frontend passa a renderizar a página pública.

## 5. Quando a Page Nasce?

Opções analisadas:

```text
A) Ao criar Ranking
B) Ao clicar em Gerar Conteúdo
C) Ao publicar
```

### A) Ao Criar Ranking

Vantagens:

- cria cedo a estrutura pública;
- facilita visualizar URL e relações desde o início;
- reduz trabalho posterior se todo ranking for virar página.

Desvantagens:

- cria páginas vazias ou frágeis;
- mistura construção editorial com publicação;
- aumenta risco de drafts abandonados;
- força slug/canonical antes de validar intenção e conteúdo.

### B) Ao Clicar em Gerar Conteúdo

Vantagens:

- a página nasce quando já existe base editorial suficiente;
- permite gerar conteúdo, SEO e FAQ em um draft revisável;
- evita páginas vazias criadas cedo demais;
- cria o ponto certo para revisão editorial;
- separa Ranking Builder de Publication Workflow.

Desvantagens:

- exige etapa clara de criação/aplicação de draft;
- precisa lidar com reexecução da IA em `Page` já existente;
- requer validação para não criar múltiplas páginas para o mesmo ranking.

### C) Ao Publicar

Vantagens:

- evita drafts de página;
- só cria entidade pública quando a publicação está aprovada;
- reduz registros incompletos.

Desvantagens:

- não há onde revisar conteúdo final completo antes de publicar;
- dificulta SEO, FAQ, preview e validação editorial;
- aumenta risco de publicar conteúdo sem uma etapa de inspeção;
- mistura criação e publicação no mesmo clique.

### Recomendação

A recomendação definitiva é:

```text
A Page nasce ao clicar em Gerar Conteúdo, como draft.
```

Mais precisamente:

```text
Ranking salvo
↓
Gerar Conteúdo IA
↓
Criar ou atualizar Page draft
```

A `Page` não deve nascer automaticamente ao criar o `Ranking`, porque o ranking
pode ser apenas uma base editorial. A `Page` também não deve nascer somente ao
publicar, porque conteúdo, SEO e FAQ precisam de revisão antes da exposição
pública.

## 6. Quem Gera SEO, FAQ, Open Graph e Meta Description?

### IA

IA pode gerar rascunhos para:

- `Seo.metaTitle`;
- `Seo.metaDescription`;
- `Seo.ogTitle`;
- `Seo.ogDescription`;
- `Seo.schemaType`;
- `Seo.schemaData`;
- `Faq.question`;
- `Faq.answer`;
- variações de título;
- introdução;
- conclusão.

### Editor

Editor deve aprovar ou ajustar:

- título final;
- meta title;
- meta description;
- canonical URL;
- robots;
- FAQ;
- Open Graph;
- schema data;
- palavra-chave foco;
- conteúdo final.

### Regra Definitiva

```text
IA gera rascunho.
Editor aprova.
Publication Workflow valida.
```

Campos sensíveis de publicação, como `robots`, `canonicalUrl`, status e slug
final, devem ser decisão editorial, mesmo que a IA sugira valores.

## 7. Atualizações de Produto e Impacto na Page

### Produto Muda Preço

A `Page` não precisa ser recriada.

O que deve acontecer:

- atualizar `Product.price`;
- atualizar `Product.oldPrice`, quando aplicável;
- atualizar `Product.lastSyncedAt`;
- manter `RankingItem` se a recomendação continuar válida;
- sinalizar revisão se a mudança alterar custo-benefício, nota ou posição.

IA precisa ser regenerada?

```text
Somente se o texto mencionar preço, custo-benefício ou justificativa afetada.
```

Ranking precisa ser atualizado?

```text
Somente se a nova relação preço/valor mudar a posição ou score.
```

### Produto Sai de Estoque

A `Page` não deve ser recriada automaticamente.

O que deve acontecer:

- marcar produto para revisão;
- avaliar substituto;
- desativar ou substituir `RankingItem`;
- revisar CTA e `AffiliateLink`;
- colocar `Ranking` ou `Page` em revisão se a indisponibilidade afetar a
  qualidade da página.

IA precisa ser regenerada?

```text
Sim, se o produto for substituído ou se a conclusão/resumo mencionar o produto.
```

Ranking precisa ser atualizado?

```text
Sim, se o produto estava ativo no ranking público.
```

### Produto é Removido

A `Page` não precisa ser recriada do zero.

O que deve acontecer:

- marcar `AffiliateLink.status = broken`, quando aplicável;
- marcar `Product.status = archived` ou `rejected`, conforme o motivo;
- tornar `RankingItem` inactive ou substituir o produto;
- retornar o ranking para revisão;
- revisar a página se o produto removido estava no conteúdo final.

IA precisa ser regenerada?

```text
Sim, quando houver troca de produto, mudança de posição ou texto específico.
```

Ranking precisa ser atualizado?

```text
Sim, se o produto removido fazia parte do ranking ativo.
```

### Regra Geral de Atualização

```text
Page permanece.
Ranking é revisado.
IA regenera apenas trechos impactados.
Publicação pode voltar para review se a qualidade pública for afetada.
```

## 8. Estados Que Devem Existir

Estados editoriais recomendados para o fluxo:

```text
Draft
AI Generated
Under Review
Approved
Published
Archived
```

### Draft

Ranking ou Page em construção.

### AI Generated

Conteúdo gerado por IA foi criado, mas ainda não foi aprovado.

### Under Review

Editor ou revisor está validando conteúdo, SEO, ranking e links.

### Approved

Conteúdo aprovado para publicação, mas ainda não publicado.

### Published

Página pública, indexável conforme SEO e sitemap.

### Archived

Conteúdo fora de circulação pública.

## Compatibilidade Com Estados Atuais

Como nem todos os content-types possuem esses estados no schema atual, esta é a
tradução operacional recomendada por enquanto:

```text
Draft         -> Page.status = draft / Ranking.status = draft
AI Generated  -> AiGenerationLog.status = success ou review
Under Review  -> Page.status = review / Ranking.status = review
Approved      -> approvedAt preenchido antes de published
Published     -> Page.status = published / Ranking.status = published
Archived      -> Page.status = archived / Ranking.status = archived
```

Se uma implementação futura exigir mais precisão, o projeto pode avaliar novos
campos ou workflow plugin, mas esta decisão não faz parte deste documento.

## 9. Responsabilidade Futura de Cada Módulo

### Mercado Livre

Responsável por:

- buscar produtos;
- normalizar dados;
- importar produtos;
- criar ou atualizar `AffiliateLink`;
- reutilizar `Marketplace`;
- atualizar preço e disponibilidade quando o fluxo futuro existir.

Não é responsável por:

- criar `Ranking`;
- criar `Page`;
- gerar IA;
- publicar conteúdo.

### Ranking Builder

Responsável por:

- selecionar produtos;
- criar `Ranking`;
- criar `RankingItem`;
- ordenar produtos;
- definir notas;
- editar prós e contras;
- definir destaques;
- definir CTA;
- enviar ranking para geração IA ou revisão.

Não é responsável por:

- publicar a página;
- decidir SEO final;
- gerar conteúdo longo sem AI Generator;
- importar marketplace diretamente.

### AI Generator

Responsável por:

- receber ranking e contexto;
- gerar rascunhos de conteúdo;
- gerar rascunhos de SEO;
- gerar FAQ;
- registrar `AiGenerationLog`;
- permitir regeneração controlada por seção.

Não é responsável por:

- aprovar conteúdo;
- publicar;
- alterar posição do ranking automaticamente;
- mudar canonical ou robots sem aprovação.

### Publication Workflow

Responsável por:

- criar ou atualizar `Page` draft a partir do ranking e conteúdo IA;
- validar pré-condições de publicação;
- coordenar revisão;
- aprovar status final;
- publicar;
- garantir que sitemap e frontend recebam apenas conteúdo elegível.

Não é responsável por:

- buscar produtos no marketplace;
- tomar decisão editorial sobre melhor produto;
- gerar texto sem AI Generator;
- alterar schemas por conta própria.

## Pontos de Integração

```text
Mercado Livre -> Product, AffiliateLink, Marketplace
Ranking Builder -> Ranking, RankingItem, Product, AffiliateLink
AI Generator -> AiGenerationLog, Page draft, Seo draft, Faq draft
Publication Workflow -> Page, Seo, Faq, Ranking
Frontend público -> endpoint público de Page publicada
Sitemap -> Page publicada + Seo indexável
Analytics -> ClickEvent + revisão futura
```

## Fluxo Definitivo Recomendado

```text
1. Mercado Livre importa Product e AffiliateLink
2. Editor revisa Product
3. Ranking Builder cria Ranking
4. Editor seleciona Product e AffiliateLink
5. Editor ordena RankingItem e define score
6. AI Generator recebe Ranking e contexto editorial
7. AI Generator registra AiGenerationLog
8. Publication Workflow cria Page draft
9. Editor revisa Page, Seo e Faq
10. Editor aprova conteúdo
11. Publication Workflow publica Page
12. Sitemap inclui URL indexável
13. Frontend renderiza /{categorySlug}/{contentSlug}
14. Atualizações de produto retornam Ranking/Page para review quando necessário
```

## Decisão Final

A recomendação arquitetural definitiva é:

```text
Ranking é a base editorial.
AI gera rascunhos.
Page nasce como draft após gerar/aplicar conteúdo.
SEO e FAQ são sugeridos por IA e aprovados por editor.
Publication Workflow valida e publica.
Atualizações revisam o Ranking/Page existente, não recriam a Page do zero.
```
