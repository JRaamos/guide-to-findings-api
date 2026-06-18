# SEO Discovery Layer

## Objetivo

A Discovery Layer identifica sinais reais de demanda antes da criacao de
`EditorialTopic`. Nesta primeira etapa, ela consulta pesquisas relacionadas do
Google Trends e nao persiste nenhum dado.

```txt
Google Trends
    ->
Search Demand Engine
    ->
Oportunidades para inspecao
    ->
EditorialTopic (fase futura)
```

## Arquitetura

O adaptador de fonte esta em:

```txt
src/services/seo-intelligence/discovery/google-trends.js
```

Ele cuida apenas da sessao e dos sinais retornados pelo Google Trends. A
orquestracao, deduplicacao, score e limite ficam em:

```txt
src/services/seo-intelligence/discovery/search-demand-engine.js
```

As fontes sao registradas por nome no `DISCOVERY_SOURCES`. Novos adaptadores
podem ser adicionados futuramente sem mudar o contrato de saida:

```txt
google_trends
google_autocomplete
related_searches
```

## Trend score

O Google Trends retorna dois grupos de pesquisas relacionadas:

- `top`: indice relativo de interesse entre 0 e 100;
- `rising`: crescimento percentual, que pode ultrapassar 100.

O Search Demand Engine mantem o score de `top` e normaliza os valores de
`rising` em uma escala de 0 a 100 dentro da amostra. Keywords repetidas ficam
com o maior score observado.

O `trendScore` e um sinal relativo de descoberta. Ele nao representa volume
absoluto de buscas.

## Uso

```bash
yarn discover:trends notebook
yarn discover:trends "cadeira gamer" --max 10
yarn discover:trends notebook --geo BR --timeframe "today 12-m"
```

Saida:

```json
{
  "term": "notebook",
  "source": "google_trends",
  "opportunities": [
    {
      "keyword": "notebook gamer",
      "trendScore": 100
    }
  ]
}
```

## Limites operacionais

Os endpoints de exploracao do Google Trends nao constituem uma API publica
com SLA e podem responder com rate limit. O adaptador usa sessao, timeout e
tentativas curtas, mas uma integracao de producao deve prever cache, controle de
frequencia e, se necessario, um provedor oficial ou contratado.

O host padrao acompanha o mercado brasileiro. Ele pode ser substituido com
`GOOGLE_TRENDS_BASE_URL` sem alterar o service.

Esta fase nao cria `EditorialTopic`, nao acessa o banco, nao chama IA e nao
executa pipeline de geracao ou publicacao.
