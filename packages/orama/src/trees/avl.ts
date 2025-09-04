/* eslint-disable no-extra-semi */
/* eslint-disable @typescript-eslint/no-this-alias */
import { Nullable } from '../types.js'

export class AVLNode<K, V> {
  public k: K
  public v: Set<V>
  public l: Nullable<AVLNode<K, V>> = null
  public r: Nullable<AVLNode<K, V>> = null
  public h: number = 1

  constructor(key: K, value: V[]) {
    this.k = key
    this.v = new Set(value)
  }

  public updateHeight(): void {
    this.h = Math.max(AVLNode.getHeight(this.l), AVLNode.getHeight(this.r)) + 1
  }

  public static getHeight<K, V>(node: Nullable<AVLNode<K, V>>): number {
    return node ? node.h : 0
  }

  public getBalanceFactor(): number {
    return AVLNode.getHeight(this.l) - AVLNode.getHeight(this.r)
  }

  public rotateLeft(): AVLNode<K, V> {
    const newRoot = this.r as AVLNode<K, V>
    this.r = newRoot.l
    newRoot.l = this
    this.updateHeight()
    newRoot.updateHeight()
    return newRoot
  }

  public rotateRight(): AVLNode<K, V> {
    const newRoot = this.l as AVLNode<K, V>
    this.l = newRoot.r
    newRoot.r = this
    this.updateHeight()
    newRoot.updateHeight()
    return newRoot
  }

  public toJSON(): object {
    return {
      k: this.k,
      v: Array.from(this.v),
      l: this.l ? this.l.toJSON() : null,
      r: this.r ? this.r.toJSON() : null,
      h: this.h
    }
  }

  public static fromJSON<K, V>(json: any): AVLNode<K, V> {
    const node = new AVLNode<K, V>(json.k, json.v)
    node.l = json.l ? AVLNode.fromJSON<K, V>(json.l) : null
    node.r = json.r ? AVLNode.fromJSON<K, V>(json.r) : null
    node.h = json.h
    return node
  }
}

export class AVLTree<K, V> {
  public root: Nullable<AVLNode<K, V>> = null
  private insertCount = 0

  constructor(key?: K, value?: V[]) {
    if (key !== undefined && value !== undefined) {
      this.root = new AVLNode(key, value)
    }
  }

  public insert(key: K, value: V, rebalanceThreshold = 1000): void {
    this.root = this.insertNode(this.root, key, value, rebalanceThreshold)
  }

  public insertMultiple(key: K, value: V[], rebalanceThreshold = 1000): void {
    for (const v of value) {
      this.insert(key, v, rebalanceThreshold)
    }
  }

  // Rebalance the tree if the insert count reaches the threshold.
  // This will improve insertion performance since we won't be rebalancing the tree on every insert.
  // When inserting docs using `insertMultiple`, the threshold will be set to the number of docs being inserted.
  // We can force rebalancing the tree by setting the threshold to 1 (default).
  public rebalance() {
    if (this.root) {
      this.root = this.rebalanceNode(this.root!)
    }
  }

  public toJSON(): object {
    return {
      root: this.root ? this.root.toJSON() : null,
      insertCount: this.insertCount
    }
  }

  public static fromJSON<K, V>(json: any): AVLTree<K, V> {
    const tree = new AVLTree<K, V>()
    tree.root = json.root ? AVLNode.fromJSON<K, V>(json.root) : null
    tree.insertCount = json.insertCount || 0
    return tree
  }

  private insertNode(node: Nullable<AVLNode<K, V>>, key: K, value: V, rebalanceThreshold: number): AVLNode<K, V> {
    if (node === null) {
      return new AVLNode(key, [value])
    }

    const path: Array<{ parent: Nullable<AVLNode<K, V>>; node: AVLNode<K, V> }> = []
    let current = node
    let parent: Nullable<AVLNode<K, V>> = null

    while (current !== null) {
      path.push({ parent, node: current })

      if (key < current.k) {
        if (current.l === null) {
          current.l = new AVLNode(key, [value])
          path.push({ parent: current, node: current.l })
          break
        } else {
          parent = current
          current = current.l
        }
      } else if (key > current.k) {
        if (current.r === null) {
          current.r = new AVLNode(key, [value])
          path.push({ parent: current, node: current.r })
          break
        } else {
          parent = current
          current = current.r
        }
      } else {
        // Key already exists
        current.v.add(value)
        /*
        if (Array.isArray(current.v)) {
          if (Array.isArray(value)) {
            ;(current.v as any[]).push(...(value as V[]))
          } else {
            ;(current.v as any[]).push(value)
          }
        } else {
          current.v = new Set([value])
        }
        */
        return node
      }
    }

    // Update heights and rebalance if necessary
    let needRebalance = false
    if (this.insertCount++ % rebalanceThreshold === 0) {
      needRebalance = true
    }

    for (let i = path.length - 1; i >= 0; i--) {
      const { parent, node: currentNode } = path[i]
      currentNode.updateHeight()

      if (needRebalance) {
        const rebalancedNode = this.rebalanceNode(currentNode)
        if (parent) {
          if (parent.l === currentNode) {
            parent.l = rebalancedNode
          } else if (parent.r === currentNode) {
            parent.r = rebalancedNode
          }
        } else {
          // This is the root node
          node = rebalancedNode
        }
      }
    }

    return node
  }

  private rebalanceNode(node: AVLNode<K, V>): AVLNode<K, V> {
    const balanceFactor = node.getBalanceFactor()

    if (balanceFactor > 1) {
      // Left heavy
      if (node.l && node.l.getBalanceFactor() >= 0) {
        // Left Left Case
        return node.rotateRight()
      } else if (node.l) {
        // Left Right Case
        node.l = node.l.rotateLeft()
        return node.rotateRight()
      }
    }

    if (balanceFactor < -1) {
      // Right heavy
      if (node.r && node.r.getBalanceFactor() <= 0) {
        // Right Right Case
        return node.rotateLeft()
      } else if (node.r) {
        // Right Left Case
        node.r = node.r.rotateRight()
        return node.rotateLeft()
      }
    }

    return node
  }

  public find(key: K): Nullable<Set<V>> {
    const node = this.findNodeByKey(key)
    return node ? node.v : null
  }

  public contains(key: K): boolean {
    return this.find(key) !== null
  }

  public getSize(): number {
    let count = 0
    const stack: Array<Nullable<AVLNode<K, V>>> = []
    let current = this.root

    while (current || stack.length > 0) {
      while (current) {
        stack.push(current)
        current = current.l
      }
      current = stack.pop()!
      count++
      current = current.r
    }

    return count
  }

  public isBalanced(): boolean {
    if (!this.root) return true

    const stack: Array<AVLNode<K, V>> = [this.root]

    while (stack.length > 0) {
      const node = stack.pop()!
      const balanceFactor = node.getBalanceFactor()
      if (Math.abs(balanceFactor) > 1) {
        return false
      }

      if (node.l) stack.push(node.l)
      if (node.r) stack.push(node.r)
    }

    return true
  }

  public remove(key: K): void {
    this.root = this.removeNode(this.root, key)
  }

  public removeDocument(key: K, id: V) {
    const node = this.findNodeByKey(key)

    if (!node) {
      return
    }

    if (node.v.size === 1) {
      this.root = this.removeNode(this.root, key)
    } else {
      node.v = new Set([...node.v.values()].filter((v) => v !== id))
    }
  }

  private findNodeByKey(key: K): Nullable<AVLNode<K, V>> {
    let node = this.root
    while (node) {
      if (key < node.k) {
        node = node.l
      } else if (key > node.k) {
        node = node.r
      } else {
        return node
      }
    }
    return null
  }

  private removeNode(node: Nullable<AVLNode<K, V>>, key: K): Nullable<AVLNode<K, V>> {
    if (node === null) return null

    const path: Array<AVLNode<K, V>> = []
    let current = node

    while (current !== null && current.k !== key) {
      path.push(current)
      if (key < current.k) {
        current = current.l!
      } else {
        current = current.r!
      }
    }

    if (current === null) {
      // Key not found
      return node
    }

    // Node with only one child or no child
    if (current.l === null || current.r === null) {
      const child = current.l ? current.l : current.r

      if (path.length === 0) {
        // Node to be deleted is root
        node = child
      } else {
        const parent = path[path.length - 1]
        if (parent.l === current) {
          parent.l = child
        } else {
          parent.r = child
        }
      }
    } else {
      // Node with two children: Get the inorder successor
      let successorParent = current
      let successor = current.r

      while (successor.l !== null) {
        successorParent = successor
        successor = successor.l
      }

      // Copy the successor's content to current node
      current.k = successor.k
      current.v = successor.v

      // Delete the successor
      if (successorParent.l === successor) {
        successorParent.l = successor.r
      } else {
        successorParent.r = successor.r
      }

      current = successorParent
    }

    // Update heights and rebalance
    path.push(current)
    for (let i = path.length - 1; i >= 0; i--) {
      const currentNode = path[i]
      currentNode.updateHeight()
      const rebalancedNode = this.rebalanceNode(currentNode)
      if (i > 0) {
        const parent = path[i - 1]
        if (parent.l === currentNode) {
          parent.l = rebalancedNode
        } else if (parent.r === currentNode) {
          parent.r = rebalancedNode
        }
      } else {
        // Root node
        node = rebalancedNode
      }
    }

    return node
  }

  public rangeSearch(min: K, max: K): Set<V> {
    const result: Set<V> = new Set()
    const stack: Array<AVLNode<K, V>> = []
    let current = this.root

    while (current || stack.length > 0) {
      while (current) {
        stack.push(current)
        current = current.l
      }
      current = stack.pop()!
      if (current.k >= min && current.k <= max) {
        for (const value of current.v) {
          result.add(value)
        }
      }
      if (current.k > max) {
        break
      }
      current = current.r
    }

    return result
  }

  public greaterThan(key: K, inclusive = false): Set<V> {
    const result: Set<V> = new Set()
    const stack: Array<AVLNode<K, V>> = []
    let current = this.root

    while (current || stack.length > 0) {
      while (current) {
        stack.push(current)
        current = current.r // Traverse right subtree first
      }
      current = stack.pop()!
      if ((inclusive && current.k >= key) || (!inclusive && current.k > key)) {
        for (const value of current.v) {
          result.add(value)
        }
      } else if (current.k <= key) {
        break // Since we're traversing in descending order, we can break early
      }
      current = current.l
    }

    return result
  }

  public lessThan(key: K, inclusive = false): Set<V> {
    const result: Set<V> = new Set()
    const stack: Array<AVLNode<K, V>> = []
    let current = this.root

    while (current || stack.length > 0) {
      while (current) {
        stack.push(current)
        current = current.l
      }
      current = stack.pop()!
      if ((inclusive && current.k <= key) || (!inclusive && current.k < key)) {
        for (const value of current.v) {
          result.add(value)
        }
      } else if (current.k > key) {
        break // Since we're traversing in ascending order, we can break early
      }
      current = current.r
    }

    return result
  }
}
