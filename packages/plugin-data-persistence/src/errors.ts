function capitalize(word: string): string {
  return `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`
}

export function UNSUPPORTED_FORMAT(format: string): string {
  return `Unsupported serialization format: ${format}`
}

export function FILESYSTEM_NOT_SUPPORTED_ON_RUNTIME(runtime: string): string {
  return `Filesystem access is not supported on ${capitalize(runtime)}`
}

export function METHOD_MOVED(method: string): string {
  return `Function ${method} has been moved to the "/server" module. \n\nImport it via "import { ${method} } from 'orama/plugin-data-persistence/server'". \n\nRead more at https://docs.orama.com/docs/orama-js/plugins/plugin-data-persistence.`
}
