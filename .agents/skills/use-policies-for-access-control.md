# Skill: Use Policies For Access Control

Use esta skill quando a tarefa envolver:

- autorizacao por usuario autenticado
- ownership de registro
- filtros de acesso por rota
- escopo "o usuario so pode ver/editar/remover os proprios dados"
- validacao de acesso antes do controller

## Objetivo

Sempre que a restricao depender do usuario autenticado ou do registro acessado, preferir policy em vez de colocar a regra dentro do controller.

## Exemplo oficial do template

Usar como referencia:

- `src/policies/is-owner.js`
- `src/api/support/routes/support.js`

Esse fluxo mostra o padrao esperado:

- a policy filtra a listagem para o usuario autenticado
- a policy valida `findOne`, `update` e `delete` por ownership
- a policy garante o `user` correto no `create` e no `update`
- as rotas apenas ligam a policy
- o controller continua limpo

## Regras

- nao colocar verificacao de ownership no controller se a policy resolver
- nao duplicar a mesma regra em varias rotas sem necessidade
- preferir policy global reutilizavel quando a regra puder se repetir
- quando houver listagem por usuario, a policy pode ajustar `ctx.query.filters`
- quando houver create/update ownership, a policy pode ajustar `ctx.request.body.data`
- quando houver acesso a registro unico, a policy deve validar a relacao antes de liberar

## Checklist

- A regra de acesso depende do usuario autenticado?
- A verificacao ficou em policy e nao no controller?
- A rota foi ligada corretamente na config do router?
- A listagem respeita o escopo do usuario?
- `create`, `update`, `findOne` e `delete` estao protegidos quando necessario?
