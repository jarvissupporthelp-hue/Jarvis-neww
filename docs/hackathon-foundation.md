# Hackathon foundation architecture

Supabase Auth handles password hashing, token issuance and refresh, and sign-in rate limits. The existing active membership is the authorization source. New server routes call `requireRole(request, roles)`, which validates the bearer token and maps the existing `lecturer` membership to the foundation's `staff` role. UI visibility is complementary to API authorization. New handlers must validate ownership at the query boundary.

The Prisma connection targets the server-only `foundation` schema. The `User` ID matches the Supabase Auth ID, and its locale stores the dashboard preference. Legacy academic tables remain in `public` and are managed by Supabase migrations. Keep the foundation schema out of the Supabase Data API's exposed schemas. When integrating a module with legacy courses or enrollments, define the mapping explicitly before importing any existing data.

## Registering a module

Put the registration in `modules/<key>/index.ts` and use the `ModuleRegistration` type. Provide localized module titles, route URLs, a navigation URL, widget slot contributions, and permitted roles. Add one export to `lib/foundation/registry.ts`.

```ts
export { demo } from "@/modules/demo";
```

The dashboard reads every exported registration and filters by the verified role. Search and navigation use the same filtered set. Registry contributions link to their module destinations. For a new module page, export a `Page` component in the registration and use `/dashboard/<key>` for its URL. The shared route renders that component only for permitted roles. Guard module data APIs with `requireRole`. Each dashboard slot has its own error boundary. Notification loading and retry are contained within the notification widget.

The notification service accepts an in-app delivery channel by default and allows an alternate implementation of its `create` contract. Listing and marking read are scoped to the authenticated user. The seed creates five in-app notifications for the demo student.
