# Relatorio do estado atual do SEO Intelligence

Data da analise: 21 de junho de 2026

## 1. Resumo executivo

O SEO Intelligence e hoje uma camada editorial completa dentro do Strapi Admin.
Ele nao se limita a sugerir palavras-chave. O sistema:

1. recebe um termo-base de pesquisa;
2. cria ou reutiliza um workspace de descoberta;
3. produz topics por templates deterministas e/ou Google Trends;
4. filtra, contextualiza e persiste as oportunidades na fila `EditorialTopic`;
5. recalcula um Topic Score de 0 a 100;
6. permite aprovacao ou rejeicao editorial no Admin;
7. gera individualmente ou em lote somente topics aprovados;
8. reaproveita o Marketplace Pipeline do Mercado Livre para selecionar produtos,
   gerar a Page e passar pelo Publication Workflow;
9. agrupa topics e Pages publicadas em clusters, avalia cobertura editorial e
   sugere futuros hubs;
10. usa as chaves editoriais das Pages publicadas para recomendar links internos
    no endpoint publico.

A separacao central e esta:

```txt
descoberta + importacao + score
    -> nao gera Page, nao chama IA e nao publica

aprovacao
    -> decisao editorial manual, ainda sem gerar Page

geracao de topic aprovado
    -> chama Marketplace Pipeline com autoGenerate e autoPublish habilitados
    -> pode reutilizar, gerar, enviar para revisao ou publicar uma Page
```

Portanto, o sistema possui uma fila editorial controlada, mas a acao explicita
de gerar nao e somente uma pre-visualizacao: ela pode chegar ate a publicacao.

## 2. Arquitetura atual

```txt
Strapi Admin /seo-intelligence
        |
        +-- Descobrir topics
        |       |
        |       +-- Templates deterministas
        |       |       -> keyword-discovery.js
        |       |
        |       +-- Google Trends
        |               -> google-trends.js
        |               -> search-demand-engine.js
        |               -> trend-topic-expander.js
        |               -> trend-topic-import.js
        |
        +-- DiscoveryWorkspace
        |       -> agrupa uma pesquisa pelo termo-base
        |
        +-- EditorialTopic Queue
        |       -> pending / approved / processing / published / rejected
        |
        +-- Topic Score
        |       -> demanda + gap + intencao - competicao + frescor
        |
        +-- Gerar topic aprovado
        |       -> Marketplace Pipeline
        |       -> Editorial Plan
        |       -> selecao de produtos por intencao/restricao
        |       -> AI Generator
        |       -> Page / Ranking / RankingItem
        |       -> Publication Workflow
        |
        +-- Clusters editoriais
                -> topics + Pages publicadas
                -> cobertura, score e sugestao de hub

API publica
        -> internal-linking.js
        -> relatedPages dinamicas entre Pages publicadas
```

O plugin e habilitado em `config/plugins.js` e exposto apenas como rota de
administracao autenticada. A entrada visual e registrada em `src/admin/app.js`.

## 3. Descoberta de topics

### 3.1 Entrada

No Admin, o operador informa:

- um termo-base, por exemplo `notebook` ou `air fryer`;
- uma fonte: `templates`, `trends` ou `both`.

O endpoint utilizado e:

```http
POST /seo-intelligence/topics/discover
Content-Type: application/json

{
  "term": "notebook",
  "source": "both"
}
```

O termo e obrigatorio. Qualquer fonte fora das tres opcoes aceitas causa erro de
validacao.

### 3.2 Workspace de descoberta

Antes de importar os topics, o sistema cria ou reutiliza um
`DiscoveryWorkspace`. A chave unica operacional e `workspaceKey`, normalizada e
singularizada a partir do termo-base.

O workspace guarda:

- nome e nome normalizado;
- `workspaceKey` canonica;
- termo original da pesquisa;
- status `active` ou `archived`;
- total de topics vinculados.

Se uma pesquisa antiga estiver arquivada e o mesmo termo voltar a ser usado, o
workspace e reativado. Singular e plural reutilizam o mesmo registro, por
exemplo `Notebooks -> notebook` e `Air Fryers -> air-fryer`. No bootstrap do
Strapi existe um backfill idempotente que consolida workspaces equivalentes e
liga topics antigos ao workspace correspondente usando `sourceTerm`.

### 3.3 Fonte por templates

`keyword-discovery.js` gera variacoes editoriais deterministas, sem IA. As
variacoes cobrem as intencoes:

- `best`;
- `costBenefit`;
- `comparison`;
- `buyingGuide`;
- `useCase`.

Cada oportunidade recebe keyword, keyword normalizada, intent, template,
prioridade, fonte e metadata.

### 3.4 Fonte Google Trends

O adaptador consulta pesquisas relacionadas do Google Trends para `geo=BR`.
Ele trabalha com os grupos `top` e `rising`:

- `top` preserva o indice relativo de 0 a 100;
- `rising` e normalizado para 0 a 100 dentro da amostra;
- keywords repetidas conservam o maior score encontrado.

O `trendScore` e um sinal relativo. Ele nao representa volume absoluto de
buscas.

O adaptador tenta hosts regionais alternativos quando um host recebe rate
limit. Se todos falharem com HTTP 429, a descoberta por templates ainda pode ser
preservada e a resposta recebe o warning `google_trends_rate_limited`.

### 3.5 Expansao e filtro editorial

Resultados brutos de Trends nao sao persistidos automaticamente. O expander:

- preserva queries que ja possuem contexto suficiente;
- combina marcas ou modelos curtos com o termo-base;
- cria variacoes editoriais contextualizadas;
- classifica sinais de preco, comparacao e caso de uso;
- remove termos genericos, receitas, tutoriais e ruido de outro dominio;
- devolve warnings para itens descartados.

Exemplo conceitual:

```txt
termo-base: notebook
sinal bruto: dell

resultado editorial:
    notebooks dell
    melhores notebooks dell

nao persiste:
    dell
```

## 4. Persistencia e idempotencia

As oportunidades entram no collection type `EditorialTopic`. A chave
`normalizedKeyword` e unica, entao a mesma oportunidade nao e duplicada em uma
nova execucao.

Topics novos recebem:

```txt
status = pending
sourceMarketplace = mercadoLivre
```

Para um topic ja existente, a importacao aplica somente atualizacoes seguras:

- aumenta a prioridade se a nova for maior;
- incorpora metadata ausente sem apagar metadata existente;
- preenche origem/categoria/workspace se ainda estiverem vazios;
- nao sobrescreve a decisao editorial nem rebaixa o status.

Uma comparacao estrutural de metadata evita que uma reexecucao identica produza
updates sem mudanca real. O resultado da operacao informa `created`, `updated`
e `skipped`.

## 5. Topic Score

Depois de uma descoberta que retornou topics, o orquestrador executa um refresh
global dos scores. O comando manual equivalente e:

```bash
yarn refresh:topic-scores
```

Atualmente o refresh inclui topics `pending`, `approved` e `published`; ignora
`processing` e `rejected`. O resultado e salvo em:

```txt
metadata.topicScore
metadata.topicScoreBreakdown
metadata.lastScoredAt
```

### 5.1 Formula

```txt
Topic Score = demanda
            + gap do cluster
            + intencao comercial
            + penalidade de competicao
            + frescor

resultado final limitado entre 0 e 100
```

| Componente | Faixa | Regra atual |
| --- | ---: | --- |
| Demanda | 0 a 40 | `trendScore` convertido proporcionalmente; sem Trends recebe baseline 10 |
| Gap do cluster | 0, 12 ou 25 | 25 sem cobertura do cluster/intent; 12 com intent mas sem pagina equivalente; 0 quando ja coberto |
| Intencao comercial | 5 a 20 | best/costBenefit 20; comparison 18; useCase 15; buyingGuide 10; informational 5 |
| Competicao | 0 a -20 | penaliza Page publicada ou topic aprovado equivalente/semelhante |
| Frescor | 0 a 15 | 15 ate 7 dias; 12 ate 30; 8 ate 90; 4 ate 180; 0 depois disso |

A similaridade competitiva usa sobreposicao de tokens. No mesmo cluster:

- equivalencia exata de `editorialKey` ou keyword: `-20`;
- similaridade a partir de 0,80: `-15`;
- similaridade a partir de 0,65: `-10`;
- similaridade a partir de 0,50: `-5`.

O score e deterministico para o mesmo banco e instante de calculo. Ele nao chama
IA nem consulta Trends durante o refresh; usa os sinais ja persistidos.

### 5.2 Uso na fila

A listagem busca ate 10.000 candidatos, aplica filtros e ordena por:

1. Topic Score decrescente;
2. prioridade decrescente.

O Admin mostra badge de score e permite expandir cada componente com a
justificativa produzida pelo motor.

## 6. Fila e ciclo de vida

Estados persistidos:

```txt
pending
approved
processing
published
rejected
```

Transicoes editoriais permitidas:

```txt
pending  -> approved
pending  -> rejected
approved -> rejected
approved -> pending
rejected -> approved
rejected -> pending
```

Topics `processing` e `published` nao podem ser alterados pelas acoes normais da
fila. As datas `approvedAt`, `rejectedAt` e `publishedAt` sao atualizadas ou
limpas conforme a transicao.

A listagem aceita filtros por status, intent, texto e workspace. A busca textual
considera `keyword`, `normalizedKeyword` e `sourceTerm`.

## 7. Geracao individual

Somente um topic `approved` pode iniciar geracao. A excecao e um topic ja
`published` com Page ligada, que retorna como operacao ignorada/idempotente.

Ao iniciar:

1. o topic muda para `processing`;
2. `metadata.lastGeneration` recebe horario de inicio;
3. o sistema chama `runMarketplacePipeline()`;
4. o pipeline recebe keyword, intent, template, slug/titulo preferidos, limites
   de produtos, site do Mercado Livre e as flags `autoGenerate` e `autoPublish`;
5. o resultado e resumido e gravado no topic;
6. quando publicado, o topic muda para `published` e liga a Page;
7. quando exige revisao ou termina sem publicacao, volta para `approved`;
8. em erro, volta para `approved` com mensagem e timestamps em
   `metadata.lastGeneration`.

O pipeline pode reaproveitar uma Page existente. Isso e resultado valido, nao
uma falha.

### 7.1 Selecao de produtos

A fila calcula um plano de selecao por intent:

- `best`: popularidade, disponibilidade, avaliacao e preco razoavel;
- `costBenefit`: preco abaixo da mediana, avaliacao e desconto;
- `comparison`: variedade real de marcas, modelos, atributos e precos;
- `buyingGuide`: diversidade para explicar criterios de compra;
- `useCase`: regras especificas para estudar, trabalhar, jogar, cozinhar etc.

Tambem detecta restricao de marca na keyword. Um topic como `notebooks Dell`
deve usar somente produtos Dell. Se nao houver produtos suficientes para o
limite solicitado, o pipeline produz erro de validacao em vez de completar a
lista com outras marcas.

## 8. Geracao em lote

O botao `Gerar Top 5 Aprovados` chama:

```http
POST /seo-intelligence/topics/bulk-generate

{
  "limit": 5
}
```

Regras:

- seleciona exclusivamente topics `approved`;
- usa limite padrao 5 e teto absoluto 10;
- ordena por score, prioridade e data de criacao mais antiga;
- executa sequencialmente, nao em paralelo;
- continua apos falha individual;
- classifica cada item como `generated`, `reused` ou `failed`;
- tenta recuperar qualquer item preso em `processing` para `approved`.

Topics `pending` nunca sao aprovados ou gerados implicitamente pelo lote.

## 9. Workspaces, clusters e hubs

O Admin possui tres secoes:

- pesquisas/workspaces;
- todos os topics ou topics de um workspace;
- clusters editoriais.

Ao abrir um workspace, o detalhe apresenta metricas de fila, score medio,
ultima descoberta, Pages relacionadas e cobertura por intent. Topics e clusters
permanecem navegaveis dentro do mesmo contexto. O dashboard e somente
diagnostico e nao inicia geracao ou publicacao.

Um cluster combina `EditorialTopic` e Pages de ranking publicadas usando a base
da `editorialKey` e o termo editorial normalizado. Cada cluster apresenta:

- topics por status;
- Pages publicadas;
- intencoes cobertas;
- prioridade maxima;
- score de elegibilidade para hub;
- sugestao de titulo, slug e categoria para o hub.

Um cluster e considerado elegivel somente quando possui ao mesmo tempo:

- pelo menos 3 Pages publicadas;
- pelo menos 2 intencoes editoriais distintas;
- pelo menos 5 topics.

Score de hub:

```txt
Pages publicadas: ate 50 pontos
Intencoes distintas: ate 30 pontos
Total de topics: ate 20 pontos
```

O sistema apenas calcula e exibe a elegibilidade. Nao existe nesta camada uma
acao que crie automaticamente a Page de hub.

## 10. Links internos no frontend publico

O SEO Intelligence tambem participa indiretamente da resposta publica. Ao
serializar uma Page publicada de ranking, o servico publico pode substituir a
relacao manual `relatedPages` por recomendacoes dinamicas.

O score de relacionamento privilegia:

- mesma base editorial: +100;
- mesma categoria: +35;
- mesma subcategoria: +15;
- mesma intent: +8;
- mesmo pageType: +5;
- candidato com editorialKey explicita: +2.

Sao retornadas no maximo 8 Pages publicadas, ordenadas pelo score. Essa camada
nao cria links no banco; ela calcula a lista durante a leitura publica.

## 11. Rotas administrativas

Todas exigem `admin::isAuthenticatedAdmin`.

| Metodo | Rota | Funcao |
| --- | --- | --- |
| GET | `/seo-intelligence/workspaces` | Lista pesquisas editoriais |
| GET | `/seo-intelligence/workspaces/:id` | Exibe metricas, cobertura, Pages e clusters do workspace |
| GET | `/seo-intelligence/topics` | Lista e filtra a fila |
| GET | `/seo-intelligence/clusters` | Monta clusters e elegibilidade de hub |
| POST | `/seo-intelligence/topics/discover` | Descobre, importa e pontua topics |
| POST | `/seo-intelligence/topics/:id/approve` | Aprova topic |
| POST | `/seo-intelligence/topics/:id/reject` | Rejeita topic |
| POST | `/seo-intelligence/topics/:id/pending` | Devolve para pending |
| POST | `/seo-intelligence/topics/:id/generate` | Gera topic aprovado |
| POST | `/seo-intelligence/topics/bulk-generate` | Gera lote de aprovados |

## 12. Scripts operacionais

| Comando | Efeito |
| --- | --- |
| `yarn discover:keywords <termo>` | Mostra variacoes deterministas sem persistir |
| `yarn import:keywords <termo>` | Persiste topics deterministas em pending |
| `yarn discover:trends <termo>` | Consulta Trends sem persistir |
| `yarn import:trend-topics <termo>` | Expande e persiste Trends em pending |
| `yarn refresh:topic-scores` | Recalcula e persiste scores |
| `yarn inspect:topic-clusters` | Inspeciona clusters e hubs sugeridos |
| `yarn simulate:intent-ranking` | Simula regras de ranking por intent |
| `yarn inspect:editorial-plan` | Mostra o plano editorial determinista |

## 13. Fotografia do banco local

Consulta somente leitura executada em 21 de junho de 2026:

| Indicador | Valor |
| --- | ---: |
| EditorialTopics | 108 |
| Pending | 104 |
| Published | 4 |
| Approved | 0 |
| Processing | 0 |
| Rejected | 0 |
| Topics com Topic Score | 108 |
| Topics ligados a Page | 4 |
| Workspaces ativos | 3 |
| Pages publicadas de ranking | 21 |
| Score minimo / medio / maximo | 25 / 63,1 / 100 |
| Ultimo refresh de score | 20/06/2026 16:58:21 UTC |

Origem dos topics:

| Fonte | Quantidade |
| --- | ---: |
| `deterministic-template` | 55 |
| `google_trends` | 52 |
| `manual-admin-test` | 1 |

Workspaces atuais:

| Workspace | Topics |
| --- | ---: |
| Notebook (`notebook`) | 61 |
| Air fryer (`air-fryer`) | 33 |
| Cadeira gamer (`cadeira-gamer`) | 14 |

O backfill consolidou 5 workspaces em 3, movendo 30 vinculos sem alterar os 108
registros `EditorialTopic` nem seus status.

## 14. Pontos fortes

- Separacao real entre descoberta, decisao editorial e geracao.
- Persistencia idempotente por keyword normalizada.
- Trends e apenas um sinal; resultados passam por contexto e filtro editorial.
- Score explicavel, deterministico e com breakdown persistido.
- Geracao protegida por status `approved`.
- Lote pequeno, sequencial e com recuperacao de falhas.
- Reuso de Page e tratado como comportamento esperado.
- Intencao editorial altera selecao de produtos e conteudo, nao apenas o titulo.
- Restricao de marca reduz o risco de paginas semanticamente incorretas.
- Clusters usam topics e Pages reais para revelar lacunas de cobertura.
- Links internos dinamicos aproveitam a mesma identidade editorial.

## 15. Riscos, limites e dividas atuais

### 15.1 A documentacao anterior esta desatualizada

`docs/backend/seo-intelligence.md` ainda descreve aprovacao e geracao como
"futuras", embora ambas ja existam. `docs/backend/seo-discovery-layer.md`
tambem mistura a fase de descoberta sem persistencia com a importacao que ja
persiste. Este relatorio deve ser usado como referencia do estado atual.

### 15.2 Google Trends nao possui SLA para este uso

Failover regional reduz falhas por host, mas nao elimina HTTP 429. Nao ha neste
fluxo cache persistente, agenda, fila assíncrona ou controle central de
frequencia.

### 15.3 O refresh apos descoberta e global

Quando uma pesquisa cria topics, `refreshTopicScores()` recalcula ate 10.000
topics `pending`, `approved` e `published`, nao apenas os topics alterados. O
custo cresce linearmente e cada topic gera um update individual no banco.

### 15.4 O score de frescor muda com o tempo

O algoritmo e deterministico, mas o resultado nao e imutavel: o componente de
frescor depende da data do refresh. Scores antigos ficam desatualizados ate uma
nova descoberta ou execucao manual do script.

### 15.5 Nao ha aprovados no banco local

Na fotografia atual, 104 topics aguardam revisao e nenhum esta aprovado. Logo,
o botao de lote nao faria nada agora. Isso pode ser uma escolha editorial, mas
tambem indica backlog sem processamento.

### 15.6 A geracao pode publicar

O nome `Gerar Pagina` pode sugerir apenas criacao de rascunho, porem o backend
envia `autoPublish: true`. A publicacao ainda depende das validacoes do
Publication Workflow, mas o efeito potencial precisa estar claro para o
operador.

### 15.7 Cobertura de testes ainda e parcial

Canonicalizacao, metricas e cobertura de workspace possuem testes unitarios.
Regras anteriores como score, transicoes editoriais, recuperacao do lote e
filtros de ruido ainda nao possuem uma suite automatizada completa.

### 15.8 Consultas possuem limites fixos

Fila, score e clusters usam tetos como 10.000 candidatos; links internos usam
500 Pages. Eles sao suficientes para o volume atual, mas nao ha paginacao ou
processamento incremental para um catalogo muito maior.

### 15.9 Hub editorial e apenas recomendacao

O score de hub e util para diagnostico, mas nao existe fluxo de aprovacao,
criacao ou acompanhamento do hub sugerido dentro do SEO Intelligence.

## 16. Conclusao

O SEO Intelligence esta funcional como um sistema de pesquisa editorial e fila
de producao controlada. A parte de descoberta e score e local/deterministica,
com Google Trends usado apenas como sinal externo. A fronteira de seguranca e a
aprovacao manual: somente depois dela o topic pode acessar o pipeline que gera,
reutiliza e potencialmente publica uma Page.

O principal gargalo atual nao e falta de funcionalidade, mas operacao e
governanca: existe um backlog grande em `pending`, nenhuma aprovacao ativa e
cobertura automatizada ainda parcial para regras anteriores. A Sprint A resolveu
a fragmentacao singular/plural e tornou metricas e lacunas editoriais visiveis
por workspace. O proximo ganho de maturidade viria da operacao recorrente desse
diagnostico e da ampliacao dos testes.
