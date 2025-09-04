/* eslint-disable @typescript-eslint/no-this-alias */
import { syncBoundedLevenshtein } from '../components/levenshtein.js'
import { InternalDocumentID } from '../components/internal-document-id-store.js'
import { getOwnProperty } from '../utils.js'

interface FindParams {
  term: string
  exact?: boolean
  tolerance?: number
}

export type FindResult = Record<string, InternalDocumentID[]>

export class RadixNode {
  // Node key
  public k: string
  // Node subword
  public s: string
  // Node children
  public c: Map<string, RadixNode> = new Map()
  // Node documents
  public d: Set<InternalDocumentID> = new Set()
  // Node end
  public e: boolean
  // Node word
  public w = ''

  constructor(key: string, subWord: string, end: boolean) {
    this.k = key
    this.s = subWord
    this.e = end
  }

  public updateParent(parent: RadixNode): void {
    this.w = parent.w + this.s
  }

  public addDocument(docID: InternalDocumentID): void {
    this.d.add(docID)
  }

  public removeDocument(docID: InternalDocumentID): boolean {
    return this.d.delete(docID)
  }

  public findAllWords(output: FindResult, term: string, exact?: boolean, tolerance?: number): FindResult {
    const stack: RadixNode[] = [this]
    while (stack.length > 0) {
      const node = stack.pop()!

      if (node.e) {
        const { w, d: docIDs } = node

        if (exact && w !== term) {
          continue
        }

        // check if _output[w] exists and then add the doc to it
        // always check in own property to prevent access to inherited properties
        // fix https://github.com/oramasearch/orama/issues/137
        if (getOwnProperty(output, w) !== null) {
          if (tolerance) {
            const difference = Math.abs(term.length - w.length)

            if (difference <= tolerance && syncBoundedLevenshtein(term, w, tolerance).isBounded) {
              output[w] = []
            } else {
              continue
            }
          } else {
            output[w] = []
          }
        }

        // check if _output[w] exists and then add the doc to it
        // always check in own property to prevent access to inherited properties
        // fix https://github.com/oramasearch/orama/issues/137
        if (getOwnProperty(output, w) != null && docIDs.size > 0) {
          const docs = output[w]
          for (const docID of docIDs) {
            if (!docs.includes(docID)) {
              docs.push(docID)
            }
          }
        }
      }

      if (node.c.size > 0) {
        stack.push(...node.c.values())
      }
    }
    return output
  }

  public insert(word: string, docId: InternalDocumentID): void {
    let node: RadixNode = this
    let i = 0
    const wordLength = word.length

    while (i < wordLength) {
      const currentCharacter = word[i]
      const childNode = node.c.get(currentCharacter)

      if (childNode) {
        const edgeLabel = childNode.s
        const edgeLabelLength = edgeLabel.length
        let j = 0

        // Find the common prefix length between edgeLabel and the remaining word
        while (j < edgeLabelLength && i + j < wordLength && edgeLabel[j] === word[i + j]) {
          j++
        }

        if (j === edgeLabelLength) {
          // Edge label fully matches; proceed to the child node
          node = childNode
          i += j
          if (i === wordLength) {
            // The word is a prefix of an existing word
            if (!childNode.e) {
              childNode.e = true
            }
            childNode.addDocument(docId)
            return
          }
          continue
        }

        // Split the edgeLabel at the common prefix
        const commonPrefix = edgeLabel.slice(0, j)
        const newEdgeLabel = edgeLabel.slice(j)
        const newWordLabel = word.slice(i + j)

        // Create an intermediate node for the common prefix
        const inbetweenNode = new RadixNode(commonPrefix[0], commonPrefix, false)
        node.c.set(commonPrefix[0], inbetweenNode)
        inbetweenNode.updateParent(node)

        // Update the existing childNode
        childNode.s = newEdgeLabel
        childNode.k = newEdgeLabel[0]
        inbetweenNode.c.set(newEdgeLabel[0], childNode)
        childNode.updateParent(inbetweenNode)

        if (newWordLabel) {
          // Create a new node for the remaining part of the word
          const newNode = new RadixNode(newWordLabel[0], newWordLabel, true)
          newNode.addDocument(docId)
          inbetweenNode.c.set(newWordLabel[0], newNode)
          newNode.updateParent(inbetweenNode)
        } else {
          // The word ends at the inbetweenNode
          inbetweenNode.e = true
          inbetweenNode.addDocument(docId)
        }
        return
      } else {
        // No matching child; create a new node
        const newNode = new RadixNode(currentCharacter, word.slice(i), true)
        newNode.addDocument(docId)
        node.c.set(currentCharacter, newNode)
        newNode.updateParent(node)
        return
      }
    }

    // If we reach here, the word already exists in the tree
    if (!node.e) {
      node.e = true
    }
    node.addDocument(docId)
  }

  private _findLevenshtein(
    term: string,
    index: number,
    tolerance: number,
    originalTolerance: number,
    output: FindResult
  ) {
    const stack: Array<{ node: RadixNode; index: number; tolerance: number }> = [{ node: this, index, tolerance }]

    while (stack.length > 0) {
      const { node, index, tolerance } = stack.pop()!

      if (node.w.startsWith(term)) {
        node.findAllWords(output, term, false, 0)
        continue
      }

      if (tolerance < 0) {
        continue
      }

      if (node.e) {
        const { w, d: docIDs } = node
        if (w) {
          if (syncBoundedLevenshtein(term, w, originalTolerance).isBounded) {
            output[w] = []
          }
          if (getOwnProperty(output, w) !== undefined && docIDs.size > 0) {
            const docs = new Set(output[w])

            for (const docID of docIDs) {
              docs.add(docID)
            }
            output[w] = Array.from(docs)
          }
        }
      }

      if (index >= term.length) {
        continue
      }

      const currentChar = term[index]

      // 1. If node has child matching term[index], push { node: childNode, index +1, tolerance }
      if (node.c.has(currentChar)) {
        const childNode = node.c.get(currentChar)!
        stack.push({ node: childNode, index: index + 1, tolerance })
      }

      // 2. Push { node, index +1, tolerance -1 } (Delete operation)
      stack.push({ node: node, index: index + 1, tolerance: tolerance - 1 })

      // 3. For each child:
      for (const [character, childNode] of node.c) {
        // a) Insert operation
        stack.push({ node: childNode, index: index, tolerance: tolerance - 1 })

        // b) Substitute operation
        if (character !== currentChar) {
          stack.push({ node: childNode, index: index + 1, tolerance: tolerance - 1 })
        }
      }
    }
  }

  public find(params: FindParams): FindResult {
    const { term, exact, tolerance } = params
    if (tolerance && !exact) {
      const output: FindResult = {}
      this._findLevenshtein(term, 0, tolerance, tolerance, output)
      return output
    } else {
      let node: RadixNode = this
      let i = 0
      const termLength = term.length

      while (i < termLength) {
        const character = term[i]
        const childNode = node.c.get(character)

        if (childNode) {
          const edgeLabel = childNode.s
          const edgeLabelLength = edgeLabel.length
          let j = 0

          // Compare edge label with the term starting from position i
          while (j < edgeLabelLength && i + j < termLength && edgeLabel[j] === term[i + j]) {
            j++
          }

          if (j === edgeLabelLength) {
            // Full match of edge label; proceed to the child node
            node = childNode
            i += j
          } else if (i + j === termLength) {
            // The term ends in the middle of the edge label - FIX: this handles prefix matches like 'p' matching 'phone'
            // Check if the term matches from the beginning of the edge label
            if (j === termLength - i) {
              // Term is a prefix of the edge label
              if (exact) {
                // Exact match required but term doesn't end at a node
                return {}
              } else {
                // Partial match; collect words starting from this node
                const output: FindResult = {}
                // Just call findAllWords on the child node to collect all words in this subtree
                childNode.findAllWords(output, term, exact, tolerance)
                return output
              }
            } else {
              // Mismatch found
              return {}
            }
          } else {
            // Mismatch found
            return {}
          }
        } else {
          // No matching child node
          return {}
        }
      }

      // Term fully matched; collect words starting from this node
      const output: FindResult = {}
      node.findAllWords(output, term, exact, tolerance)
      return output
    }
  }

  public contains(term: string): boolean {
    let node: RadixNode = this
    let i = 0
    const termLength = term.length

    while (i < termLength) {
      const character = term[i]
      const childNode = node.c.get(character)

      if (childNode) {
        const edgeLabel = childNode.s
        const edgeLabelLength = edgeLabel.length
        let j = 0

        while (j < edgeLabelLength && i + j < termLength && edgeLabel[j] === term[i + j]) {
          j++
        }

        if (j < edgeLabelLength) {
          return false
        }

        i += edgeLabelLength
        node = childNode
      } else {
        return false
      }
    }
    return true
  }

  public removeWord(term: string): boolean {
    if (!term) {
      return false
    }

    let node: RadixNode = this
    const termLength = term.length
    const stack: { parent: RadixNode; character: string }[] = []
    for (let i = 0; i < termLength; i++) {
      const character = term[i]
      if (node.c.has(character)) {
        const childNode = node.c.get(character)!
        stack.push({ parent: node, character })
        i += childNode.s.length - 1
        node = childNode
      } else {
        return false
      }
    }

    // Remove documents from the node
    node.d.clear()
    node.e = false

    // Clean up any nodes that no longer lead to a word
    while (stack.length > 0 && node.c.size === 0 && !node.e && node.d.size === 0) {
      const { parent, character } = stack.pop()!
      parent.c.delete(character)
      node = parent
    }

    return true
  }

  public removeDocumentByWord(term: string, docID: InternalDocumentID, exact = true): boolean {
    if (!term) {
      return true
    }

    let node: RadixNode = this
    const termLength = term.length
    for (let i = 0; i < termLength; i++) {
      const character = term[i]
      if (node.c.has(character)) {
        const childNode = node.c.get(character)!
        i += childNode.s.length - 1
        node = childNode

        if (exact && node.w !== term) {
          // Do nothing if the exact condition is not met.
        } else {
          node.removeDocument(docID)
        }
      } else {
        return false
      }
    }
    return true
  }

  private static getCommonPrefix(a: string, b: string): string {
    const len = Math.min(a.length, b.length)
    let i = 0
    while (i < len && a.charCodeAt(i) === b.charCodeAt(i)) {
      i++
    }
    return a.slice(0, i)
  }

  public toJSON(): object {
    return {
      w: this.w,
      s: this.s,
      e: this.e,
      k: this.k,
      d: Array.from(this.d),
      c: Array.from(this.c?.entries())?.map(([key, node]) => [key, node.toJSON()])
    }
  }

  public static fromJSON(json: any): RadixNode {
    const node = new RadixNode(json.k, json.s, json.e)
    node.w = json.w
    node.d = new Set(json.d)
    node.c = new Map(json?.c?.map(([key, nodeJson]: [string, any]) => [key, RadixNode.fromJSON(nodeJson)]) || [])
    return node
  }
}

export class RadixTree extends RadixNode {
  constructor() {
    super('', '', false)
  }

  public static fromJSON(json: any): RadixTree {
    const tree = new RadixTree()
    tree.w = json.w
    tree.s = json.s
    tree.e = json.e
    tree.k = json.k
    tree.d = new Set(json.d)
    tree.c = new Map(json?.c?.map(([key, nodeJson]: [string, any]) => [key, RadixNode.fromJSON(nodeJson)]) || [])
    return tree
  }

  public toJSON(): object {
    return super.toJSON()
  }
}
