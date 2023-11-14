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

  const key = pluginList.join("/");
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