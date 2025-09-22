// big-json-handler - Memory-efficient JSON parser for large datasets
// High-performance streaming parser optimized for big data

export enum BjType {
  ERROR = 0,
  END = 1,
  ARRAY = 2,
  OBJECT = 3,
  NUMBER = 4,
  STRING = 5,
  BOOL = 6,
  NULL = 7
}

export interface BjReader {
  data: string;
  cur: number;
  end: number;
  depth: number;
  error: string | null;
}

export interface BjValue {
  type: BjType;
  start: number;
  end: number;
  depth: number;
}

export interface BjIteratorResult {
  done: boolean;
  value?: BjValue;
}

export interface BjObjectIteratorResult {
  done: boolean;
  key?: BjValue;
  value?: BjValue;
}

export interface BjLocation {
  line: number;
  col: number;
}

export function bjReader(data: string): BjReader {
  return {
    data,
    cur: 0,
    end: data.length,
    depth: 0,
    error: null
  };
}

function isNumberCont(c: string): boolean {
  return (c >= '0' && c <= '9') ||
         c === 'e' || c === 'E' || c === '.' || c === '-' || c === '+';
}

function isString(data: string, cur: number, end: number, expect: string): boolean {
  let i = 0;
  while (i < expect.length) {
    if (cur + i >= end || data[cur + i] !== expect[i]) {
      return false;
    }
    i++;
  }
  return true;
}

export function bjRead(r: BjReader): BjValue {
  let res: BjValue;

  while (true) {
    if (r.error) {
      return { type: BjType.ERROR, start: r.cur, end: r.cur, depth: r.depth };
    }
    
    if (r.cur >= r.end) {
      r.error = "unexpected eof";
      return { type: BjType.ERROR, start: r.cur, end: r.cur, depth: r.depth };
    }

    res = { type: BjType.ERROR, start: r.cur, end: r.cur, depth: r.depth };

    const c = r.data[r.cur];

    switch (c) {
      case ' ':
      case '\n':
      case '\r':
      case '\t':
      case ':':
      case ',':
        r.cur++;
        continue;

      case '-':
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        res.type = BjType.NUMBER;
        while (r.cur < r.end && isNumberCont(r.data[r.cur])) {
          r.cur++;
        }
        break;

      case '"':
        res.type = BjType.STRING;
        res.start = ++r.cur;
        while (true) {
          if (r.cur >= r.end) {
            r.error = "unclosed string";
            return { type: BjType.ERROR, start: res.start - 1, end: r.cur, depth: r.depth };
          }
          if (r.data[r.cur] === '"') {
            break;
          }
          if (r.data[r.cur] === '\\') {
            r.cur++;
          }
          if (r.cur < r.end) {
            r.cur++;
          }
        }
        res.end = r.cur++;
        return res;

      case '{':
      case '[':
        res.type = c === '{' ? BjType.OBJECT : BjType.ARRAY;
        res.depth = ++r.depth;
        r.cur++;
        break;

      case '}':
      case ']':
        res.type = BjType.END;
        if (--r.depth < 0) {
          r.error = c === '}' ? "stray '}'" : "stray ']'";
          return { type: BjType.ERROR, start: r.cur, end: r.cur + 1, depth: r.depth + 1 };
        }
        r.cur++;
        break;

      case 'n':
      case 't':
      case 'f':
        res.type = c === 'n' ? BjType.NULL : BjType.BOOL;
        if (isString(r.data, r.cur, r.end, "null")) {
          r.cur += 4;
          break;
        }
        if (isString(r.data, r.cur, r.end, "true")) {
          r.cur += 4;
          break;
        }
        if (isString(r.data, r.cur, r.end, "false")) {
          r.cur += 5;
          break;
        }
        // fallthrough

      default:
        r.error = "unknown token";
        return { type: BjType.ERROR, start: r.cur, end: r.cur, depth: r.depth };
    }

    res.end = r.cur;
    return res;
  }
}

function bjDiscardUntil(r: BjReader, depth: number): void {
  let val: BjValue;
  val = { type: BjType.NULL, start: 0, end: 0, depth: 0 };
  while (r.depth !== depth && val.type !== BjType.ERROR) {
    val = bjRead(r);
  }
}

export function bjIterArray(r: BjReader, arr: BjValue): BjIteratorResult {
  bjDiscardUntil(r, arr.depth);
  const val = bjRead(r);
  
  if (val.type === BjType.ERROR || val.type === BjType.END) {
    return { done: true };
  }
  
  return { done: false, value: val };
}

export function bjIterObject(r: BjReader, obj: BjValue): BjObjectIteratorResult {
  bjDiscardUntil(r, obj.depth);
  const key = bjRead(r);
  
  if (key.type === BjType.ERROR || key.type === BjType.END) {
    return { done: true };
  }
  
  const val = bjRead(r);
  
  if (val.type === BjType.END) {
    r.error = "unexpected object end";
    return { done: true };
  }
  
  if (val.type === BjType.ERROR) {
    return { done: true };
  }
  
  return { done: false, key, value: val };
}

export function bjLocation(r: BjReader): BjLocation {
  let line = 1;
  let col = 1;
  
  for (let i = 0; i < r.cur; i++) {
    if (r.data[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  
  return { line, col };
}

// Utility functions to extract values from BjValue
export function bjGetString(r: BjReader, val: BjValue): string {
  if (val.type !== BjType.STRING) {
    throw new Error("Value is not a string");
  }
  return r.data.substring(val.start, val.end);
}

export function bjGetNumber(r: BjReader, val: BjValue): number {
  if (val.type !== BjType.NUMBER) {
    throw new Error("Value is not a number");
  }
  return parseFloat(r.data.substring(val.start, val.end));
}

export function bjGetBool(r: BjReader, val: BjValue): boolean {
  if (val.type !== BjType.BOOL) {
    throw new Error("Value is not a boolean");
  }
  return r.data.substring(val.start, val.end) === "true";
}

export function bjIsNull(val: BjValue): boolean {
  return val.type === BjType.NULL;
}

// High-level iterator classes for easier usage
export class BjArrayIterator {
  private reader: BjReader;
  private array: BjValue;

  constructor(reader: BjReader, array: BjValue) {
    if (array.type !== BjType.ARRAY) {
      throw new Error("Value is not an array");
    }
    this.reader = reader;
    this.array = array;
  }

  *[Symbol.iterator](): Generator<BjValue, void, unknown> {
    while (true) {
      const result = bjIterArray(this.reader, this.array);
      if (result.done || !result.value) {
        break;
      }
      yield result.value;
    }
  }
}

export class BjObjectIterator {
  private reader: BjReader;
  private object: BjValue;

  constructor(reader: BjReader, object: BjValue) {
    if (object.type !== BjType.OBJECT) {
      throw new Error("Value is not an object");
    }
    this.reader = reader;
    this.object = object;
  }

  *[Symbol.iterator](): Generator<{ key: BjValue; value: BjValue }, void, unknown> {
    while (true) {
      const result = bjIterObject(this.reader, this.object);
      if (result.done || !result.key || !result.value) {
        break;
      }
      yield { key: result.key, value: result.value };
    }
  }
}