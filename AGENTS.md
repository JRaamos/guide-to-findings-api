# AGENTS — Guia Nucleo do Template Strapi API

Este arquivo define as regras globais e imutaveis do projeto.
As instrucoes especializadas ficam em `.agents/skills`.

Todo agente deve ler este arquivo antes de editar qualquer codigo neste projeto.

---

## Ordem obrigatória antes de codar

Antes de implementar qualquer alteracao, o agente deve:

1. ler este `AGENTS.md` inteiro
2. identificar o modulo, fluxo ou alvo correto
3. carregar somente as skills necessarias em `.agents/skills`
4. aplicar as regras globais deste arquivo junto com as skills carregadas
5. so entao escrever codigo

Se houver conflito entre uma ideia nova e a arquitetura do projeto, a arquitetura do projeto tem prioridade.

---

## Como carregar skills

As skills desta pasta devem ser carregadas sob demanda, conforme o tipo de alteracao.

Use estas referencias:

- `.agents/skills/provision-local-environment.md`
  - quando a tarefa envolver setup local, banco, `.env` ou preparo da maquina

- `.agents/skills/deploy-with-production-env.md`
  - quando a tarefa envolver build, deploy, pipeline ou publicacao

- `.agents/skills/reuse-global-helpers-first.md`
  - quando surgir necessidade de criar funcao auxiliar, utilitario ou regra compartilhada

- `.agents/skills/use-policies-for-access-control.md`
  - quando a tarefa envolver restricao por usuario autenticado, ownership, escopo por registro ou autorizacao por rota

Se mais de uma skill se aplicar, carregar todas as necessarias antes de implementar.

---

## Estrutura oficial do projeto

O projeto deve seguir a estrutura oficial do Strapi:

```text
src/
  api/
    <content-type>/
      controllers/
      services/
      routes/
  extensions/
  middlewares/
  policies/
  index.js
```

Nada deve fugir dessa estrutura sem necessidade explicita.

---

## Controllers

Controllers devem:

- ser finos
- delegar logica para services
- evitar regra pesada
- evitar acesso direto a banco se houver service apropriado

Fluxo esperado:

```text
Controller
  -> Service
  -> Strapi Query / Entity / Document API
```

---

## Services

Toda regra de negocio deve ficar em services sempre que fizer sentido.

Services devem:

- ser reutilizaveis
- nao depender de `ctx`
- nao depender diretamente de request ou response
- evitar duplicacao de regra entre controllers

---

## Rotas, policies e middlewares

Ao criar nova rota:

- declarar dentro do modulo correto
- seguir padrao das rotas existentes
- respeitar policies ja usadas
- nao sobrescrever rotas default sem necessidade

Policies:

- usar policy quando houver regra de permissao
- nao colocar autorizacao no controller
- usar policy como primeira escolha quando a restricao depender do usuario autenticado ou do registro acessado
- preferir policy reutilizavel e ligada na rota correta em vez de espalhar verificacoes no controller

Middlewares:

- usar apenas para logging, validacao generica ou transformacao transversal
- nao colocar regra de negocio em middleware

---

## Banco e ambiente local

Este template usa MySQL como padrao principal.

Regras:

- para ambiente local, usar MySQL
- se a maquina ainda nao tiver MySQL disponivel, providenciar instalacao ou usar o `docker-compose.yml` do projeto
- para ambiente local, criar `.env` a partir de `.env.example`
- nao inventar configuracao local paralela se a base do projeto ja cobre o caso

Se a tarefa envolver setup local, carregar:

- `.agents/skills/provision-local-environment.md`

---

## Deploy e pipeline

Regras obrigatorias de deploy:

- para deploy, usar `.env.production` como referencia principal
- usar `.gitlab-ci.yml` como exemplo do fluxo oficial
- nao criar processo de deploy paralelo sem necessidade clara
- antes de mudar deploy, entender como build e publicacao ja funcionam no projeto

Se a tarefa envolver build ou deploy, carregar:

- `.agents/skills/deploy-with-production-env.md`

---

## Helpers e utilitários

Antes de criar qualquer funcao auxiliar nova:

- procurar em `functions/`
- procurar em `src/functions/`
- procurar em `config/`
- procurar no modulo atual

Criar helper novo apenas quando o projeto realmente nao tiver uma funcao global ou reutilizavel que resolva o problema.

Se a tarefa envolver utilitarios, carregar:

- `.agents/skills/reuse-global-helpers-first.md`

Se a tarefa envolver ownership, autorizacao por registro, escopo por usuario ou filtros de acesso por rota, carregar:

- `.agents/skills/use-policies-for-access-control.md`

---

## Segurança e compatibilidade

Nunca:

- remover campo existente sem solicitacao explicita
- alterar contrato publico sem necessidade
- quebrar compatibilidade de banco
- expor senha, token ou dado sensivel
- criar breaking change silenciosa

Sempre:

- validar entrada
- sanitizar dados quando necessario
- respeitar roles e permissions
- manter compatibilidade com o estado atual do projeto

---

## Checklist final antes de entregar

- O modulo correto foi identificado?
- As skills necessarias foram carregadas antes de editar?
- O ambiente local segue `.env.example` e MySQL?
- O deploy segue `.env.production` e `.gitlab-ci.yml`?
- Houve reuso de helper global antes de criar funcao nova?
- Regras de acesso por usuario ou ownership ficaram em policy, e nao no controller?
- A mudanca respeita o padrao do Strapi e evita breaking changes?
