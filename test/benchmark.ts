import {
  bjReader,
  bjRead,
  bjGetString,
  bjGetNumber,
  BjArrayIterator,
  BjObjectIterator,
  BjType
} from '../src/bjh';

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// 基准测试工具
interface BenchmarkResult {
  name: string;
  duration: number;
  memoryUsed: number;
  itemsProcessed: number;
  throughput: number; // items per second
  category: string;
}

interface ComparisonResult {
  category: string;
  jsonParse: BenchmarkResult;
  bjJs: BenchmarkResult;
  speedRatio: number; // jsonParse / bjJs (>1 means jsonParse faster)
  memoryRatio: number; // jsonParse / bjJs (>1 means jsonParse uses more memory)
}

class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  async run(name: string, category: string, testFn: () => Promise<number> | number): Promise<BenchmarkResult> {
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }

    const memBefore = process.memoryUsage();
    const startTime = performance.now();
    
    const itemsProcessed = await testFn();
    
    const endTime = performance.now();
    const memAfter = process.memoryUsage();
    
    const duration = endTime - startTime;
    const memoryUsed = memAfter.heapUsed - memBefore.heapUsed;
    const throughput = itemsProcessed / (duration / 1000);

    const result: BenchmarkResult = {
      name,
      duration,
      memoryUsed,
      itemsProcessed,
      throughput,
      category
    };

    this.results.push(result);
    return result;
  }

  private formatPerformanceValue(value: number, isBetter: boolean): string {
    const color = isBetter ? colors.green : colors.red;
    return `${color}${value}${colors.reset}`;
  }

  private formatRatio(ratio: number, isSpeedRatio: boolean = true): string {
    if (isSpeedRatio) {
      // 速度比：>1 表示 JSON.parse 更快
      if (ratio > 1.2) {
        return `${colors.red}${ratio.toFixed(2)}x slower${colors.reset}`;
      } else if (ratio < 0.8) {
        return `${colors.green}${(1/ratio).toFixed(2)}x faster${colors.reset}`;
      } else {
        return `${colors.yellow}~${ratio.toFixed(2)}x${colors.reset}`;
      }
    } else {
      // 内存比：>1 表示 JSON.parse 用内存更多
      if (ratio > 1.2) {
        return `${colors.green}${ratio.toFixed(2)}x less${colors.reset}`;
      } else if (ratio < 0.8) {
        return `${colors.red}${ratio.toFixed(2)}x more${colors.reset}`;
      } else {
        return `${colors.yellow}~${ratio.toFixed(2)}x${colors.reset}`;
      }
    }
  }

  printResultsTable(): void {
    console.log(`\n${colors.bold}${colors.cyan}=== JSON Parser Performance Benchmark ===${colors.reset}\n`);

    // 按类别分组结果
    const categories = [...new Set(this.results.map(r => r.category))];
    const comparisons: ComparisonResult[] = [];

    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const jsonParseResult = categoryResults.find(r => r.name.includes('JSON.parse'));
      const bjJsResult = categoryResults.find(r => r.name.includes('big-json-handler'));

      if (jsonParseResult && bjJsResult) {
        comparisons.push({
          category,
          jsonParse: jsonParseResult,
          bjJs: bjJsResult,
          speedRatio: jsonParseResult.duration / bjJsResult.duration,
          memoryRatio: jsonParseResult.memoryUsed / bjJsResult.memoryUsed
        });
      }
    }

    // 打印表头
    console.log(`${colors.bold}┌─────────────────────┬──────────────────────┬──────────────────────┬────────────────┬────────────────┐${colors.reset}`);
    console.log(`${colors.bold}│${colors.reset} ${colors.bold}Test Case${colors.reset}            ${colors.bold}│${colors.reset} ${colors.bold}JSON.parse${colors.reset}           ${colors.bold}│${colors.reset} ${colors.bold}big-json-handler${colors.reset}     ${colors.bold}│${colors.reset} ${colors.bold}Speed Ratio${colors.reset}    ${colors.bold}│${colors.reset} ${colors.bold}Memory Ratio${colors.reset}   ${colors.bold}│${colors.reset}`);
    console.log(`${colors.bold}├─────────────────────┼──────────────────────┼──────────────────────┼────────────────┼────────────────┤${colors.reset}`);

    // 打印每个测试用例的比较
    for (const comp of comparisons) {
      const categoryName = comp.category.padEnd(19);
      
      // JSON.parse 性能数据
      const jsonTime = `${comp.jsonParse.duration.toFixed(1)}ms`;
      const jsonMem = `${(comp.jsonParse.memoryUsed / 1024 / 1024).toFixed(2)}MB`;
      const jsonThroughput = `${(comp.jsonParse.throughput / 1000).toFixed(0)}K/s`;
      const jsonData = `${jsonTime} ${jsonMem} ${jsonThroughput}`.padEnd(20);

      // big-json-handler 性能数据  
      const bjTime = `${comp.bjJs.duration.toFixed(1)}ms`;
      const bjMem = `${(comp.bjJs.memoryUsed / 1024 / 1024).toFixed(2)}MB`;
      const bjThroughput = `${(comp.bjJs.throughput / 1000).toFixed(0)}K/s`;
      const bjData = `${bjTime} ${bjMem} ${bjThroughput}`.padEnd(20);

      // 比率（big-json-handler 相对于 JSON.parse）
      const speedRatio = this.formatRatio(comp.speedRatio, true).padEnd(30);
      const memoryRatio = this.formatRatio(comp.memoryRatio, false).padEnd(30);

      console.log(`│ ${categoryName} │ ${jsonData} │ ${bjData} │ ${speedRatio} │ ${memoryRatio} │`);
    }

    console.log(`${colors.bold}└─────────────────────┴──────────────────────┴──────────────────────┴────────────────┴────────────────┘${colors.reset}`);

    // 统计汇总
    console.log(`\n${colors.bold}${colors.cyan}=== Performance Summary ===${colors.reset}`);
    
    const avgSpeedRatio = comparisons.reduce((sum, c) => sum + c.speedRatio, 0) / comparisons.length;
    const avgMemoryRatio = comparisons.reduce((sum, c) => sum + c.memoryRatio, 0) / comparisons.length;
    
    const bjWins = comparisons.filter(c => c.speedRatio > 1).length;
    const jsonWins = comparisons.filter(c => c.speedRatio < 1).length;
    
    console.log(`${colors.bold}Speed Performance:${colors.reset}`);
    console.log(`  • JSON.parse wins: ${colors.green}${jsonWins}${colors.reset} test cases`);
    console.log(`  • big-json-handler wins: ${colors.green}${bjWins}${colors.reset} test cases`);
    console.log(`  • Average speed: ${avgSpeedRatio > 1 ? colors.red : colors.green}JSON.parse ${avgSpeedRatio.toFixed(2)}x ${avgSpeedRatio > 1 ? 'faster' : 'slower'}${colors.reset}`);
    
    console.log(`\n${colors.bold}Memory Performance:${colors.reset}`);
    const memWins = comparisons.filter(c => c.memoryRatio > 1).length;
    const memLoses = comparisons.filter(c => c.memoryRatio < 1).length;
    console.log(`  • big-json-handler more efficient: ${colors.green}${memWins}${colors.reset} test cases`);
    console.log(`  • JSON.parse more efficient: ${colors.green}${memLoses}${colors.reset} test cases`);
    console.log(`  • Average memory: ${avgMemoryRatio > 1 ? colors.green : colors.red}big-json-handler uses ${avgMemoryRatio.toFixed(2)}x ${avgMemoryRatio > 1 ? 'less' : 'more'}${colors.reset}`);

    // 详细建议
    console.log(`\n${colors.bold}${colors.cyan}=== Recommendations ===${colors.reset}`);
    console.log(`${colors.green}✓ Use JSON.parse for:${colors.reset}`);
    console.log(`  • Small to medium datasets (<10K items)`);
    console.log(`  • Complex nested structures`);
    console.log(`  • Random access patterns`);
    console.log(`  • Development speed priority`);
    
    console.log(`\n${colors.green}✓ Use big-json-handler for:${colors.reset}`);
    const bjBetterCases = comparisons.filter(c => c.speedRatio > 1 || c.memoryRatio > 1.2);
    if (bjBetterCases.length > 0) {
      bjBetterCases.forEach(c => {
        const advantages = [];
        if (c.speedRatio > 1) advantages.push(`${(1/c.speedRatio).toFixed(1)}x faster`);
        if (c.memoryRatio > 1.2) advantages.push(`${c.memoryRatio.toFixed(1)}x less memory`);
        console.log(`  • ${c.category}: ${advantages.join(', ')}`);
      });
    } else {
      console.log(`  • Currently no clear advantages found in these test cases`);
      console.log(`  • Consider for very large datasets (>100K+ items)`);
      console.log(`  • Memory-constrained environments`);
      console.log(`  • Sequential-only access patterns`);
    }
  }

  getResults(): BenchmarkResult[] {
    return this.results;
  }
}

// 测试数据生成器
class TestDataGenerator {
  generateLargeArray(size: number): string {
    const items: string[] = [];
    for (let i = 0; i < size; i++) {
      items.push(`${i}`);
    }
    return `[${items.join(', ')}]`;
  }

  generateLargeObject(size: number): string {
    const items: string[] = [];
    for (let i = 0; i < size; i++) {
      items.push(`"key${i}": ${i}`);
    }
    return `{${items.join(', ')}}`;
  }

  generateComplexObject(userCount: number): string {
    const users: any[] = [];
    
    for (let i = 0; i < userCount; i++) {
      users.push({
        id: i,
        name: `User${i}`,
        email: `user${i}@example.com`,
        active: i % 2 === 0,
        metadata: {
          lastLogin: '2023-01-01',
          preferences: {
            theme: i % 2 === 0 ? 'dark' : 'light',
            notifications: i % 3 === 0
          },
          tags: [`tag${i % 5}`, `category${i % 3}`]
        },
        scores: Array.from({length: 10}, (_, j) => i * 10 + j)
      });
    }

    return JSON.stringify({
      users,
      total: userCount,
      version: '1.0.0',
      timestamp: Date.now()
    });
  }
}

// JSON.parse 基准测试
class JsonParseBenchmark {
  async benchmarkArray(jsonString: string): Promise<number> {
    const data = JSON.parse(jsonString);
    let count = 0;
    
    for (const item of data) {
      count++;
      // 模拟处理
      const value = Number(item);
    }
    
    return count;
  }

  async benchmarkObject(jsonString: string): Promise<number> {
    const data = JSON.parse(jsonString);
    let count = 0;
    
    for (const [key, value] of Object.entries(data)) {
      count++;
      // 模拟处理
      const k = String(key);
      const v = Number(value);
    }
    
    return count;
  }

  async benchmarkComplexObject(jsonString: string): Promise<number> {
    const data = JSON.parse(jsonString);
    let count = 0;
    
    // 遍历用户数组
    for (const user of data.users) {
      count++;
      // 访问用户属性
      const id = user.id;
      const name = user.name;
      const email = user.email;
      const active = user.active;
      
      // 访问嵌套对象
      const lastLogin = user.metadata.lastLogin;
      const theme = user.metadata.preferences.theme;
      const notifications = user.metadata.preferences.notifications;
      
      // 访问数组
      for (const tag of user.metadata.tags) {
        count++;
      }
      
      for (const score of user.scores) {
        count++;
      }
    }
    
    return count;
  }
}

// big-json-handler 基准测试
class BjBenchmark {
  async benchmarkArray(jsonString: string): Promise<number> {
    const reader = bjReader(jsonString);
    const array = bjRead(reader);
    let count = 0;
    
    const iterator = new BjArrayIterator(reader, array);
    for (const item of iterator) {
      count++;
      // 模拟处理
      if (item.type === BjType.NUMBER) {
        const value = bjGetNumber(reader, item);
      }
    }
    
    return count;
  }

  async benchmarkObject(jsonString: string): Promise<number> {
    const reader = bjReader(jsonString);
    const object = bjRead(reader);
    let count = 0;
    
    const iterator = new BjObjectIterator(reader, object);
    for (const {key, value} of iterator) {
      count++;
      // 模拟处理
      if (key.type === BjType.STRING) {
        const k = bjGetString(reader, key);
      }
      if (value.type === BjType.NUMBER) {
        const v = bjGetNumber(reader, value);
      }
    }
    
    return count;
  }

  async benchmarkComplexObject(jsonString: string): Promise<number> {
    const reader = bjReader(jsonString);
    const root = bjRead(reader);
    let count = 0;
    
    // 这里需要手动解析复杂结构，因为sj.js不支持随机访问
    // 我们只遍历顶层对象作为示例
    const iterator = new BjObjectIterator(reader, root);
    for (const {key, value} of iterator) {
      count++;
      
      if (key.type === BjType.STRING && bjGetString(reader, key) === 'users') {
        if (value.type === BjType.ARRAY) {
          const userIterator = new BjArrayIterator(reader, value);
          for (const userValue of userIterator) {
            count++;
            // 对于复杂嵌套结构，big-json-handler需要更多手动解析代码
            // 这里简化处理，只计数
          }
        }
      }
    }
    
    return count;
  }
}

// 主测试函数
async function runBenchmarks(): Promise<void> {
  const runner = new BenchmarkRunner();
  const generator = new TestDataGenerator();
  const jsonBench = new JsonParseBenchmark();
  const bjBench = new BjBenchmark();

  console.log(`${colors.cyan}Generating test data...${colors.reset}`);
  
  // 测试用例配置
  const testCases = [
    { name: 'Small Array (1K)', size: 1000, type: 'array' },
    { name: 'Medium Array (10K)', size: 10000, type: 'array' },
    { name: 'Large Array (100K)', size: 100000, type: 'array' },
    { name: 'Small Object (1K)', size: 1000, type: 'object' },
    { name: 'Medium Object (10K)', size: 10000, type: 'object' },
    { name: 'Large Object (50K)', size: 50000, type: 'object' },
    { name: 'Complex Nested (1K)', size: 1000, type: 'complex' }
  ];

  // 数组测试
  for (const testCase of testCases.filter(t => t.type === 'array')) {
    console.log(`${colors.dim}Testing ${testCase.name}...${colors.reset}`);
    const arrayJson = generator.generateLargeArray(testCase.size);
    
    await runner.run('JSON.parse', testCase.name, () => 
      jsonBench.benchmarkArray(arrayJson)
    );
    
    await runner.run('big-json-handler', testCase.name, () => 
      bjBench.benchmarkArray(arrayJson)
    );
  }

  // 对象测试  
  for (const testCase of testCases.filter(t => t.type === 'object')) {
    console.log(`${colors.dim}Testing ${testCase.name}...${colors.reset}`);
    const objectJson = generator.generateLargeObject(testCase.size);
    
    await runner.run('JSON.parse', testCase.name, () => 
      jsonBench.benchmarkObject(objectJson)
    );
    
    await runner.run('big-json-handler', testCase.name, () => 
      bjBench.benchmarkObject(objectJson)
    );
  }

  // 复杂对象测试
  for (const testCase of testCases.filter(t => t.type === 'complex')) {
    console.log(`${colors.dim}Testing ${testCase.name}...${colors.reset}`);
    const complexJson = generator.generateComplexObject(testCase.size);
    
    await runner.run('JSON.parse', testCase.name, () => 
      jsonBench.benchmarkComplexObject(complexJson)
    );
    
    await runner.run('big-json-handler', testCase.name, () => 
      bjBench.benchmarkComplexObject(complexJson)
    );
  }

  runner.printResultsTable();
}

// 导出供命令行使用
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks, BenchmarkRunner, TestDataGenerator, JsonParseBenchmark, BjBenchmark };
