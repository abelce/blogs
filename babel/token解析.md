1. 加载code
2. 创建Parser，此过程包括plugins、presets的初始化
3. 解析token
4. 生成ast
   
## babel解析过程

在 `transformFileRunner`中，babel配置加载完后，就会读取源码代码文件得到`code`，然后调用`run`函数
```ts
const transformFileRunner = gensync(function* (
  filename: string,
  opts?: InputOptions,
): Handler<FileResult | null> {
  const options = { ...opts, filename };

  // 加载options
  const config: ResolvedConfig | null = yield* loadConfig(options);
  if (config === null) return null;
  // 读取文件
  const code = yield* fs.readFile(filename, "utf8");
  // 开始解析
  return yield* run(config, code);
});
```

在`run`函数中分为三步：
1. 调用`normalizeFile`，通过`parser()`得到ast
2. 执行`transformFile`转换
3. 通过`generateCode`将ast转为code

```ts
export function* run(
  config: ResolvedConfig,
  code: string,
  ast?: t.File | t.Program | null,
): Handler<FileResult> {
  // 包含ast的file
  const file = yield* normalizeFile(
    config.passes,
    normalizeOptions(config),
    code,
    ast,
  );

  const opts = file.opts;
  try {
    // 转换file ast
    yield* transformFile(file, config.passes);
  } catch (e) {
   // .....
  }

  let outputCode, outputMap;
  try {
    if (opts.code !== false) {
      // 通过ast生成code
      ({ outputCode, outputMap } = generateCode(config.passes, file));
    }
  } catch (e) {
    // .....
  }

  return {
    metadata: file.metadata,
    options: opts,
    ast: opts.ast === true ? file.ast : null,
    code: outputCode === undefined ? null : outputCode,
    map: outputMap === undefined ? null : outputMap,
    sourceType: file.ast.program.sourceType,
    externalDependencies: flattenToSet(config.externalDependencies),
  };
}

```

本文主要讲述`parser`中token的解析过程。

首先在`parser`中调用`parse`函数，其中[`sourceType`](https://babeljs.io/docs/options#sourcetype)默认值为`module`，
```ts
export function parse(input: string, options?: Options): File {
  if (options?.sourceType === "unambiguous") { // 如果sourceType是不明确的
    options = {
      ...options,
    };
    try {
      options.sourceType = "module";
      const parser = getParser(options, input);
      const ast = parser.parse();

      if (parser.sawUnambiguousESM) {
        return ast;
      }

      if (parser.ambiguousScriptDifferentAst) {
        try {
          options.sourceType = "script";
          return getParser(options, input).parse();
        } catch {}
      } else {
        ast.program.sourceType = "script";
      }

      return ast;
    } catch (moduleError) {
      try {
        options.sourceType = "script";
        return getParser(options, input).parse();
      } catch {}

      throw moduleError;
    }
  } else {
    // sourceType 默认值为 module，  https://babeljs.io/docs/options#sourcetype
    return getParser(options, input).parse();
  }
}
```
创建parser时会根据plugin
1. 默认使用`Parser`，如果有plugins就根据plugin
```ts
function getParser(options: Options | undefined | null, input: string): Parser {
  let cls = Parser;
  if (options?.plugins) {
    validatePlugins(options.plugins);
    cls = getParserClass(options.plugins);
  }

  return new cls(options, input);
}

const parserClassCache: { [key: string]: { new (...args: any): Parser } } = {};

/** Get a Parser class with plugins applied. */
// 初始化plugin
function getParserClass(pluginsFromOptions: PluginList): {
  new (...args: any): Parser;
} {
  // 判断是否包含 "estree" | "jsx" | "flow" | "typescript" | "v8intrinsic" | "placeholders"等plugin
  // 有的话就初始化对应的plugin的Parser，比如： jsx的parser为JSXParserMixin
  // 同时放在parserClassCache中进行缓存
  const pluginList = mixinPluginNames.filter(name =>
    hasPlugin(pluginsFromOptions, name),
  );

  const key = pluginList.join("/"); // 使用包含plugin的name作为key就行缓存
  // 从缓存中获取parser
  let cls = parserClassCache[key];
  if (!cls) {
    cls = Parser;
    // 创建plugins中的Parser并缓存
    // 通过多重继承的方式，将各个plugin中的Parser的方法融合到一个Parser上
    for (const plugin of pluginList) {
      // @ts-expect-error todo(flow->ts)
      cls = mixinPlugins[plugin](cls);
    }
    // 通过plugin的key记性缓存
    parserClassCache[key] = cls;
  }
  return cls;
}
```

`Parser`的继承链:
```
Parser -> StatementParser -> ExpressionParser -> LValParser -> NodeUtils -> UtilParser -> Tokenizer -> CommentsParser -> BaseParser
```

## 解析
babel解析过程`token`和`ast`是同步进行的，不是将所有token解析好后再生成ast;

先来看一个解析后的样子[ast在线解析](https://astexplorer.net/)，将切换成`@babel/parser`，将下面的代码复制进去:
```js
const a = 1;
```
解析结果:
![](https://file.vwood.xyz/2023/11/29/WX20231129-170634.png)

其中的`File`、`Program`基本是一样的
```ts
  parse(): N.File {
    this.enterInitialScopes();
    const file = this.startNode() as N.File;// 创建File节点
    const program = this.startNode() as N.Program; // 创建Program，属于File的子节点
    this.nextToken(); // 开始解析token， 感觉这一步属于尝试性的解析代码，如果代码解析不了就直接报错，成功了就作为parseTopLevel解析的基础
    file.errors = null;
    this.parseTopLevel(file, program); // 解析program的部分，以及program关联到file上
    file.errors = this.state.errors;
    return file;
  }
```
`nextToken`的逻辑，其中`codePointAtPos`用于获取当前pos位置的ASCII码，此时对应第一个字符`c`，ASCII为`99`

```ts
  nextToken(): void {
    this.skipSpace();
    this.state.start = this.state.pos;
    if (!this.isLookahead) this.state.startLoc = this.state.curPosition();
    if (this.state.pos >= this.length) {
      this.finishToken(tt.eof);
      return;
    }

    this.getTokenFromCode(this.codePointAtPos(this.state.pos));
  }

```
`getTokenFromCode`中根据传入的ASCII数据来匹配关键的符号，此时`code`匹配switch的默认分支；首先通过`isIdentifierStart`判断code是否能作为标识符的第一个字符，然后调用`readWord`

```ts
  // 根据code来匹配单词
  // chatCode源码地址 https://github.com/xtuc/charcodes/blob/master/packages/charcodes/src/index.js
  getTokenFromCode(code: number): void {
    switch (code) {
      // The interpretation of a dot depends on whether it is followed
      // by a digit or another two dots.

      case charCodes.dot:
        this.readToken_dot();
        return;
      // Punctuation tokens.
      // 省略。。。。

      default:
        if (isIdentifierStart(code)) { // 如果可以作为标识符的第一个字符，就按照标识符的规则进行识别
          this.readWord(code);
          return;
        }
    }

    throw this.raise(Errors.InvalidOrUnexpectedToken, {
      at: this.state.curPosition(),
      unexpected: String.fromCodePoint(code),
    });
  }
```

`readWord`逻辑:
1. 读取一个word（此时的word=`const`字符串）
2. 判断word是否为关键字(`keywordTypes`中的数据在程序启动时就会添加进去)，`type`是一个数字
   1. 如果是关键字，调用`finishToken`时就传入token得文本
   2. 否则传入获取到的word，其中`tt.name`是标识符对应的数字

```ts
  readWord(firstCode?: number): void {
    const word = this.readWord1(firstCode); // 读取word
    const type = keywordTypes.get(word); 
    if (type !== undefined) { // 是否为关键字，是一个数字
      // We don't use word as state.value here because word is a dynamic string
      // while token label is a shared constant string
      // 如果是关键字
      this.finishToken(type, tokenLabelName(type)); // 通常tokenLabelName(type)的返回值就是上面的word
    } else {
      this.finishToken(tt.name, word);
    }
  }
```
`finishToken`逻辑：
主要设置token得位置信息，以及token得type(此时的type为`const`)
+ type: token的类型（实际值为程序启动时自动递增的数字）
+ value: `readWord`函数读取的word为关键字时对应的字符串，否者为word本身
```ts
  // 处理end、type、value等信息
  finishToken(type: TokenType, val?: any): void {
    this.state.end = this.state.pos;
    this.state.endLoc = this.state.curPosition();
    const prevType = this.state.type;
    this.state.type = type;
    this.state.value = val;

    if (!this.isLookahead) {
      this.updateContext(prevType);
    }
  }
```
此时`const`这个token就读取出来了。

### parseTopLevel
上面读取到了第一个token(`const`的token信息)