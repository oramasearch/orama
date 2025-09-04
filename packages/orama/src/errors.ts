import { SUPPORTED_LANGUAGES } from './components/tokenizer/languages.js'
import { sprintf } from './utils.js'

const allLanguages = SUPPORTED_LANGUAGES.join('\n - ')

const errors = {
  NO_LANGUAGE_WITH_CUSTOM_TOKENIZER: 'Do not pass the language option to create when using a custom tokenizer.',
  LANGUAGE_NOT_SUPPORTED: `Language "%s" is not supported.\nSupported languages are:\n - ${allLanguages}`,
  INVALID_STEMMER_FUNCTION_TYPE: `config.stemmer property must be a function.`,
  MISSING_STEMMER: `As of version 1.0.0 @orama/orama does not ship non English stemmers by default. To solve this, please explicitly import and specify the "%s" stemmer from the package @orama/stemmers. See https://docs.orama.com/open-source/text-analysis/stemming for more information.`,
  CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY: 'Custom stop words array must only contain strings.',
  UNSUPPORTED_COMPONENT: `Unsupported component "%s".`,
  COMPONENT_MUST_BE_FUNCTION: `The component "%s" must be a function.`,
  COMPONENT_MUST_BE_FUNCTION_OR_ARRAY_FUNCTIONS: `The component "%s" must be a function or an array of functions.`,
  INVALID_SCHEMA_TYPE: `Unsupported schema type "%s" at "%s". Expected "string", "boolean" or "number" or array of them.`,
  DOCUMENT_ID_MUST_BE_STRING: `Document id must be of type "string". Got "%s" instead.`,
  DOCUMENT_ALREADY_EXISTS: `A document with id "%s" already exists.`,
  DOCUMENT_DOES_NOT_EXIST: `A document with id "%s" does not exists.`,
  MISSING_DOCUMENT_PROPERTY: `Missing searchable property "%s".`,
  INVALID_DOCUMENT_PROPERTY: `Invalid document property "%s": expected "%s", got "%s"`,
  UNKNOWN_INDEX: `Invalid property name "%s". Expected a wildcard string ("*") or array containing one of the following properties: %s`,
  INVALID_BOOST_VALUE: `Boost value must be a number greater than, or less than 0.`,
  INVALID_FILTER_OPERATION: `You can only use one operation per filter, you requested %d.`,
  SCHEMA_VALIDATION_FAILURE: `Cannot insert document due schema validation failure on "%s" property.`,
  INVALID_SORT_SCHEMA_TYPE: `Unsupported sort schema type "%s" at "%s". Expected "string" or "number".`,
  CANNOT_SORT_BY_ARRAY: `Cannot configure sort for "%s" because it is an array (%s).`,
  UNABLE_TO_SORT_ON_UNKNOWN_FIELD: `Unable to sort on unknown field "%s". Allowed fields: %s`,
  SORT_DISABLED: `Sort is disabled. Please read the documentation at https://docs.oramasearch for more information.`,
  UNKNOWN_GROUP_BY_PROPERTY: `Unknown groupBy property "%s".`,
  INVALID_GROUP_BY_PROPERTY: `Invalid groupBy property "%s". Allowed types: "%s", but given "%s".`,
  UNKNOWN_FILTER_PROPERTY: `Unknown filter property "%s".`,
  UNKNOWN_VECTOR_PROPERTY: `Unknown vector property "%s". Make sure the property exists in the schema and is configured as a vector.`,
  INVALID_VECTOR_SIZE: `Vector size must be a number greater than 0. Got "%s" instead.`,
  INVALID_VECTOR_VALUE: `Vector value must be a number greater than 0. Got "%s" instead.`,
  INVALID_INPUT_VECTOR: `Property "%s" was declared as a %s-dimensional vector, but got a %s-dimensional vector instead.\nInput vectors must be of the size declared in the schema, as calculating similarity between vectors of different sizes can lead to unexpected results.`,
  WRONG_SEARCH_PROPERTY_TYPE: `Property "%s" is not searchable. Only "string" properties are searchable.`,
  FACET_NOT_SUPPORTED: `Facet doens't support the type "%s".`,
  INVALID_DISTANCE_SUFFIX: `Invalid distance suffix "%s". Valid suffixes are: cm, m, km, mi, yd, ft.`,
  INVALID_SEARCH_MODE: `Invalid search mode "%s". Valid modes are: "fulltext", "vector", "hybrid".`,
  MISSING_VECTOR_AND_SECURE_PROXY: `No vector was provided and no secure proxy was configured. Please provide a vector or configure an Orama Secure Proxy to perform hybrid search.`,
  MISSING_TERM: `"term" is a required parameter when performing hybrid search. Please provide a search term.`,
  INVALID_VECTOR_INPUT: `Invalid "vector" property. Expected an object with "value" and "property" properties, but got "%s" instead.`,
  PLUGIN_CRASHED: `A plugin crashed during initialization. Please check the error message for more information:`,
  PLUGIN_SECURE_PROXY_NOT_FOUND: `Could not find '@orama/secure-proxy-plugin' installed in your Orama instance.\nPlease install it before proceeding with creating an answer session.\nRead more at https://docs.orama.com/open-source/plugins/plugin-secure-proxy#plugin-secure-proxy\n`,
  PLUGIN_SECURE_PROXY_MISSING_CHAT_MODEL: `Could not find a chat model defined in the secure proxy plugin configuration.\nPlease provide a chat model before proceeding with creating an answer session.\nRead more at https://docs.orama.com/open-source/plugins/plugin-secure-proxy#plugin-secure-proxy\n`,
  ANSWER_SESSION_LAST_MESSAGE_IS_NOT_ASSISTANT: `The last message in the session is not an assistant message. Cannot regenerate non-assistant messages.`,
  PLUGIN_COMPONENT_CONFLICT: `The component "%s" is already defined. The plugin "%s" is trying to redefine it.`,
}

export type ErrorCode = keyof typeof errors

export interface OramaError extends Error {
  code: string
}

export function createError(code: ErrorCode, ...args: Array<string | number>): OramaError {
  const error = new Error(sprintf(errors[code] ?? `Unsupported Orama Error code: ${code}`, ...args)) as OramaError
  error.code = code
  if ('captureStackTrace' in Error.prototype) {
    Error.captureStackTrace(error)
  }

  return error
}
