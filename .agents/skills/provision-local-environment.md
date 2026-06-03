# Skill: Provisionar ambiente local do Strapi com MySQL

Objetivo: garantir que o ambiente local siga o padrao do projeto, usando MySQL e a configuracao de exemplo do proprio template.

Aplicar sempre que a tarefa envolver:

- setup local
- banco de dados
- criacao de `.env`
- onboarding do projeto
- preparacao da maquina para rodar o backend

---

## Regra principal

Para ambiente local, este projeto deve usar MySQL.

Se a maquina ainda nao tiver MySQL disponivel:

- instalar MySQL localmente
- ou usar o `docker-compose.yml` do projeto para provisionar o banco

Nao trocar o banco local por outra solucao so por conveniencia.

---

## Regras obrigatórias

### 1) Criar `.env` a partir de `.env.example`

Para ambiente local:

- usar `.env.example` como base
- criar `.env` local a partir dele
- nao inventar uma env local paralela sem necessidade

Arquivos de referencia:

- `.env.example`
- `config/database.js`

### 2) MySQL deve seguir o padrao do projeto

Usar como referencia:

- `docker-compose.yml`
- `config/database.js`

O `docker-compose.yml` ja mostra um caminho valido para subir MySQL localmente.

### 3) Nao alterar `.env.production` para resolver ambiente local

`.env.production` nao e a base do ambiente local.

Para local:

- usar `.env.example`

Para deploy:

- usar `.env.production`

---

## Checklist final

- O ambiente local usa MySQL?
- Se a maquina nao tinha MySQL, ele foi provisionado corretamente?
- O `.env` local foi criado a partir de `.env.example`?
- `config/database.js` continua coerente com o ambiente local?
