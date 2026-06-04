# Publication Workflow Admin Tool

V1 of the Strapi Admin Publication Workflow.

This tool coordinates editorial approval and publication for content generated
by the AI Generator.

## Responsibilities

- List pages that are still in editorial workflow.
- Show basic Page, Seo, Faq and Ranking readiness data.
- Approve Page, Seo and Faq records.
- Publish approved pages.
- Keep publication logic inside Strapi Admin.

## Flow

```txt
Page draft
↓
Review Page, Seo and Faqs
↓
Approve
↓
Validate readiness
↓
Publish
↓
Public endpoint returns the Page
```

## V1 limitations

- No visual content editor.
- No partial FAQ approval.
- No user ownership or role-specific policy yet.
- No rollback workflow.
- No versioning or snapshots.
