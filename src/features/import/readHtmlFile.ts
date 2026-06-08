/** Accept attribute for the file picker. */
export const HTML_ACCEPT = '.html,.htm,text/html'

export function isHtmlFile(file: File): boolean {
  return /\.html?$/i.test(file.name) || file.type === 'text/html'
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
