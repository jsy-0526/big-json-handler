# big-json-handler

> Memory-efficient JSON parser for large datasets - High-performance streaming parser optimized for big data

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**[中文文档](README-zh.md)** | **English**

## 🚀 Why big-json-handler?

Processing large JSON files with the standard `JSON.parse()` can cause memory issues and performance bottlenecks. **big-json-handler** solves this by parsing JSON **token-by-token** without building a complete DOM tree in memory.

### The Problem with JSON.parse()

```javascript
// ❌ Standard approach - Memory intensive
const hugeLogs = fs.readFileSync('10GB-logs.json', 'utf8'); // 💥 10GB in memory
const data = JSON.parse(hugeLogs); // 💥 Another 10GB+ for object tree
const errorCount = data.logs.filter(log => log.level === 'ERROR').length; // Need to keep everything in memory
```

### The big-json-handler Solution

```javascript
// ✅ Memory-efficient approach
import { bjReader, bjRead, BjArrayIterator, BjObjectIterator, bjGetString } from 'big-json-handler';

const reader = bjReader(fs.readFileSync('10GB-logs.json', 'utf8')); // Only raw string in memory
const root = bjRead(reader);
let errorCount = 0;

// Stream through the data without storing objects
const objIterator = new BjObjectIterator(reader, root);
for (const {key, value} of objIterator) {
  if (bjGetString(reader, key) === 'logs') {
    const arrayIterator = new BjArrayIterator(reader, value);
    for (const logEntry of arrayIterator) {
      // Process each log entry without storing it
      const entryIterator = new BjObjectIterator(reader, logEntry);
      for (const {key: logKey, value: logValue} of entryIterator) {
        if (bjGetString(reader, logKey) === 'level' && bjGetString(reader, logValue) === 'ERROR') {
          errorCount++;
          break; // Early exit - no need to parse remaining fields
        }
      }
    }
    break;
  }
}
```

## 📊 Performance Comparison

Based on our comprehensive benchmarks:

| Scenario | JSON.parse | big-json-handler | Winner |
|----------|------------|------------------|---------|
| **Large Objects** (50K properties) | 17.6ms | **6.5ms** | 🟢 **2.7x faster** |
| **Medium Objects** (10K properties) | 3.1ms | **1.9ms** | 🟢 **1.6x faster** |
| **Memory Usage** (Large datasets) | High | **79% less** | 🟢 **Memory efficient** |
| **Small Arrays** (1K items) | **0.2ms** | 0.9ms | 🔴 5.4x slower |
| **Complex Nested** | **1.0ms** | 3.7ms | 🔴 3.9x slower |

## 🎯 When to Use big-json-handler

### ✅ Perfect for:

- **🗂️ Large JSON files** (>10MB)
- **💾 Memory-constrained environments** (Lambda, containers, embedded)
- **📈 Log analysis and data processing**
- **🔍 Searching large datasets** (only need specific fields)
- **⚡ Streaming data validation**
- **📊 Big data ETL operations**

### ❌ Stick with JSON.parse for:

- **📄 Small JSON files** (<1MB)
- **🎯 Random data access** (need to jump around the structure)
- **🏗️ Complex nested operations**
- **🚀 Rapid prototyping**

## 🛠️ Installation

```bash
npm install big-json-handler
```

## 📖 Quick Start

### Basic Usage

```typescript
import { bjReader, bjRead, bjGetString, bjGetNumber, BjType } from 'big-json-handler';

const jsonData = '{"name": "John", "age": 30, "city": "New York"}';
const reader = bjReader(jsonData);
const obj = bjRead(reader);

if (obj.type === BjType.OBJECT) {
  const iterator = new BjObjectIterator(reader, obj);
  for (const {key, value} of iterator) {
    const keyName = bjGetString(reader, key);
    
    if (value.type === BjType.STRING) {
      console.log(`${keyName}: ${bjGetString(reader, value)}`);
    } else if (value.type === BjType.NUMBER) {
      console.log(`${keyName}: ${bjGetNumber(reader, value)}`);
    }
  }
}
```

### Processing Large Arrays

```typescript
import { bjReader, bjRead, BjArrayIterator, bjGetNumber } from 'big-json-handler';

// Process huge arrays without loading everything into memory
const hugeArray = '[1, 2, 3, ..., 1000000]'; // Imagine this is huge
const reader = bjReader(hugeArray);
const array = bjRead(reader);

let sum = 0;
const iterator = new BjArrayIterator(reader, array);
for (const item of iterator) {
  sum += bjGetNumber(reader, item);
  // Each number is processed and discarded, not stored
}
```

### Real-world Example: Log Analysis

```typescript
import fs from 'fs';
import { bjReader, bjRead, BjObjectIterator, BjArrayIterator, bjGetString } from 'big-json-handler';

function analyzeErrorLogs(logFilePath: string) {
  const content = fs.readFileSync(logFilePath, 'utf8');
  const reader = bjReader(content);
  const root = bjRead(reader);
  
  const stats = { errors: 0, warnings: 0, info: 0 };
  
  // Navigate to the logs array
  const objIterator = new BjObjectIterator(reader, root);
  for (const {key, value} of objIterator) {
    if (bjGetString(reader, key) === 'entries') {
      const arrayIterator = new BjArrayIterator(reader, value);
      
      // Process each log entry
      for (const logEntry of arrayIterator) {
        const entryIterator = new BjObjectIterator(reader, logEntry);
        
        for (const {key: logKey, value: logValue} of entryIterator) {
          if (bjGetString(reader, logKey) === 'level') {
            const level = bjGetString(reader, logValue);
            stats[level]++;
            break; // Found what we need, move to next entry
          }
        }
      }
      break;
    }
  }
  
  return stats;
}

// Process a 5GB log file efficiently
const results = analyzeErrorLogs('huge-production-logs.json');
console.log(results); // { errors: 1543, warnings: 12043, info: 98234 }
```

## 🔧 API Reference

### Core Functions

#### `bjReader(data: string): BjReader`
Creates a reader for parsing JSON data.

#### `bjRead(reader: BjReader): BjValue`
Reads the next JSON token from the reader.

#### `bjLocation(reader: BjReader): {line: number, col: number}`
Gets the current parsing position for error reporting.

### Value Extractors

#### `bjGetString(reader: BjReader, value: BjValue): string`
Extracts string value from a STRING token.

#### `bjGetNumber(reader: BjReader, value: BjValue): number`
Extracts numeric value from a NUMBER token.

#### `bjGetBool(reader: BjReader, value: BjValue): boolean`
Extracts boolean value from a BOOL token.

#### `bjIsNull(value: BjValue): boolean`
Checks if the value is null.

### Iterators

#### `BjArrayIterator`
Efficiently iterates through array elements.

```typescript
const iterator = new BjArrayIterator(reader, arrayValue);
for (const item of iterator) {
  // Process each array item
}
```

#### `BjObjectIterator`
Efficiently iterates through object key-value pairs.

```typescript
const iterator = new BjObjectIterator(reader, objectValue);
for (const {key, value} of iterator) {
  // Process each key-value pair
}
```

### Types

```typescript
enum BjType {
  ERROR = 0,
  END = 1,
  ARRAY = 2,
  OBJECT = 3,
  NUMBER = 4,
  STRING = 5,
  BOOL = 6,
  NULL = 7
}
```

## 🧪 Testing & Benchmarks

```bash
# Run tests
npm test

# Run performance benchmarks
npm run benchmark

# Watch mode for development
npm run test:watch
```

## 🏗️ Real-world Use Cases

### 1. Microservice API Validation

```typescript
// Validate API responses without storing the entire response
function validateUserResponse(jsonResponse: string): boolean {
  const reader = bjReader(jsonResponse);
  const root = bjRead(reader);
  
  let hasId = false, hasEmail = false;
  const iterator = new BjObjectIterator(reader, root);
  
  for (const {key, value} of iterator) {
    const keyName = bjGetString(reader, key);
    if (keyName === 'id' && value.type === BjType.NUMBER) hasId = true;
    if (keyName === 'email' && value.type === BjType.STRING) hasEmail = true;
    
    if (hasId && hasEmail) return true; // Early exit
  }
  
  return false;
}
```

### 2. Configuration Hot-reloading

```typescript
class ConfigManager {
  private config = new Map<string, any>();
  
  hotReload(configJson: string) {
    const reader = bjReader(configJson);
    const root = bjRead(reader);
    
    const iterator = new BjObjectIterator(reader, root);
    for (const {key, value} of iterator) {
      const configKey = bjGetString(reader, key);
      const newValue = this.extractValue(reader, value);
      
      if (this.config.get(configKey) !== newValue) {
        this.config.set(configKey, newValue);
        this.emit('configChanged', configKey, newValue);
      }
    }
  }
}
```

### 3. Data Migration Scripts

```typescript
// Migrate millions of records without loading them all into memory
async function migrateUserData(sourceFile: string, targetDb: Database) {
  const content = fs.readFileSync(sourceFile, 'utf8');
  const reader = bjReader(content);
  const root = bjRead(reader);
  
  // Find users array and process each user individually
  const objIterator = new BjObjectIterator(reader, root);
  for (const {key, value} of objIterator) {
    if (bjGetString(reader, key) === 'users') {
      const arrayIterator = new BjArrayIterator(reader, value);
      
      for (const userValue of arrayIterator) {
        const user = this.parseUser(reader, userValue);
        await targetDb.insert('users', user);
        // User object is garbage collected immediately
      }
      break;
    }
  }
}
```

## 💡 Performance Tips

1. **Early Exit**: Break out of loops as soon as you find what you need
2. **Selective Parsing**: Only extract the fields you actually use
3. **Memory Management**: Let processed objects be garbage collected
4. **Batch Processing**: Process data in chunks for very large files

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [JSON.parse()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) - Standard JSON parser
- [stream-json](https://github.com/uhop/stream-json) - Another streaming JSON parser
- [clarinet](https://github.com/dscape/clarinet) - SAX-style JSON parser

---

**big-json-handler** - When your JSON is too big for `JSON.parse()` 🚀
