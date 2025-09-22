# big-json-handler

> 大数据集的内存高效JSON解析器 - 为大数据优化的高性能流式解析器

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**中文文档** | **[English](README.md)**

## 🚀 为什么选择big-json-handler？

使用标准的`JSON.parse()`处理大型JSON文件可能会导致内存问题和性能瓶颈。**big-json-handler**通过**逐个标记**解析JSON而无需在内存中构建完整的DOM树来解决这个问题。

### JSON.parse()的问题

```javascript
// ❌ 标准方法 - 内存密集型
const hugeLogs = fs.readFileSync('10GB-logs.json', 'utf8'); // 💥 内存中10GB
const data = JSON.parse(hugeLogs); // 💥 对象树又占用10GB+
const errorCount = data.logs.filter(log => log.level === 'ERROR').length; // 需要将所有内容保留在内存中
```

### big-json-handler解决方案

```javascript
// ✅ 内存高效方法
import { bjReader, bjRead, BjArrayIterator, BjObjectIterator, bjGetString } from 'big-json-handler';

const reader = bjReader(fs.readFileSync('10GB-logs.json', 'utf8')); // 只有原始字符串在内存中
const root = bjRead(reader);
let errorCount = 0;

// 流式处理数据而不存储对象
const objIterator = new BjObjectIterator(reader, root);
for (const {key, value} of objIterator) {
  if (bjGetString(reader, key) === 'logs') {
    const arrayIterator = new BjArrayIterator(reader, value);
    for (const logEntry of arrayIterator) {
      // 处理每个日志条目而不存储它
      const entryIterator = new BjObjectIterator(reader, logEntry);
      for (const {key: logKey, value: logValue} of entryIterator) {
        if (bjGetString(reader, logKey) === 'level' && bjGetString(reader, logValue) === 'ERROR') {
          errorCount++;
          break; // 提前退出 - 无需解析其余字段
        }
      }
    }
    break;
  }
}
```

## 📊 性能对比

基于我们的综合基准测试：

| 场景 | JSON.parse | big-json-handler | 优胜者 |
|----------|------------|------------------|---------| 
| **大型对象** (5万属性) | 17.6ms | **6.5ms** | 🟢 **快2.7倍** |
| **中型对象** (1万属性) | 3.1ms | **1.9ms** | 🟢 **快1.6倍** |
| **内存使用** (大数据集) | 高 | **减少79%** | 🟢 **内存高效** |
| **小型数组** (1千项) | **0.2ms** | 0.9ms | 🔴 慢5.4倍 |
| **复杂嵌套** | **1.0ms** | 3.7ms | 🔴 慢3.9倍 |

## 🎯 何时使用big-json-handler

### ✅ 适用于:

- **🗂️ 大型JSON文件** (>10MB)
- **💾 内存受限环境** (Lambda、容器、嵌入式)
- **📈 日志分析和数据处理**
- **🔍 搜索大型数据集** (只需要特定字段)
- **⚡ 流式数据验证**
- **📊 大数据ETL操作**

### ❌ 坚持使用JSON.parse的场景:

- **📄 小型JSON文件** (<1MB)
- **🎯 随机数据访问** (需要跳转访问结构)
- **🏗️ 复杂嵌套操作**
- **🚀 快速原型开发**

## 🛠️ 安装

```bash
npm install big-json-handler
```

## 📖 快速开始

### 基本用法

```typescript
import { bjReader, bjRead, bjGetString, bjGetNumber, BjType } from 'big-json-handler';

const jsonData = '{"name": "张三", "age": 30, "city": "北京"}';
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

### 处理大型数组

```typescript
import { bjReader, bjRead, BjArrayIterator, bjGetNumber } from 'big-json-handler';

// 处理巨大数组而不将所有内容加载到内存中
const hugeArray = '[1, 2, 3, ..., 1000000]'; // 想象这是一个巨大的数组
const reader = bjReader(hugeArray);
const array = bjRead(reader);

let sum = 0;
const iterator = new BjArrayIterator(reader, array);
for (const item of iterator) {
  sum += bjGetNumber(reader, item);
  // 每个数字被处理并丢弃，不被存储
}
```

### 真实世界示例：日志分析

```typescript
import fs from 'fs';
import { bjReader, bjRead, BjObjectIterator, BjArrayIterator, bjGetString } from 'big-json-handler';

function analyzeErrorLogs(logFilePath: string) {
  const content = fs.readFileSync(logFilePath, 'utf8');
  const reader = bjReader(content);
  const root = bjRead(reader);
  
  const stats = { errors: 0, warnings: 0, info: 0 };
  
  // 导航到日志数组
  const objIterator = new BjObjectIterator(reader, root);
  for (const {key, value} of objIterator) {
    if (bjGetString(reader, key) === 'entries') {
      const arrayIterator = new BjArrayIterator(reader, value);
      
      // 处理每个日志条目
      for (const logEntry of arrayIterator) {
        const entryIterator = new BjObjectIterator(reader, logEntry);
        
        for (const {key: logKey, value: logValue} of entryIterator) {
          if (bjGetString(reader, logKey) === 'level') {
            const level = bjGetString(reader, logValue);
            stats[level]++;
            break; // 找到我们需要的内容，移动到下一个条目
          }
        }
      }
      break;
    }
  }
  
  return stats;
}

// 高效处理5GB日志文件
const results = analyzeErrorLogs('huge-production-logs.json');
console.log(results); // { errors: 1543, warnings: 12043, info: 98234 }
```

## 🔧 API参考

### 核心函数

#### `bjReader(data: string): BjReader`
创建用于解析JSON数据的读取器。

#### `bjRead(reader: BjReader): BjValue`
从读取器读取下一个JSON标记。

#### `bjLocation(reader: BjReader): {line: number, col: number}`
获取当前解析位置用于错误报告。

### 值提取器

#### `bjGetString(reader: BjReader, value: BjValue): string`
从STRING标记提取字符串值。

#### `bjGetNumber(reader: BjReader, value: BjValue): number`
从NUMBER标记提取数值。

#### `bjGetBool(reader: BjReader, value: BjValue): boolean`
从BOOL标记提取布尔值。

#### `bjIsNull(value: BjValue): boolean`
检查值是否为null。

### 迭代器

#### `BjArrayIterator`
高效遍历数组元素。

```typescript
const iterator = new BjArrayIterator(reader, arrayValue);
for (const item of iterator) {
  // 处理每个数组项
}
```

#### `BjObjectIterator`
高效遍历对象键值对。

```typescript
const iterator = new BjObjectIterator(reader, objectValue);
for (const {key, value} of iterator) {
  // 处理每个键值对
}
```

### 类型

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

## 🧪 测试和基准测试

```bash
# 运行测试
npm test

# 运行性能基准测试
npm run benchmark

# 开发监视模式
npm run test:watch
```

## 🏗️ 真实世界用例

### 1. 微服务API验证

```typescript
// 验证API响应而不存储整个响应
function validateUserResponse(jsonResponse: string): boolean {
  const reader = bjReader(jsonResponse);
  const root = bjRead(reader);
  
  let hasId = false, hasEmail = false;
  const iterator = new BjObjectIterator(reader, root);
  
  for (const {key, value} of iterator) {
    const keyName = bjGetString(reader, key);
    if (keyName === 'id' && value.type === BjType.NUMBER) hasId = true;
    if (keyName === 'email' && value.type === BjType.STRING) hasEmail = true;
    
    if (hasId && hasEmail) return true; // 提前退出
  }
  
  return false;
}
```

### 2. 配置热重载

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

### 3. 数据迁移脚本

```typescript
// 迁移数百万记录而不将它们全部加载到内存中
async function migrateUserData(sourceFile: string, targetDb: Database) {
  const content = fs.readFileSync(sourceFile, 'utf8');
  const reader = bjReader(content);
  const root = bjRead(reader);
  
  // 找到用户数组并单独处理每个用户
  const objIterator = new BjObjectIterator(reader, root);
  for (const {key, value} of objIterator) {
    if (bjGetString(reader, key) === 'users') {
      const arrayIterator = new BjArrayIterator(reader, value);
      
      for (const userValue of arrayIterator) {
        const user = this.parseUser(reader, userValue);
        await targetDb.insert('users', user);
        // 用户对象立即被垃圾回收
      }
      break;
    }
  }
}
```

## 💡 性能优化建议

1. **提前退出**: 一旦找到需要的内容就跳出循环
2. **选择性解析**: 只提取实际使用的字段
3. **内存管理**: 让处理过的对象被垃圾回收
4. **批量处理**: 对于非常大的文件，分块处理数据

## 🤝 贡献

欢迎贡献！请随时提交Pull Request。

## 📄 许可证

MIT许可证 - 详见[LICENSE](LICENSE)文件。

## 🔗 相关项目

- [JSON.parse()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) - 标准JSON解析器
- [stream-json](https://github.com/uhop/stream-json) - 另一个流式JSON解析器
- [clarinet](https://github.com/dscape/clarinet) - SAX风格的JSON解析器

---

**big-json-handler** - 当您的JSON对于`JSON.parse()`来说太大时 🚀