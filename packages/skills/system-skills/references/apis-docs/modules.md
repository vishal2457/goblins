# Project Modules

Project modules group tickets within a project. They are stored in the database and belong to exactly one project.

## Module Fields

Important module fields:

- `id`
- `projectId`
- `name`
- `shortDescription`
- `createdAt`
- `updatedAt`

`shortDescription` defaults to an empty string when omitted.

## Routes

### List modules for a project

`GET /api/v1/projects/{id}/modules`

Returns modules for the project, ordered by module name.

### Create module for a project

`POST /api/v1/projects/{id}/modules`

```json
{
  "name": "Backend",
  "shortDescription": "Express API and database work"
}
```

`name` is required. `shortDescription` is optional.

### List tickets for a module

`GET /api/v1/modules/{id}/tickets`

Returns tickets associated with the module.

## Notes

There are no standalone create, update, or delete module routes. Modules are created through a project route and are deleted when their parent project is deleted.
