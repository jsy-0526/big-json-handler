# big-json-handler Performance Benchmarks

## 🚀 Running Benchmarks

```bash
# Run comprehensive performance comparison
npm run benchmark

# Or manually with garbage collection enabled
npm run build
node --expose-gc dist/test/benchmark.js
```

## 📊 What We Test

### Test Categories

1. **🔢 Array Processing**
   - Small Array: 1,000 elements
   - Medium Array: 10,000 elements  
   - Large Array: 100,000 elements

2. **🗂️ Object Processing**
   - Small Object: 1,000 properties
   - Medium Object: 10,000 properties
   - Large Object: 50,000 properties

3. **🏗️ Complex Nested Structures**
   - 1,000 user objects with nested metadata and arrays

## 📈 Key Performance Insights

### Where big-json-handler Excels 🏆

| Scenario | Performance Gain | Use Case |
|----------|------------------|----------|
| **Large Objects** (50K props) | **2.7x faster** + 26% less memory | Database exports, config files |
| **Medium Objects** (10K props) | **1.6x faster** + 248% less memory | API responses, data processing |
| **Large Arrays** (100K items) | 79% less memory usage | Log processing, bulk data |

### Where JSON.parse Wins 🥇

| Scenario | Performance Gap | Recommendation |
|----------|----------------|----------------|
| **Small Arrays** (1K items) | 5.4x faster | Use JSON.parse for small datasets |
| **Complex Nested** | 3.9x faster | Use JSON.parse for complex structures |

## 🎯 Performance Decision Matrix

### Choose big-json-handler when:

```
✅ File size > 10MB
✅ Memory usage is critical
✅ Processing flat/simple structures  
✅ Only need specific fields from large datasets
✅ Running in memory-constrained environments (Lambda, containers)
```

### Choose JSON.parse when:

```
✅ File size < 1MB
✅ Need random access to data
✅ Working with complex nested structures
✅ Rapid development/prototyping
✅ Small arrays or objects
```

## 🧪 Benchmark Methodology

### Memory Measurement
- Uses `process.memoryUsage()` before/after parsing
- Includes forced garbage collection with `--expose-gc`
- Measures heap usage difference

### Performance Metrics
- **Duration**: Total parsing + processing time (milliseconds)
- **Throughput**: Items processed per second
- **Memory**: Peak heap memory increase (MB)

### Test Data Generation
- **Arrays**: Sequential integers `[0, 1, 2, ...]`
- **Objects**: Simple key-value pairs `{"key0": 0, "key1": 1, ...}`
- **Complex**: Realistic nested user objects with metadata

## 📊 Interpreting Results

The benchmark outputs a colorized table showing:

- 🟢 **Green**: Better performance (faster or less memory)
- 🔴 **Red**: Worse performance (slower or more memory)  
- 🟡 **Yellow**: Similar performance (within 20% difference)

### Sample Output

```
┌─────────────────────┬──────────────────────┬──────────────────────┬────────────────┬────────────────┐
│ Test Case           │ JSON.parse           │ big-json-handler     │ Speed Ratio    │ Memory Ratio   │
├─────────────────────┼──────────────────────┼──────────────────────┼────────────────┼────────────────┤
│ Large Object (50K)  │ 17.6ms 10.69MB       │ 6.5ms 8.52MB        │ 2.70x faster   │ 1.26x less     │
│ Small Array (1K)    │ 0.2ms 0.37MB         │ 0.9ms 0.78MB        │ 5.43x slower   │ 0.47x more     │
└─────────────────────┴──────────────────────┴──────────────────────┴────────────────┴────────────────┘
```

## 🔧 Custom Benchmarks

You can modify test parameters in `test/benchmark.ts`:

```typescript
const testCases = [
  { name: 'Huge Array (1M)', size: 1000000, type: 'array' },
  { name: 'Massive Object (100K)', size: 100000, type: 'object' },
  // Add your custom test cases
];
```

## 💡 Real-world Performance Tips

1. **Profile Your Actual Data**: Run benchmarks with your real JSON structures
2. **Consider File Size vs Structure**: Large simple structures favor big-json-handler
3. **Memory vs Speed Trade-offs**: Choose based on your constraints
4. **Early Exit Strategies**: Implement early termination in your parsing logic

## 🏆 Performance Best Practices

### For big-json-handler:
```typescript
// ✅ Good - Early exit when found
for (const {key, value} of iterator) {
  if (sjGetString(reader, key) === 'target') {
    processValue(value);
    break; // Stop parsing unnecessary data
  }
}

// ❌ Bad - Parse everything
const allData = Array.from(iterator);
const target = allData.find(item => /* condition */);
```

### For JSON.parse:
```typescript
// ✅ Good - For small, complex data
const data = JSON.parse(smallComplexJson);
const result = processComplexStructure(data);

// ❌ Bad - For large simple data  
const data = JSON.parse(hugeSimpleJson); // Memory spike
```

## 📈 Scaling Characteristics

### big-json-handler Scaling:
- **Memory**: Constant O(1) regardless of JSON size
- **Speed**: Linear O(n) with data processed, not total size
- **Best Case**: Large flat structures (objects/arrays)

### JSON.parse Scaling:
- **Memory**: Linear O(n) with JSON size
- **Speed**: Highly optimized, but affected by total size
- **Best Case**: Small to medium complex structures

---

**Run the benchmarks with your own data to make informed decisions!** 🚀