const BASE_TYPE_ALIASES: Record<string, string> = {
  int: 'integer',
  integer: 'integer',
  long: 'integer',
  number: 'integer',
  float: 'float',
  double: 'float',
  decimal: 'float',
  string: 'string',
  text: 'string',
  bool: 'boolean',
  boolean: 'boolean',
  char: 'character',
  character: 'character'
};

const LEGACY_TYPE_NORMALIZERS: Record<string, { base: string; dimensions: number }> = {
  array_integer: { base: 'integer', dimensions: 1 },
  matrix_integer: { base: 'integer', dimensions: 2 },
  'vector<int>': { base: 'integer', dimensions: 1 },
  'vector<vector<int>>': { base: 'integer', dimensions: 2 },
  'int[]': { base: 'integer', dimensions: 1 },
  'int[][]': { base: 'integer', dimensions: 2 },
  'list<int>': { base: 'integer', dimensions: 1 },
  'list[list<int]]': { base: 'integer', dimensions: 2 },
  'list<int]': { base: 'integer', dimensions: 1 },
  array_string: { base: 'string', dimensions: 1 },
  matrix_string: { base: 'string', dimensions: 2 },
  'vector<string>': { base: 'string', dimensions: 1 },
  'vector<vector<string>>': { base: 'string', dimensions: 2 },
  'string[]': { base: 'string', dimensions: 1 },
  'string[][]': { base: 'string', dimensions: 2 },
  'list<string>': { base: 'string', dimensions: 1 },
  'list[list<string]]': { base: 'string', dimensions: 2 },
  array_float: { base: 'float', dimensions: 1 },
  matrix_float: { base: 'float', dimensions: 2 },
  'float[]': { base: 'float', dimensions: 1 },
  'float[][]': { base: 'float', dimensions: 2 },
  'double[]': { base: 'float', dimensions: 1 },
  'double[][]': { base: 'float', dimensions: 2 },
  array_boolean: { base: 'boolean', dimensions: 1 },
  matrix_boolean: { base: 'boolean', dimensions: 2 },
  'bool[]': { base: 'boolean', dimensions: 1 },
  'bool[][]': { base: 'boolean', dimensions: 2 },
  'boolean[]': { base: 'boolean', dimensions: 1 },
  'boolean[][]': { base: 'boolean', dimensions: 2 },
  array_char: { base: 'character', dimensions: 1 },
  matrix_char: { base: 'character', dimensions: 2 },
  'char[]': { base: 'character', dimensions: 1 },
  'char[][]': { base: 'character', dimensions: 2 }
};

const DEFAULT_BASE = 'integer';

/**
 * Normalize legacy or mixed type strings into bracket notation (e.g., "integer[][]")
 */
export function normalizeTypeName(type?: string, fallbackDimensions = 0): string {
  if (!type) {
    return DEFAULT_BASE + '[]'.repeat(fallbackDimensions);
  }

  const trimmed = type.trim();
  if (trimmed.length === 0) {
    return DEFAULT_BASE + '[]'.repeat(fallbackDimensions);
  }

  const lower = trimmed.toLowerCase();

  if (LEGACY_TYPE_NORMALIZERS[lower]) {
    const { base, dimensions } = LEGACY_TYPE_NORMALIZERS[lower];
    const totalDims = Math.max(dimensions, fallbackDimensions);
    return base + '[]'.repeat(totalDims);
  }

  const vectorDepth = (lower.match(/vector</g) || []).length;
  if (vectorDepth > 0) {
    const inner = lower.replace(/vector<|>/g, '');
    const innerNormalized = normalizeTypeName(inner);
    const base = innerNormalized.replace(/\[\]/g, '');
    const innerDims = (innerNormalized.match(/\[\]/g) || []).length;
    const totalDims = Math.max(vectorDepth + innerDims, fallbackDimensions);
    return base + '[]'.repeat(totalDims);
  }

  const listDepth = (lower.match(/list</g) || []).length;
  if (listDepth > 0) {
    const inner = lower.replace(/list<|>/g, '');
    const innerNormalized = normalizeTypeName(inner);
    const base = innerNormalized.replace(/\[\]/g, '');
    const innerDims = (innerNormalized.match(/\[\]/g) || []).length;
    const totalDims = Math.max(listDepth + innerDims, fallbackDimensions);
    return base + '[]'.repeat(totalDims);
  }

  const bracketCount = (trimmed.match(/\[\]/g) || []).length;
  const baseKey = trimmed.replace(/\[\]/g, '').toLowerCase();

  if (LEGACY_TYPE_NORMALIZERS[baseKey]) {
    const { base, dimensions } = LEGACY_TYPE_NORMALIZERS[baseKey];
    const totalDims = Math.max(dimensions, bracketCount, fallbackDimensions);
    return base + '[]'.repeat(totalDims);
  }

  const baseAlias = BASE_TYPE_ALIASES[baseKey] || BASE_TYPE_ALIASES[lower] || DEFAULT_BASE;
  const totalDims = Math.max(bracketCount, fallbackDimensions);
  return baseAlias + '[]'.repeat(totalDims);
}

/**
 * Infer brackets-aware type information from a runtime value
 */
export function inferTypeFromValue(value: any): string {
  if (value === null || value === undefined) {
    return 'string';
  }

  if (typeof value === 'number') {
    return normalizeTypeName(Number.isInteger(value) ? 'integer' : 'float');
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'string') {
    return normalizeTypeName(value.length === 1 ? 'character' : 'string');
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return normalizeTypeName('integer[]');
    }

    const elementType = inferTypeFromValue(value[0]);
    const normalizedElement = normalizeTypeName(elementType);
    const base = normalizedElement.replace(/\[\]/g, '');
    const elementDims = (normalizedElement.match(/\[\]/g) || []).length;
    return normalizeTypeName(base + '[]'.repeat(elementDims + 1));
  }

  return 'string';
}

