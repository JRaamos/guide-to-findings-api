# AI Generator Admin Tool

Administrative tool for generating editorial drafts inside Strapi Admin.

V1 generates draft records from an existing Ranking:

```text
Ranking
↓
AI Generator
↓
Page draft
↓
Seo draft
↓
Faq draft
↓
AiGenerationLog
```

Admin UI:

```text
src/admin/admin/AiGeneratorPage/
src/admin/app.js
```

Backend implementation:

```text
src/api/ai-generator/
src/services/ai-generator/
```

Internal endpoint:

```text
POST /api/internal/ai-generator/generate-page
```

V1 non-goals:

- no public endpoint;
- no automatic publication;
- no automatic approval;
- no frontend Next.js integration;
- no Page overwrite when the existing Page is already published.
