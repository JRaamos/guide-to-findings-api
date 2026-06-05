# Publication Workflow Admin Tool

Strapi Admin Publication Workflow.

This tool coordinates editorial approval and publication for content generated
by the AI Generator.

## Responsibilities

- List pages that are still in editorial workflow.
- Show Page, Seo, Faq and Ranking readiness data.
- Edit Page draft content during editorial review.
- Edit Seo draft fields during editorial review.
- Edit, add and remove active Faq items during editorial review.
- Approve Page, Seo and Faq records.
- Publish approved pages.
- Keep publication logic inside Strapi Admin.

## Flow

```txt
Page draft
↓
Review and edit Page, Seo and Faqs
↓
Save changes
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
- No user ownership or role-specific policy yet.
- No rollback workflow.
- No versioning or snapshots.

## V2 limitations

- Summary is stored as `Page.excerpt` because the current schema has no
  dedicated summary field.
- Removing a FAQ marks it inactive instead of deleting it.
- No advanced rich text editor.
- No drag-and-drop ordering.
- No rollback, snapshots or version history.
