import type {
	AnyOrama,
	SearchableType,
	IIndex,
	SearchableValue,
	Tokenizer,
	OnlyStrings,
	FlattenSchemaProperty,
	TokenScore,
	WhereCondition,
	OramaPluginSync,
	AnySchema,
	ObjectComponents,
	BM25Params,
} from "@orama/orama";
import {
	index as Index,
	internalDocumentIDStore,
} from "@orama/orama/components";
import {
	insertString,
	QPSIndex as QPSIndexStorage,
	recursiveCreate,
	removeString,
	searchString,
} from "./algorithm.js";
import { radix } from "@orama/orama/trees";
import { setIntersection } from "@orama/orama/internals";

type InternalDocumentID = internalDocumentIDStore.InternalDocumentID;
type InternalDocumentIDStore = internalDocumentIDStore.InternalDocumentIDStore;
type DocumentID = internalDocumentIDStore.DocumentID;

const unusedRadix = new radix.RadixNode("", "", false);
const unusedStats = {
	tokenQuantums: {},
	tokensLength: new Map(),
};

function search<T extends AnyOrama>(
	index: QPSIndexStorage,
	term: string,
	tokenizer: Tokenizer,
	language: string | undefined,
	propertiesToSearch: string[],
	exact: boolean,
	tolerance: number,
	boost: Partial<Record<OnlyStrings<FlattenSchemaProperty<T>[]>, number>>,
	relevance: Required<BM25Params>,
	docsCount: number,
	whereFiltersIDs: Set<InternalDocumentID> | undefined,
): TokenScore[] {
	const all: Map<InternalDocumentID, [number, number]> = new Map();

	const args = {
		tokens: tokenizer.tokenize(term, language),
		radixNode: unusedRadix,
		exact,
		tolerance,
		stats: unusedStats,
		boostPerProp: 0,
		all,
		resultMap: all,
		whereFiltersIDs,
	};

	const propertiesToSearchLength = propertiesToSearch.length;
	for (let i = 0; i < propertiesToSearchLength; i++) {
		const prop = propertiesToSearch[i];
		const stats = index.stats[prop];
		const boostPerProp = boost[prop] ?? 1;
		args.radixNode = index.indexes[prop].node as radix.RadixNode;
		args.stats = stats;
		args.boostPerProp = boostPerProp;
		searchString(args);
	}

	const g: [number, [number, number]][] = Array.from(all);
	const gLength = g.length;
	const res: TokenScore[] = [];
	for (let i = 0; i < gLength; i++) {
		const element = g[i];
		const id = element[0];
		const score = element[1][0];

		res.push([id, score]);
	}

	return res;
}

export function pluginQPS(): OramaPluginSync<unknown> {
	return {
		name: "qps",
		getComponents(schema: AnySchema) {
			return qpsComponents(schema);
		},
	};
}

function qpsComponents(
	schema: AnySchema,
): Partial<ObjectComponents<any, any, any>> {
	return {
		index: {
			create: function create() {
				const indexDatastore: QPSIndexStorage = {
					indexes: {},
					vectorIndexes: {},
					searchableProperties: [],
					searchablePropertiesWithTypes: {},
					stats: {},
				};

				recursiveCreate(indexDatastore, schema, "");

				return indexDatastore;
			},
			insert: function insert(
				implementation: IIndex<QPSIndexStorage>,
				indexDatastorage: QPSIndexStorage,
				prop: string,
				id: DocumentID,
				internalId: InternalDocumentID,
				value: SearchableValue,
				schemaType: SearchableType,
				language: string | undefined,
				tokenizer: Tokenizer,
				docsCount: number,
			) {
				if (!(schemaType === "string" || schemaType === "string[]")) {
					return Index.insert(
						implementation as unknown as IIndex<Index.Index>,
						indexDatastorage as unknown as Index.Index,
						prop,
						id,
						internalId,
						value,
						schemaType,
						language,
						tokenizer,
						docsCount,
					);
				}

				if (!indexDatastorage.stats[prop]) {
					indexDatastorage.stats[prop] = {
						tokenQuantums: {},
						tokensLength: new Map(),
					};
				}

				const stats = indexDatastorage.stats[prop];
				const radixTree = indexDatastorage.indexes[prop]
					.node as radix.RadixNode;

				stats.tokenQuantums[internalId] = {};

				if (Array.isArray(value)) {
					for (const item of value) {
						insertString(
							item as string,
							radixTree,
							stats,
							prop,
							internalId,
							language,
							tokenizer,
						);
					}
				} else {
					insertString(
						value as string,
						radixTree,
						stats,
						prop,
						internalId,
						language,
						tokenizer,
					);
				}
			},
			remove: function remove(
				implementation: IIndex<QPSIndexStorage>,
				indexDatastorage: QPSIndexStorage,
				prop: string,
				id: DocumentID,
				internalId: InternalDocumentID,
				value: SearchableValue,
				schemaType: SearchableType,
				language: string | undefined,
				tokenizer: Tokenizer,
				docsCount: number,
			) {
				if (!(schemaType === "string" || schemaType === "string[]")) {
					return Index.remove(
						implementation as unknown as IIndex<Index.Index>,
						indexDatastorage as unknown as Index.Index,
						prop,
						id,
						internalId,
						value,
						schemaType,
						language,
						tokenizer,
						docsCount,
					);
				}

				const stats = indexDatastorage.stats[prop];
				const radixTree = indexDatastorage.indexes[prop]
					.node as radix.RadixNode;

				if (Array.isArray(value)) {
					for (const item of value) {
						removeString(
							item as string,
							radixTree,
							prop,
							internalId,
							tokenizer,
							language,
							stats,
						);
					}
				} else {
					removeString(
						value as string,
						radixTree,
						prop,
						internalId,
						tokenizer,
						language,
						stats,
					);
				}
			},
			insertDocumentScoreParameters: () => {
				throw new Error();
			},
			insertTokenScoreParameters: () => {
				throw new Error();
			},
			removeDocumentScoreParameters: () => {
				throw new Error();
			},
			removeTokenScoreParameters: () => {
				throw new Error();
			},
			calculateResultScores: () => {
				throw new Error();
			},
			search,
			searchByWhereClause: function searchByWhereClause<T extends AnyOrama>(
				index: QPSIndexStorage,
				tokenizer: Tokenizer,
				filters: Partial<WhereCondition<T["schema"]>>,
				language: string | undefined,
			) {
				const stringFiltersList = Object.entries(filters).filter(
					([propName]) => index.indexes[propName].type === "Radix",
				);

				// If there are no string filters, we can use the regular search
				if (stringFiltersList.length === 0) {
					return Index.searchByWhereClause(
						index as unknown as Index.Index,
						tokenizer,
						filters,
						language,
					);
				}

				let idsFromStringFilters: Set<InternalDocumentID> | undefined;
				for (const [propName, filter] of stringFiltersList) {
					let tokens: string[] = [];

					if (Array.isArray(filter)) {
						for (const item of filter) {
							const token = tokenizer.tokenize(item as string, language)?.[0];
							tokens.push(token);
						}
					} else {
						tokens = tokenizer.tokenize(filter as string, language);
					}

					const radixTree = index.indexes[propName].node as radix.RadixNode;
					const propIds = new Set<InternalDocumentID>();
					for (const token of tokens) {
						const ret = radixTree.find({
							term: token,
							exact: true,
						});

						const ids = ret[token];

						if (ids) {
							for (const id of ids) {
								propIds.add(id);
							}
						}
					}

					if (idsFromStringFilters) {
						idsFromStringFilters = setIntersection(
							idsFromStringFilters,
							propIds,
						);
					} else {
						idsFromStringFilters = propIds;
					}
				}

				// Split the filters into string and non-string filters
				const nonStringFiltersList = Object.entries(filters).filter(
					([propName]) => index.indexes[propName].type !== "Radix",
				);
				if (nonStringFiltersList.length === 0) {
					return idsFromStringFilters;
				}

				const idsFromNonStringFilters = Index.searchByWhereClause(
					index as unknown as Index.Index,
					tokenizer,
					filters,
					language,
				);

				return setIntersection(idsFromStringFilters!, idsFromNonStringFilters);
			},
			getSearchableProperties: function getSearchableProperties(
				index: QPSIndexStorage,
			): string[] {
				return index.searchableProperties;
			},
			getSearchablePropertiesWithTypes: function (index: QPSIndexStorage) {
				return index.searchablePropertiesWithTypes;
			},
			load: function load<R = unknown>(
				sharedInternalDocumentStore: InternalDocumentIDStore,
				raw: R,
			): QPSIndexStorage {
				const dump1 = Index.load(sharedInternalDocumentStore, raw[0]);

				const dump2 = raw[1] as {
					radixTrees: [string, boolean, string, unknown][];
					stats: [
						string,
						{
							tokenQuantums: [InternalDocumentID, Record<string, number>][];
							tokensLength: [InternalDocumentID, number][];
						},
					][];
				};

				const indexes = {
					...dump1.indexes,
					...Object.fromEntries(
						dump2.radixTrees.map(([prop, isArray, type, node]) => [
							prop,
							{
								node: radix.RadixNode.fromJSON(node),
								isArray,
								type,
							} as Index.Tree,
						]),
					),
				};

				return {
					...dump1,
					indexes,
					stats: Object.fromEntries(
						dump2.stats.map(([prop, { tokenQuantums, tokensLength }]) => [
							prop,
							{
								tokenQuantums,
								tokensLength: new Map(tokensLength),
							},
						]),
					),
				} as unknown as QPSIndexStorage;
			},
			save: function save<R = unknown>(index: QPSIndexStorage): R {
				const baseIndex = index as unknown as Index.Index;
				const nonStringIndexes = Object.entries(baseIndex.indexes).filter(
					([, { type }]) => type !== "Radix",
				);
				const dump1 = Index.save({
					...baseIndex,
					indexes: Object.fromEntries(nonStringIndexes),
				});

				const stringIndexes = Object.entries(baseIndex.indexes).filter(
					([, { type }]) => type === "Radix",
				);
				const dump2 = {
					radixTrees: stringIndexes.map(([prop, { node, isArray, type }]) => [
						prop,
						isArray,
						type,
						node.toJSON(),
					]),
					stats: Object.entries(index.stats).map(
						([prop, { tokenQuantums, tokensLength }]) => [
							prop,
							{
								tokenQuantums,
								tokensLength: Array.from(tokensLength.entries()),
							},
						],
					),
				};

				return [dump1, dump2] as unknown as R;
			},
		},
	};
}
