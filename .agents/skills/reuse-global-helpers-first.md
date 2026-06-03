# Skill: Reutilizar helpers globais antes de criar novos

Objetivo: evitar duplicacao de utilitarios e funcoes auxiliares no backend.

Aplicar sempre que a tarefa envolver:

- helper
- utilitario
- funcao compartilhada
- regra de suporte a service, controller ou cron

---

## Regra principal

Antes de criar qualquer funcao auxiliar nova, verificar se ja existe algo global ou compartilhado que resolva o problema.

Locais de busca obrigatoria:

- `functions/`
- `src/functions/`
- `config/`
- utilitarios do modulo atual

---

## Quando criar algo novo

Criar helper novo somente quando:

- nao existir equivalente global
- adaptar o existente piorar o codigo
- a nova funcao realmente tiver identidade propria

Se houver algo parecido:

- reutilizar
- extrair base comum
- centralizar em vez de duplicar

---

## Checklist final

- Procurei primeiro por helper global?
- Havia algo em `functions/` ou `src/functions/`?
- A nova funcao era realmente necessaria?
- Evitei duplicar comportamento que ja existia no projeto?
