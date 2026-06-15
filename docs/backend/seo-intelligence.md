# SEO Intelligence Engine

## Objetivo

O SEO Intelligence Engine deve descobrir oportunidades editoriais antes da geracao de paginas. A ideia e separar descoberta de demanda, aprovacao editorial e producao de conteudo, evitando que o sistema gere paginas apenas porque recebeu um termo manual.

## Primeira versao

Esta primeira versao implementa o Keyword Discovery Engine deterministico em:

```txt
src/services/seo-intelligence/keyword-discovery.js
```

Ele recebe um termo, categoria opcional e lista opcional de produtos, e retorna keywords editoriais com:

```txt
keyword
normalizedKeyword
intent
template
priority
source
metadata
```

## Sem IA

Esta fase nao usa OpenAI, nao chama o Marketplace Pipeline, nao cria Page, nao publica conteudo e nao altera o Publication Workflow. Todas as keywords sao geradas por templates deterministicas e regras locais.

## Exemplos de uso

```bash
yarn discover:keywords notebooks
yarn discover:keywords "cadeiras gamer"
yarn discover:keywords "air fryers"
```

Exemplos de saida:

```txt
[best] melhores notebooks
[costBenefit] notebooks custo-benefício
[buyingGuide] qual notebook comprar
[comparison] comparativo de notebooks
[useCase] notebooks para estudar
```

## Proximos passos

- Criar o model `EditorialTopic`.
- Criar persistencia idempotente de keywords descobertas.
- Criar uma Topic Queue para revisao editorial.
- Adicionar fluxo de aprovacao antes da geracao.
- Conectar topicos aprovados ao pipeline de geracao automatica.
