本文主要讲述babel的配置文件及其加载过程。更多的配置信息请查看官网网站。

babel在解析文件前会先加载配置信息，然后根据配置信息对源代码进行处理。

babel有两种配置文件，可以配合使用，也可以单独使用[Config Fiels](https://babeljs.io/docs/config-files):
+ 项目范围的配置
  + `babel.config.*` 文件, 具有以下的扩展名: `.json` `.js`, `.cjs`, `.mjs`, `.cts`.
+ 相对文件路径的配置
  + `.babelrc.*` 文件, 具有以下的扩展名: `.json`, `.js`, `.cjs`, `.mjs`, `.cts`
  + `.babelrc` 文件
  + `package.json`文件，其中的key为`babel`


## 项目级配置
+ 在babel7中添加了`root`概念，默认为当前的工作目录，babel会自动的在根目录下搜索`babel.config.json`(或者其他扩展名的文件)，当然用户也可以通过`configFile`指定配置文件。
+ 由于配置文件之间是无力隔离的，所以使用范围不交广泛。甚至允许`plguins`和`presets`轻松应用于`node_modules`或者是符号链接包中的文件
+ 这种配置的缺点它依赖于工作目录，在monorepos中使用就比较麻烦。

## 相对文件路径的配置
+ babel从正在编译的文件`filename`目录开始搜索`.babelrc.json`或者其他等效的文件，该功能允许为某一部分文件创建独立的配置。这些配置信息会被合并到项目级的配置中。

使用文件相关配置时需要考虑一些边缘情况:
+ 搜索范围是从`filename`所在目录直到找到最近的一个`.babelrc.json`文件或者遇到`package.json`就停止，因此相对配置仅适用于单个package.
+ `filename`的路径必须在`babelrcRoots`内，否则搜索将会直接跳过。

注意事项：
+ `.babelrc.json`仅适用于自己包之内的文件
+ 除非您选择使用`babelrcRoots`，否则将忽略不是 Babel 'root' 的包中的 `.babelrc.json` 文件.


## 配置文件加载过程

1. 在`@babel/core`模块中的`transform-file.ts`文件中调用函数`transformFileRunner`。 调用`loadConfig`函数
  
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
2. 在`loadConfig`函数中`loadPrivatePartialConfig` --> `buildRootChain`
3. 在`buildRootChain`中加载配置，如果指定了`configFile`就通过`loadConfig`加载，否则`opts.configFile !== false`时就自动搜索，一次调用`findRootConfig` --> `loadOneConfig`， `loadOneConfig`中会查找可能扩展名文件(`.json` `.js`, `.cjs`, `.mjs`, `.cts`)

 buildRootChain 函数部分源码:
 ```ts
  
  // ......
   let configFile;
  // 是否指定 configFile，就加载对应文件
  if (typeof opts.configFile === "string") {
    // 指定了就去加载
    configFile = yield* loadConfig(
      opts.configFile,
      context.cwd,
      context.envName,
      context.caller,
    );
  } else if (opts.configFile !== false) {
    // configFile!== false时就搜索 babel.config.json等对应的文件
    configFile = yield* findRootConfig(
      context.root,
      context.envName,
      context.caller,
    );
  }
 ```
loadOneConfig源码如下，`babel.config.*`文件只能存在一个吗，否则提示报错。
 ```ts
 function* loadOneConfig(
  names: string[],
  dirname: string,
  envName: string,
  caller: CallerMetadata | undefined,
  previousConfig: ConfigFile | null = null,
): Handler<ConfigFile | null> {
    // names就是可能的配置文件列表
  const configs = yield* gensync.all(
    names.map(filename =>
      readConfig(path.join(dirname, filename), envName, caller),
    ),
  );
  const config = configs.reduce((previousConfig: ConfigFile | null, config) => {
    if (config && previousConfig) {
      // 配置文件只能存在一个，否则将报错
      throw new ConfigError(
        `Multiple configuration files found. Please remove one:\n` +
          ` - ${path.basename(previousConfig.filepath)}\n` +
          ` - ${config.filepath}\n` +
          `from ${dirname}`,
      );
    }

    return config || previousConfig;
  }, previousConfig);

  if (config) {
    debug("Found configuration %o from %o.", config.filepath, dirname);
  }
  return config;
}
 ```
 上面就是项目级文件配置文件的加载过程。

## 相对文件配置

1. `babelrc`为true或者不设置，并且`filename`为字符串时，向上查找第一个遇到`package.json`信息`pkgData`;
2. 如果`pkgData`存在，并且允许加载`.babelrc`文件，再根据`pkgData`查找babelrc配置信息。
3. `findRelativeConfig`函数获取最近的`.babelrc`文件信息。

```ts
   // 
  if ((babelrc === true || babelrc === undefined) && typeof context.filename === "string") {
    const pkgData = yield* findPackageData(context.filename);

    if (
      pkgData &&
      babelrcLoadEnabled(context, pkgData, babelrcRoots, babelrcRootsDirectory)
    ) {
      ({ ignore: ignoreFile, config: babelrcFile } = yield* findRelativeConfig( // 从文件所有位置找到packageData.directories目录下第一个.babelrc文件，
        pkgData,
        context.envName,
        context.caller,
      ));

      if (ignoreFile) {
        fileChain.files.add(ignoreFile.filepath);
      }

      if (
        ignoreFile &&
        // 如果dirname再ignore中，标识该文件别忽略
        shouldIgnore(context, ignoreFile.ignore, null, ignoreFile.dirname) 
      ) {
        isIgnored = true;
      }

      if (babelrcFile && !isIgnored) {
        const validatedFile = validateBabelrcFile(babelrcFile);
        const babelrcLogger = new ConfigPrinter();
        const result = yield* loadFileChain(
          validatedFile,
          context,
          undefined,
          babelrcLogger,
        );
        if (!result) {
          isIgnored = true;
        } else {
          babelRcReport = yield* babelrcLogger.output();
          // 合并.babelrc的配置
          mergeChain(fileChain, result);
        }
      }

      if (babelrcFile && isIgnored) {
        fileChain.files.add(babelrcFile.filepath);
      }
    }
  }
```

## 参考文档
[babel](https://babeljs.io/docs/config-files)