# Skill: Fazer deploy usando `.env.production` e `.gitlab-ci.yml`

Objetivo: garantir que build e deploy sigam o fluxo oficial do template Strapi.

Aplicar sempre que a tarefa envolver:

- build
- deploy
- CI/CD
- pipeline
- publicacao
- ajuste de processo de entrega

---

## Regra principal

Sempre usar estes arquivos como referencia principal de deploy:

- `.env.production`
- `.gitlab-ci.yml`

Nao criar fluxo paralelo de deploy sem necessidade clara.

---

## Regras obrigatórias

### 1) Entender o build existente antes de alterar

Antes de mudar deploy:

- ler `.gitlab-ci.yml`
- entender o que ele faz no build
- entender como `.env.production` entra no processo

### 2) Deploy deve seguir o padrao do projeto

O pipeline existente ja mostra:

- copia de `.env.production` para `.env`
- build da aplicacao
- empacotamento
- transferencia do artefato
- reinstalacao e restart com `pm2`

Esse fluxo deve ser a referencia oficial.

### 3) Nao usar `.env.example` para deploy

Para deploy:

- usar `.env.production`

`.env.example` deve ficar restrito ao ambiente local.

---

## Checklist final

- O fluxo considerou `.env.production`?
- `.gitlab-ci.yml` foi usado como referencia antes de alterar deploy?
- Nenhum processo paralelo de deploy foi criado sem necessidade?
- O build continua coerente com a pipeline oficial do projeto?
