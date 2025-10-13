import { DocumentID, getInternalDocumentId, InternalDocumentIDStore } from './internal-document-id-store.js'

export type PinAnchoring = 'is' | 'starts_with' | 'contains'

export interface PinCondition {
  anchoring: PinAnchoring
  pattern: string
}

export interface PinPromotion {
  doc_id: DocumentID
  position: number
}

export interface PinRule {
  id: string
  conditions: PinCondition[]
  consequence: {
    promote: PinPromotion[]
  }
}

export interface PinningStore {
  sharedInternalDocumentStore: InternalDocumentIDStore
  rules: Map<string, PinRule>
}

function create(sharedInternalDocumentStore: InternalDocumentIDStore): PinningStore {
  return {
    sharedInternalDocumentStore,
    rules: new Map()
  }
}

function addRule(store: PinningStore, rule: PinRule): void {
  if (store.rules.has(rule.id)) {
    throw new Error(
      `PINNING_RULE_ALREADY_EXISTS: A pinning rule with id "${rule.id}" already exists. Use updateRule to modify it.`
    )
  }
  store.rules.set(rule.id, rule)
}

function updateRule(store: PinningStore, rule: PinRule): void {
  if (!store.rules.has(rule.id)) {
    throw new Error(
      `PINNING_RULE_NOT_FOUND: Cannot update pinning rule with id "${rule.id}" because it does not exist. Use addRule to create it.`
    )
  }
  store.rules.set(rule.id, rule)
}

function removeRule(store: PinningStore, ruleId: string): boolean {
  return store.rules.delete(ruleId)
}

function getRule(store: PinningStore, ruleId: string): PinRule | undefined {
  return store.rules.get(ruleId)
}

function getAllRules(store: PinningStore): PinRule[] {
  return Array.from(store.rules.values())
}

function matchesCondition(term: string, condition: PinCondition): boolean {
  const normalizedTerm = term.toLowerCase().trim()
  const normalizedPattern = condition.pattern.toLowerCase().trim()

  switch (condition.anchoring) {
    case 'is':
      return normalizedTerm === normalizedPattern
    case 'starts_with':
      return normalizedTerm.startsWith(normalizedPattern)
    case 'contains':
      return normalizedTerm.includes(normalizedPattern)
    default:
      return false
  }
}

function matchesRule(term: string | undefined, rule: PinRule): boolean {
  if (!term) {
    return false
  }

  // All conditions must match (AND logic)
  return rule.conditions.every((condition) => matchesCondition(term, condition))
}

export function getMatchingRules(store: PinningStore, term: string | undefined): PinRule[] {
  if (!term) {
    return []
  }

  const matchingRules: PinRule[] = []
  for (const rule of store.rules.values()) {
    if (matchesRule(term, rule)) {
      matchingRules.push(rule)
    }
  }

  return matchingRules
}

type SerializablePinningStore = {
  rules: Array<[string, PinRule]>
}

export function load<R = unknown>(sharedInternalDocumentStore: InternalDocumentIDStore, raw: R): PinningStore {
  const rawStore = raw as SerializablePinningStore

  return {
    sharedInternalDocumentStore,
    rules: new Map(rawStore?.rules ?? [])
  }
}

export function save<R = unknown>(store: PinningStore): R {
  return {
    rules: Array.from(store.rules.entries())
  } as R
}

export interface IPinning {
  create(sharedInternalDocumentStore: InternalDocumentIDStore): PinningStore
  addRule(store: PinningStore, rule: PinRule): void
  updateRule(store: PinningStore, rule: PinRule): void
  removeRule(store: PinningStore, ruleId: string): boolean
  getRule(store: PinningStore, ruleId: string): PinRule | undefined
  getAllRules(store: PinningStore): PinRule[]
  getMatchingRules(store: PinningStore, term: string | undefined): PinRule[]
  load<R = unknown>(sharedInternalDocumentStore: InternalDocumentIDStore, raw: R): PinningStore
  save<R = unknown>(store: PinningStore): R
}

export function createPinning(): IPinning {
  return {
    create,
    addRule,
    updateRule,
    removeRule,
    getRule,
    getAllRules,
    getMatchingRules,
    load,
    save
  }
}
