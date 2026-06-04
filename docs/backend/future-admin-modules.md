# Future Admin Modules

## Objetivo

Mapear os módulos administrativos futuros do Manual dos Achados dentro do
Strapi Admin.

Este documento não cria plugins, telas, endpoints ou alterações de banco. Ele
define responsabilidades e fronteiras para implementação futura.

## Mapa Geral

```text
Strapi Admin
├── Mercado Livre
├── Ranking Builder
├── AI Generator
├── Publication Workflow
└── Analytics
```

## Mercado Livre

### Responsabilidade

Buscar produtos no Mercado Livre, selecionar itens, importar produtos e manter
dados básicos sincronizados para revisão editorial.

### Usa

- `Marketplace`;
- `Product`;
- `AffiliateLink`;
- `Category`;
- `SubCategory`;
- serviços existentes em `src/services/marketplaces/mercado-livre/`.

### Não Deve Fazer

- publicar páginas;
- montar rankings automaticamente;
- gerar conteúdo IA;
- criar links afiliados oficiais sem fluxo validado;
- alterar SEO.

### Saída

```text
Product.status = imported
AffiliateLink.status = active ou broken
Marketplace reutilizado
```

## Ranking Builder

### Responsabilidade

Montar rankings editoriais a partir de produtos revisados.

### Usa

- `Product`;
- `Ranking`;
- `RankingItem`;
- `AffiliateLink`;
- `Category`;
- `SubCategory`.

### Deve Permitir Futuramente

- selecionar produtos;
- ordenar itens;
- definir posição;
- definir score;
- escrever resumo;
- editar prós e contras;
- definir highlight;
- configurar CTA;
- enviar ranking para revisão.

### Não Deve Fazer

- publicar página automaticamente;
- aprovar produto sem revisão;
- substituir decisão editorial por IA.

## AI Generator

### Responsabilidade

Gerar rascunhos editoriais e SEO com base em dados revisados.

### Usa

- `Page`;
- `Product`;
- `Ranking`;
- `RankingItem`;
- `Seo`;
- `Faq`;
- `AiGenerationLog`.

### Entrada

- título planejado;
- categoria;
- subcategoria;
- ranking;
- produtos;
- intenção de busca;
- palavra-chave foco;
- critérios editoriais.

### Saída

- introdução;
- comparativo;
- resumo;
- FAQ;
- conclusão;
- metaTitle;
- metaDescription;
- schemaData;
- logs de geração.

### Regra Central

```text
IA gera rascunho. Editor aprova.
```

## Publication Workflow

### Responsabilidade

Controlar a passagem de conteúdo entre rascunho, revisão e publicação.

### Usa

- `Page`;
- `Seo`;
- `Faq`;
- `Ranking`;
- `RankingItem`;
- `Product`;
- `AffiliateLink`.

### Deve Validar Futuramente

- página tem categoria ativa;
- página tem slug;
- SEO mínimo preenchido;
- ranking tem itens ativos;
- produtos estão revisados;
- links afiliados estão ativos;
- robots permite indexação quando a página vai para sitemap;
- conteúdo de IA foi revisado.

### Saída

```text
Page.status = published
Ranking.status = published quando aplicável
Sitemap passa a incluir URL indexável
Frontend passa a renderizar a página
```

## Analytics

### Responsabilidade

Acompanhar cliques, CTAs e desempenho editorial para orientar atualizações.

### Usa

- `ClickEvent`;
- `Page`;
- `Product`;
- `AffiliateLink`;
- `Marketplace`.

### Métricas Futuras

- cliques por página;
- cliques por produto;
- cliques por marketplace;
- CTR por posição no ranking;
- links quebrados;
- páginas com baixa interação;
- produtos que merecem substituição.

### Não Deve Fazer

- mudar ranking automaticamente;
- publicar ou despublicar conteúdo;
- expor dados sensíveis;
- armazenar IP puro.

## Sequência Recomendada de Implementação

1. Plugin Mercado Livre no Strapi Admin.
2. Ranking Builder com criação manual assistida.
3. Publication Workflow com checklist de publicação.
4. AI Generator com logs e revisão obrigatória.
5. Analytics editorial com leitura de `ClickEvent`.

## Gargalos Antecipados

- permissão granular no Strapi Admin;
- versionamento de ranking;
- auditoria de alterações editoriais;
- sincronização de preço e disponibilidade;
- qualidade dos dados de marketplace;
- custo e controle de IA;
- clareza sobre quando despublicar versus revisar.

## Decisões Pendentes

- criar ou não versionamento formal de `Ranking`;
- criar status `approved` também para `Ranking` e `Page`;
- criar checklist persistido de publicação;
- definir frequência de atualização de produtos;
- definir critérios mínimos por categoria;
- definir política de conteúdo gerado por IA.

