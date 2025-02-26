import { AnySchema } from '@orama/orama'

export const DOCS_PRESET_SCHEMA: AnySchema = {
  title: 'string',
  content: 'string',
  path: 'string',
  section: 'string',
  category: 'enum',
  version: 'enum'
}
