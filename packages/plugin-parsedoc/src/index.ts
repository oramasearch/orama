import { AnyDocument, AnyOrama, insertMultiple } from '@orama/orama'
import { glob } from 'glob'
import { Content, Element, Parent, Properties, Root } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import { fromString } from 'hast-util-from-string'
import { toHtml } from 'hast-util-to-html'
import { toString } from 'hast-util-to-string'
import { readFile } from 'node:fs/promises'
import { rehype } from 'rehype'
import rehypeDocument from 'rehype-document'
import rehypePresetMinify from 'rehype-preset-minify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

export type MergeStrategy = 'merge' | 'split' | 'both'

export const defaultHtmlSchema = {
  type: 'string',
  content: 'string',
  path: 'string'
} as const

export interface DefaultSchemaElement extends AnyDocument {
  type: string
  content: string
  path: string
  properties?: Properties
}

export type PopulateFnContext = Record<string, any>

interface PopulateFromGlobOptions {
  transformFn?: TransformFn
  mergeStrategy?: MergeStrategy
  context?: PopulateFnContext
}

type PopulateOptions = PopulateFromGlobOptions & { basePath?: string }

type FileType = 'html' | 'md'

export async function populateFromGlob<T extends AnyOrama>(
  db: T,
  pattern: string,
  options?: PopulateFromGlobOptions
): Promise<void> {
  const files = await glob(pattern)
  await Promise.all(files.map(async (filename) => populateFromFile(db, filename, options)))
}

async function populateFromFile<T extends AnyOrama>(
  db: T,
  filename: string,
  options?: PopulateFromGlobOptions
): Promise<string[]> {
  const data = await readFile(filename)
  const fileType = filename.slice(filename.lastIndexOf('.') + 1) as FileType
  return populate(db, data, fileType, { ...options, basePath: `${filename}/` })
}

export const parseFile = async (
  data: Buffer | string,
  fileType: FileType,
  options?: PopulateOptions
): Promise<DefaultSchemaElement[]> => {
  const records: DefaultSchemaElement[] = []
  switch (fileType) {
    case 'md':
      // eslint-disable-next-line no-case-declarations
      const tree = unified().use(remarkParse).parse(data)
      await unified()
        .use(remarkRehype)
        .use(rehypeDocument)
        .use(rehypePresetMinify)
        .use(rehypeOrama, records, options)
        .run(tree)
      break
    case 'html':
      await rehype().use(rehypePresetMinify).use(rehypeOrama, records, options).process(data)
      break
    /* c8 ignore start */
    default:
      return fileType
    /* c8 ignore stop */
  }

  return records
}

export async function populate<T extends AnyOrama>(
  db: T,
  data: Buffer | string,
  fileType: FileType,
  options?: PopulateOptions
): Promise<string[]> {
  return insertMultiple(db, (await parseFile(data, fileType, options)) as AnyDocument)
}

function rehypeOrama(records: DefaultSchemaElement[], options?: PopulateOptions): (tree: Root) => void {
  if (!options) {
    options = {}
  }

  return (tree: Root) => {
    tree.children.forEach((child, i) => {
      visitChildren(
        child,
        tree,
        `${options?.basePath /* c8 ignore next */ ?? ''}root[${i}]`,
        records,
        options!,
        structuredClone(options?.context ?? {})
      )
    })
  }
}

function visitChildren(
  node: Content,
  parent: Parent,
  path: string,
  records: DefaultSchemaElement[],
  options: PopulateOptions,
  context: PopulateFnContext
): void {
  if (node.type === 'text') {
    addRecords(
      node.value,
      (parent as Element).tagName,
      path,
      (parent as Element).properties,
      records,
      options.mergeStrategy ?? 'merge'
    )
    return
  }

  if (!('tagName' in node)) return

  const transformedNode =
    typeof options?.transformFn === 'function' ? applyTransform(node, options.transformFn, context) : node

  transformedNode.children.forEach((child, i) => {
    visitChildren(child, transformedNode, `${path}.${transformedNode.tagName}[${i}]`, records, options, context)
  })
}

function applyTransform(node: Element, transformFn: TransformFn, context: PopulateFnContext): Element {
  const preparedNode = prepareNode(node)
  const transformedNode = transformFn(preparedNode, context)
  return applyChanges(node, transformedNode)
}

function prepareNode(node: Element): NodeContent {
  const tag = node.tagName
  const content = toString(node)
  const raw = toHtml(node)
  const properties = node.properties
  return { tag, content, raw, properties }
}

function applyChanges(node: Element, transformedNode: NodeContent): Element {
  let changed = node

  if (toHtml(node) !== transformedNode.raw) {
    changed = fromHtml(transformedNode.raw, { fragment: true }).children[0] as Element
  } else {
    node.tagName = transformedNode.tag
    if (toString(node) !== transformedNode.content) {
      changed = fromString(node, transformedNode.content)
    }
  }

  changed.properties = { ...changed.properties, ...transformedNode.additionalProperties }
  return changed
}

function addRecords(
  content: string,
  type: string,
  path: string,
  properties: Properties | undefined,
  records: DefaultSchemaElement[],
  mergeStrategy: MergeStrategy
): void {
  const parentPath = path.substring(0, path.lastIndexOf('.'))
  const newRecord = { type, content, path: parentPath, properties }
  switch (mergeStrategy) {
    case 'merge':
      if (!isRecordMergeable(parentPath, type, records)) {
        records.push(newRecord)
        return
      }
      addContentToLastRecord(records, content, properties)
      return
    case 'split':
      records.push(newRecord)
      return
    case 'both':
      if (!isRecordMergeable(parentPath, type, records)) {
        records.push(newRecord, { ...newRecord })
        return
      }
      records.splice(records.length - 1, 0, newRecord)
      addContentToLastRecord(records, content, properties)
  }
}

function isRecordMergeable(path: string, tag: string, records: DefaultSchemaElement[]): boolean {
  if (!records.length) return false
  const lastRecord = records[records.length - 1]
  const parentPath = pathWithoutLastIndex(path)
  const lastPath = pathWithoutLastIndex(lastRecord.path)
  return parentPath === lastPath && tag === lastRecord.type
}

function pathWithoutLastIndex(path: string): string {
  const lastBracket = path.lastIndexOf('[')
  return path.slice(0, lastBracket)
}

function addContentToLastRecord(
  records: Array<DefaultSchemaElement & { properties?: Properties }>,
  content: string,
  properties?: Properties
): void {
  const lastRecord = records[records.length - 1]
  lastRecord.content += ` ${content}`
  lastRecord.properties = { ...properties, ...lastRecord.properties }
}

export interface NodeContent {
  tag: string
  raw: string
  content: string
  properties?: Properties
  additionalProperties?: Properties
}

export type TransformFn = (node: NodeContent, context: PopulateFnContext) => NodeContent
