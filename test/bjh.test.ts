import { describe, it, expect } from 'vitest';
import {
  bjReader,
  bjRead,
  bjLocation,
  bjGetString,
  bjGetNumber,
  bjGetBool,
  bjIsNull,
  BjArrayIterator,
  BjObjectIterator,
  BjType,
} from '../src/bjh';

describe('big-json-handler Parser', () => {
  describe('Basic Parsing', () => {
    it('should parse simple string', () => {
      const reader = bjReader('"hello"');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.STRING);
      expect(bjGetString(reader, val)).toBe("hello");
    });

    it('should parse simple number', () => {
      const reader = bjReader('42');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.NUMBER);
      expect(bjGetNumber(reader, val)).toBe(42);
    });

    it('should parse negative number', () => {
      const reader = bjReader('-123.45');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.NUMBER);
      expect(bjGetNumber(reader, val)).toBeCloseTo(-123.45);
    });

    it('should parse scientific notation', () => {
      const reader = bjReader('1.23e-4');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.NUMBER);
      expect(bjGetNumber(reader, val)).toBeCloseTo(1.23e-4);
    });

    it('should parse true boolean', () => {
      const reader = bjReader('true');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.BOOL);
      expect(bjGetBool(reader, val)).toBe(true);
    });

    it('should parse false boolean', () => {
      const reader = bjReader('false');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.BOOL);
      expect(bjGetBool(reader, val)).toBe(false);
    });

    it('should parse null', () => {
      const reader = bjReader('null');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.NULL);
      expect(bjIsNull(val)).toBe(true);
    });
  });

  describe('Array Parsing', () => {
    it('should parse empty array', () => {
      const reader = bjReader('[]');
      const arr = bjRead(reader);
      expect(arr.type).toBe(BjType.ARRAY);
      
      const end = bjRead(reader);
      expect(end.type).toBe(BjType.END);
    });

    it('should parse simple array', () => {
      const reader = bjReader('[1, 2, 3]');
      const arr = bjRead(reader);
      expect(arr.type).toBe(BjType.ARRAY);
      
      const val1 = bjRead(reader);
      expect(val1.type).toBe(BjType.NUMBER);
      expect(bjGetNumber(reader, val1)).toBe(1);
      
      const val2 = bjRead(reader);
      expect(val2.type).toBe(BjType.NUMBER);
      expect(bjGetNumber(reader, val2)).toBe(2);
      
      const val3 = bjRead(reader);
      expect(val3.type).toBe(BjType.NUMBER);
      expect(bjGetNumber(reader, val3)).toBe(3);
      
      const end = bjRead(reader);
      expect(end.type).toBe(BjType.END);
    });

    it('should parse nested arrays', () => {
      const reader = bjReader('[[1, 2], [3, 4]]');
      const arr = bjRead(reader);
      expect(arr.type).toBe(BjType.ARRAY);
      
      const subArr1 = bjRead(reader);
      expect(subArr1.type).toBe(BjType.ARRAY);
      
      const val1 = bjRead(reader);
      expect(bjGetNumber(reader, val1)).toBe(1);
      const val2 = bjRead(reader);
      expect(bjGetNumber(reader, val2)).toBe(2);
      
      const end1 = bjRead(reader);
      expect(end1.type).toBe(BjType.END);
      
      const subArr2 = bjRead(reader);
      expect(subArr2.type).toBe(BjType.ARRAY);
      
      const val3 = bjRead(reader);
      expect(bjGetNumber(reader, val3)).toBe(3);
      const val4 = bjRead(reader);
      expect(bjGetNumber(reader, val4)).toBe(4);
      
      const end2 = bjRead(reader);
      expect(end2.type).toBe(BjType.END);
      
      const end3 = bjRead(reader);
      expect(end3.type).toBe(BjType.END);
    });
  });

  describe('Object Parsing', () => {
    it('should parse empty object', () => {
      const reader = bjReader('{}');
      const obj = bjRead(reader);
      expect(obj.type).toBe(BjType.OBJECT);
      
      const end = bjRead(reader);
      expect(end.type).toBe(BjType.END);
    });

    it('should parse simple object', () => {
      const reader = bjReader('{"name": "John", "age": 30}');
      const obj = bjRead(reader);
      expect(obj.type).toBe(BjType.OBJECT);
      
      const key1 = bjRead(reader);
      expect(bjGetString(reader, key1)).toBe("name");
      const val1 = bjRead(reader);
      expect(bjGetString(reader, val1)).toBe("John");
      
      const key2 = bjRead(reader);
      expect(bjGetString(reader, key2)).toBe("age");
      const val2 = bjRead(reader);
      expect(bjGetNumber(reader, val2)).toBe(30);
      
      const end = bjRead(reader);
      expect(end.type).toBe(BjType.END);
    });

    it('should parse nested objects', () => {
      const reader = bjReader('{"user": {"name": "John", "details": {"age": 30}}}');
      const obj = bjRead(reader);
      expect(obj.type).toBe(BjType.OBJECT);
      
      const key1 = bjRead(reader);
      expect(bjGetString(reader, key1)).toBe("user");
      
      const nestedObj = bjRead(reader);
      expect(nestedObj.type).toBe(BjType.OBJECT);
      
      const key2 = bjRead(reader);
      expect(bjGetString(reader, key2)).toBe("name");
      const val2 = bjRead(reader);
      expect(bjGetString(reader, val2)).toBe("John");
      
      const key3 = bjRead(reader);
      expect(bjGetString(reader, key3)).toBe("details");
      
      const deepObj = bjRead(reader);
      expect(deepObj.type).toBe(BjType.OBJECT);
      
      const key4 = bjRead(reader);
      expect(bjGetString(reader, key4)).toBe("age");
      const val4 = bjRead(reader);
      expect(bjGetNumber(reader, val4)).toBe(30);
    });
  });

  describe('Array Iterator', () => {
    it('should iterate basic array', () => {
      const reader = bjReader('[1, "hello", true, null]');
      const arr = bjRead(reader);
      expect(arr.type).toBe(BjType.ARRAY);
      
      const iterator = new BjArrayIterator(reader, arr);
      const values = Array.from(iterator);
      
      expect(values).toHaveLength(4);
      expect(bjGetNumber(reader, values[0])).toBe(1);
      expect(bjGetString(reader, values[1])).toBe("hello");
      expect(bjGetBool(reader, values[2])).toBe(true);
      expect(bjIsNull(values[3])).toBe(true);
    });

    it('should iterate empty array', () => {
      const reader = bjReader('[]');
      const arr = bjRead(reader);
      expect(arr.type).toBe(BjType.ARRAY);
      
      const iterator = new BjArrayIterator(reader, arr);
      const values = Array.from(iterator);
      
      expect(values).toHaveLength(0);
    });

    it('should iterate nested arrays', () => {
      const reader = bjReader('[[1, 2], [3, 4]]');
      const arr = bjRead(reader);
      expect(arr.type).toBe(BjType.ARRAY);
      
      const iterator = new BjArrayIterator(reader, arr);
      const values = Array.from(iterator);
      
      expect(values).toHaveLength(2);
      expect(values[0].type).toBe(BjType.ARRAY);
      expect(values[1].type).toBe(BjType.ARRAY);
    });
  });

  describe('Object Iterator', () => {
    it('should iterate basic object', () => {
      const reader = bjReader('{"name": "John", "age": 30, "active": true}');
      const obj = bjRead(reader);
      expect(obj.type).toBe(BjType.OBJECT);
      
      const iterator = new BjObjectIterator(reader, obj);
      const pairs = Array.from(iterator);
      
      expect(pairs).toHaveLength(3);
      
      expect(bjGetString(reader, pairs[0].key)).toBe("name");
      expect(bjGetString(reader, pairs[0].value)).toBe("John");
      
      expect(bjGetString(reader, pairs[1].key)).toBe("age");
      expect(bjGetNumber(reader, pairs[1].value)).toBe(30);
      
      expect(bjGetString(reader, pairs[2].key)).toBe("active");
      expect(bjGetBool(reader, pairs[2].value)).toBe(true);
    });

    it('should iterate empty object', () => {
      const reader = bjReader('{}');
      const obj = bjRead(reader);
      expect(obj.type).toBe(BjType.OBJECT);
      
      const iterator = new BjObjectIterator(reader, obj);
      const pairs = Array.from(iterator);
      
      expect(pairs).toHaveLength(0);
    });

    it('should iterate nested objects', () => {
      const reader = bjReader('{"outer": {"inner": 42}}');
      const obj = bjRead(reader);
      expect(obj.type).toBe(BjType.OBJECT);
      
      const iterator = new BjObjectIterator(reader, obj);
      const pairs = Array.from(iterator);
      
      expect(pairs).toHaveLength(1);
      expect(bjGetString(reader, pairs[0].key)).toBe("outer");
      expect(pairs[0].value.type).toBe(BjType.OBJECT);
    });
  });

  describe('Location Tracking', () => {
    it('should track location on single line', () => {
      const reader = bjReader('{"test": 123}');
      bjRead(reader); // object
      bjRead(reader); // key
      const loc = bjLocation(reader);
      
      expect(loc.line).toBe(1);
      expect(loc.col).toBe(8); // Position after reading the key, before the colon
    });

    it('should track location on multiple lines', () => {
      const reader = bjReader('{\n  "test":\n  123\n}');
      bjRead(reader); // object
      bjRead(reader); // key
      bjRead(reader); // value
      const loc = bjLocation(reader);
      
      expect(loc.line).toBe(3);
      expect(loc.col).toBe(6);
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed string', () => {
      const reader = bjReader('"unclosed');
      bjRead(reader);
      expect(reader.error).toBeTruthy();
    });

    it('should handle unknown token', () => {
      const reader = bjReader('xyz');
      bjRead(reader);
      expect(reader.error).toBeTruthy();
    });

    it('should handle stray closing brace', () => {
      const reader = bjReader('}');
      bjRead(reader);
      expect(reader.error).toBeTruthy();
    });

    it('should handle stray closing bracket', () => {
      const reader = bjReader(']');
      bjRead(reader);
      expect(reader.error).toBeTruthy();
    });

    it('should handle unexpected eof', () => {
      const reader = bjReader('');
      bjRead(reader);
      expect(reader.error).toBeTruthy();
    });
  });

  describe('String Escapes', () => {
    it('should parse string with escapes', () => {
      const reader = bjReader('"hello\\nworld\\t\\"quoted\\""');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.STRING);
      expect(bjGetString(reader, val)).toBe('hello\\nworld\\t\\"quoted\\"');
    });
  });

  describe('Whitespace Handling', () => {
    it('should parse with various whitespace', () => {
      const reader = bjReader('  {\n\t"key"  :  \r\n  "value"\n}  ');
      const obj = bjRead(reader);
      expect(obj.type).toBe(BjType.OBJECT);
      
      const key = bjRead(reader);
      expect(bjGetString(reader, key)).toBe("key");
      
      const val = bjRead(reader);
      expect(bjGetString(reader, val)).toBe("value");
      
      const end = bjRead(reader);
      expect(end.type).toBe(BjType.END);
    });
  });

  describe('Complex JSON', () => {
    it('should parse complex nested JSON', () => {
      const complexJson = `{
        "users": [
          {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "active": true,
            "metadata": {
              "lastLogin": "2023-01-01",
              "preferences": {
                "theme": "dark",
                "notifications": false
              }
            },
            "scores": [95, 87, 92]
          },
          {
            "id": 2,
            "name": "Jane Smith",
            "email": "jane@example.com",
            "active": false,
            "metadata": null,
            "scores": []
          }
        ],
        "total": 2,
        "version": "1.0.0"
      }`;
      
      const reader = bjReader(complexJson);
      const root = bjRead(reader);
      expect(root.type).toBe(BjType.OBJECT);
      
      // Parse and validate the complex structure using iterator
      const iterator = new BjObjectIterator(reader, root);
      const pairs = Array.from(iterator);
      
      expect(pairs).toHaveLength(3);
      
      // Check that we have the expected keys
      const keys = pairs.map(p => bjGetString(reader, p.key));
      const expectedKeys = ["users", "total", "version"];
      
      for (const expectedKey of expectedKeys) {
        expect(keys).toContain(expectedKey);
      }
    });
  });

  describe('Value Type Guards', () => {
    it('should throw error for wrong type access', () => {
      const reader = bjReader('42');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.NUMBER);
      
      expect(() => bjGetString(reader, val)).toThrow("Value is not a string");
      expect(() => bjGetBool(reader, val)).toThrow("Value is not a boolean");
    });

    it('should throw error for invalid iterator types', () => {
      const reader = bjReader('"not an array"');
      const val = bjRead(reader);
      expect(val.type).toBe(BjType.STRING);
      
      expect(() => new BjArrayIterator(reader, val)).toThrow("Value is not an array");
      expect(() => new BjObjectIterator(reader, val)).toThrow("Value is not an object");
    });
  });
});
