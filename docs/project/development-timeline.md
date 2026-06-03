# Guia dos Achados — Cronograma de Desenvolvimento

## Objetivo do Cronograma

Este cronograma define a ordem de construção da plataforma Guia dos Achados, cobrindo backend, frontend, integrações, IA, SEO, analytics, performance e publicação.

A ideia é seguir uma construção progressiva, evitando criar automações avançadas antes da base estar validada.

---

# Fase 1 — Preparação do Projeto

## Objetivo

Preparar a base técnica do projeto antes de iniciar as funcionalidades.

## Tarefas

- Revisar arquitetura atual do backend Strapi.
- Alterar banco de MySQL para PostgreSQL.
- Configurar ambiente local com PostgreSQL.
- Definir variáveis de ambiente.
- Organizar estrutura inicial do projeto.
- Definir padrão de branches.
- Configurar repositórios.
- Definir padrão de commits.
- Definir estrutura de deploy.

## Entregáveis

- Backend rodando com PostgreSQL.
- Projeto versionado.
- Ambiente local funcional.
- Estrutura inicial limpa.

---

# Fase 2 — Modelagem Inicial do CMS

## Objetivo

Criar os content-types principais no Strapi.

## Tarefas

Criar os seguintes modelos:

- Category
- SubCategory
- Marketplace
- Product
- Ranking
- RankingItem
- Article
- SeoPage
- AffiliateLink
- AiGenerationLog
- ClickEvent

## Entregáveis

- CMS com estrutura inicial criada.
- Relacionamentos principais definidos.
- Permissões básicas configuradas.
- Painel preparado para cadastro manual.

---

# Fase 3 — Backend Base

## Objetivo

Criar a base da API que será consumida pelo frontend.

## Tarefas

- Criar endpoints públicos para páginas publicadas.
- Criar endpoints para categorias.
- Criar endpoints para rankings.
- Criar endpoints para produtos.
- Criar filtros por status de publicação.
- Criar filtros por categoria e slug.
- Criar estrutura para páginas SEO.
- Criar validações básicas.

## Entregáveis

- API pública funcional.
- Dados do Strapi disponíveis para o frontend.
- Estrutura pronta para páginas dinâmicas.

---

# Fase 4 — Frontend Base

## Objetivo

Criar o frontend público com foco em SEO e performance.

## Stack

- Next.js
- Vercel
- styled-components ou CSS Modules
- ISR/SSR

## Tarefas

- Criar layout base.
- Criar home.
- Criar página de categoria.
- Criar página de ranking.
- Criar página de artigo.
- Criar componente de card de produto.
- Criar componente de lista Top 10.
- Criar breadcrumb.
- Criar header e footer.
- Criar estrutura de metadata dinâmica.
- Criar estrutura de sitemap.
- Criar robots.txt.

## Entregáveis

- Frontend navegável.
- Páginas consumindo dados do Strapi.
- Estrutura inicial otimizada para Google.

---

# Fase 5 — SEO Base

## Objetivo

Garantir que o projeto já nasça preparado para indexação.

## Tarefas

- Criar metadata dinâmica por página.
- Criar title e description por conteúdo.
- Criar canonical URLs.
- Criar Open Graph.
- Criar schema.org para artigos.
- Criar schema.org para listas/rankings.
- Criar sitemap.xml dinâmico.
- Criar robots.txt.
- Criar estrutura de links internos.
- Criar breadcrumbs semânticos.

## Entregáveis

- Páginas prontas para indexação.
- SEO técnico base implementado.
- Estrutura compatível com Google e mecanismos de busca por IA.

---

# Fase 6 — Integração Mercado Livre

## Objetivo

Reduzir trabalho manual ao buscar produtos automaticamente.

## Tarefas

- Estudar fluxo oficial da API do Mercado Livre.
- Validar possibilidade de gerar ou recuperar links afiliados automaticamente.
- Criar integração de busca de produtos.
- Buscar produtos por palavra-chave.
- Buscar detalhes do produto.
- Buscar imagens.
- Buscar preço.
- Buscar avaliações, quando disponível.
- Buscar vendedor, quando disponível.
- Salvar produtos no Strapi.
- Criar status de produto importado.
- Permitir revisão manual antes de usar em uma página.

## Entregáveis

- Serviço de importação do Mercado Livre.
- Produtos sendo salvos no CMS.
- Base pronta para criação de rankings.

---

# Fase 7 — Ranking Manual Assistido

## Objetivo

Permitir criar páginas Top 10 usando produtos importados.

## Tarefas

- Criar tela/processo no Strapi para montar ranking.
- Selecionar categoria.
- Selecionar produtos importados.
- Definir ordem dos produtos.
- Criar campo de justificativa.
- Criar campo de destaque do produto.
- Criar status: draft, review, published.
- Permitir revisão manual.
- Publicar ranking no frontend.

## Entregáveis

- Primeiras páginas Top 10 criadas.
- Fluxo manual funcional.
- Base pronta para receber IA.

---

# Fase 8 — IA para Geração de Conteúdo

## Objetivo

Usar GPT-4.1 Mini para acelerar criação de conteúdo.

## Tarefas

- Criar serviço de IA separado.
- Criar prompts base do projeto.
- Criar geração de título SEO.
- Criar geração de meta description.
- Criar resumo da página.
- Criar descrição dos produtos.
- Criar prós e contras.
- Criar FAQ.
- Criar conclusão/recomendação.
- Salvar logs de geração.
- Permitir revisão manual antes da publicação.

## Entregáveis

- Conteúdo gerado por IA.
- Processo de aprovação manual.
- Histórico de gerações salvo.

---

# Fase 9 — Analytics e Monitoramento

## Objetivo

Entender se as pessoas estão acessando, clicando e quais páginas performam melhor.

## Tarefas

- Configurar Google Analytics.
- Configurar Google Search Console.
- Criar eventos de clique em produtos.
- Salvar ClickEvent no Strapi.
- Registrar página de origem do clique.
- Registrar produto clicado.
- Registrar marketplace.
- Criar visão básica no painel.
- Monitorar páginas mais acessadas.
- Monitorar páginas com mais cliques.

## Entregáveis

- Analytics ativo.
- Cliques rastreados.
- Dados iniciais de performance disponíveis.

---

# Fase 10 — Performance

## Objetivo

Garantir que o site seja rápido, leve e preparado para SEO.

## Tarefas

- Usar ISR nas páginas de ranking e artigo.
- Otimizar imagens.
- Usar lazy loading.
- Reduzir JavaScript no cliente.
- Evitar chamadas desnecessárias no client-side.
- Melhorar Core Web Vitals.
- Testar Lighthouse.
- Testar mobile.
- Otimizar fontes.
- Otimizar componentes pesados.

## Entregáveis

- Páginas rápidas.
- Boa pontuação no Lighthouse.
- Experiência boa em mobile.
- Base preparada para anúncios futuros.

---

# Fase 11 — MVP de Conteúdo

## Objetivo

Publicar as primeiras páginas reais do projeto.

## Escopo Inicial

Criar entre 30 e 60 páginas.

Categorias iniciais:

- Construção
- Carros e motos
- Tecnologia

Tipos de página:

- Top 10
- Guia de compra
- Comparativo

## Tarefas

- Criar primeiras categorias.
- Criar primeiras subcategorias.
- Importar produtos.
- Criar rankings.
- Gerar conteúdo com IA.
- Revisar manualmente.
- Publicar páginas.
- Enviar sitemap ao Search Console.
- Monitorar indexação.

## Entregáveis

- Primeiras páginas publicadas.
- Site indexável.
- Estrutura de conteúdo validada.

---

# Fase 12 — Discovery Engine Inicial

## Objetivo

Começar a criar páginas com base no que as pessoas procuram.

## Tarefas

- Mapear palavras-chave manualmente.
- Usar Google Trends.
- Usar sugestões do Google.
- Usar dados do Search Console.
- Criar lista de oportunidades.
- Priorizar páginas por intenção de compra.
- Criar backlog de conteúdos.
- Definir score de oportunidade.

## Entregáveis

- Backlog de páginas baseado em demanda real.
- Critério claro para decidir novas páginas.

---

# Fase 13 — Preparação para Anúncios

## Objetivo

Preparar o site para monetização com anúncios sem prejudicar performance.

## Tarefas

- Definir áreas futuras de anúncio.
- Criar slots no layout.
- Evitar anúncios no carregamento inicial.
- Reservar espaço visual para evitar layout shift.
- Preparar política de privacidade.
- Preparar página de termos.
- Preparar aviso de afiliados.
- Preparar estrutura para Google AdSense futuramente.

## Entregáveis

- Layout preparado para anúncios.
- Estrutura legal básica criada.
- Site pronto para monetização futura.

---

# Fase 14 — Deploy Produção

## Objetivo

Publicar o projeto em ambiente real.

## Tarefas

- Configurar domínio.
- Configurar Vercel.
- Configurar backend na AWS.
- Configurar PostgreSQL.
- Configurar SSL.
- Configurar variáveis de produção.
- Configurar backups.
- Configurar logs.
- Configurar alertas básicos.
- Testar publicação.
- Testar páginas.
- Testar sitemap.
- Testar eventos de clique.

## Entregáveis

- Projeto publicado.
- Frontend em produção.
- Backend em produção.
- CMS funcional.
- Analytics ativo.

---

# Fase 15 — Validação Pós-Lançamento

## Objetivo

Medir se o projeto está sendo encontrado e se as páginas geram cliques.

## Tarefas

- Acompanhar indexação.
- Acompanhar Search Console.
- Acompanhar Google Analytics.
- Acompanhar cliques em produtos.
- Identificar páginas sem acesso.
- Identificar páginas com acesso e sem clique.
- Melhorar páginas com baixa performance.
- Criar novas páginas com base nos dados.
- Ajustar títulos e descrições.

## Entregáveis

- Primeiros dados reais.
- Páginas otimizadas.
- Direção clara para escalar conteúdo.

---

# Fase 16 — Escala Controlada

## Objetivo

Aumentar volume sem perder qualidade.

## Tarefas

- Expandir para novas páginas.
- Criar novas categorias.
- Automatizar parte da importação.
- Melhorar geração por IA.
- Criar ranking automático sugerido.
- Manter aprovação humana.
- Criar comparativos automáticos.
- Criar guias por categoria.
- Criar páginas de intenção específica.

## Entregáveis

- Mais páginas publicadas.
- Processo mais automatizado.
- Crescimento orientado por dados.

---

# Ordem Recomendada de Execução

1. Preparação do projeto
2. PostgreSQL no Strapi
3. Modelagem inicial do CMS
4. API pública
5. Frontend Next.js
6. SEO base
7. Integração Mercado Livre
8. Rankings manuais
9. IA para conteúdo
10. Analytics
11. Performance
12. Publicação das primeiras páginas
13. Search Console
14. Validação
15. Escala controlada

---

# O que NÃO fazer no início

- Não automatizar publicação sem revisão.
- Não criar centenas de páginas sem validar.
- Não integrar vários marketplaces ao mesmo tempo.
- Não colocar anúncios antes de tráfego.
- Não gastar com infraestrutura pesada.
- Não criar sistema complexo de recomendação antes do MVP.
- Não deixar o Strapi responsável por todos os workers.
- Não depender de client-side rendering.
- Não ignorar performance mobile.

---

# Critério para considerar o MVP pronto

O MVP estará pronto quando:

- O backend estiver em produção.
- O frontend estiver em produção.
- O CMS permitir criar páginas.
- O Mercado Livre estiver integrado ao fluxo inicial.
- A IA conseguir gerar conteúdo revisável.
- As páginas tiverem SEO técnico correto.
- O Analytics estiver funcionando.
- O Search Console estiver configurado.
- Entre 30 e 60 páginas estiverem publicadas.
- Os cliques em produtos estiverem sendo registrados.
- O site estiver rápido no mobile.

---
