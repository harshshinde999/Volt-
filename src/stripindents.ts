// src/stripindents.ts

/**
 * Removes leading indentation from each line in a string.
 * @param str The string to process.
 * @returns The string with indentation removed.
 */
export function stripIndents(str: string): string {
  const lines = str.split('\n');
  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];

  // Remove leading/trailing blank lines
  if (firstLine.trim() === '') lines.shift();
  if (lastLine.trim() === '') lines.pop();

  const minIndent = lines.reduce((min, line) => {
    const match = line.match(/^\s*/);
    const indent = match ? match[0].length : 0;
    if (line.trim().length > 0 && indent < min) {
      return indent;
    }
    return min;
  }, Infinity);

  if (minIndent === Infinity) {
    return lines.join('\n');
  }

  return lines.map(line => line.slice(minIndent)).join('\n');
}
