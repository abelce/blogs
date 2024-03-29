本文主要讲述babel的配置文件及其加载过程。

babel在解析文件前会先加载配置信息，然后根据配置信息对源代码进行处理。

## babel配置文件
babel配置文件[Config Files](https://babeljs.io/docs/config-files)

babel有两种配置文件，可以配合使用，也可以单独使用:

+ 项目范围的配置
  + `babel.config.*` 文件, 具有以下的扩展名: `.json` `.js`, `.cjs`, `.mjs`, `.cts`.
+ 相对文件路径的配置
  + `.babelrc.*` 文件, 具有以下的扩展名: `.json`, `.js`, `.cjs`, `.mjs`, `.cts`
  + `.babelrc` 文件
  + `package.json`文件，其中的key为`babel`


### 项目级配置
+ 在babel7中添加了`root`概念，默认为当前的工作目录，babel会自动的在根目录下搜索`babel.config.json`(或者其他扩展名的文件)，当然用户也可以通过`configFile`指定配置文件。
+ 由于配置文件之间是物理隔离的，所以使用范围非常广泛。甚至允许`plguins`和`presets`轻松应用于`node_modules`或者是符号链接包中的文件
+ 这种配置的缺点是它依赖于工作目录，在monorepos中使用就比较麻烦。

### 相对文件路径的配置
  babel从正在编译的文件`filename`目录开始搜索`.babelrc.json`或者其他等效的文件，该功能允许是为某一部分文件创建独立的配置。这些配置信息会被合并到项目级的配置中。

使用文件相关配置时需要考虑一些边缘情况:
+ 搜索范围是从`filename`所在目录向上直到找到最近的一个`.babelrc.json`文件或者遇到`package.json`就停止，因此相对配置仅适用于单个package.
+ `filename`的路径必须在[`babelrcRoots`](https://babeljs.io/docs/options#babelrcroots)内，否则搜索将会直接跳过。

注意事项：
+ `.babelrc.json`仅适用于自己包之内的文件
+ 除非您选择使用`babelrcRoots`，否则将忽略不是 Babel 'root' 的包中的 `.babelrc.json` 文件.


## babel options
这里介绍几个配置选项，更多选项参考官网[Config Options](https://babeljs.io/docs/options)
+ [root](https://babeljs.io/docs/options#root): 默认值`process.cwd`，用来确定当前babel的根目录
+ [rootMode](https://babeljs.io/docs/options#rootMode): 默认值为`"root"`，可选值为`"root"`、`"upward"`、`"upward-optional"`
  该选项会与`root`值相结合，定义了babal如何选择其根目录。
  + `"root"`: 将`"root"`值原样传递
  + `"upward"`: 从`"root"`目录向上查找包含`babel.config.json`的文件目录，如果找不到就报错
  + `"upward-optional"`: 从`"root"`目录向上查找包含`babel.config.json`的文件目录，如果找不到就使用`root`值作为babel的根目录。
+ babelrc: 默认`true`，为`true`时允许搜索加载babelrc文件，当且仅当编译的文件在`"babelrcRoots"`提供的包之内时才会加载babelrc文件
+ babelrcRoots: 默认值为`root`值，babel默认只能加载项目根目录下的babelrc，如果需要使用子包的babelrc可以在该选项中设置。
+ configFile： 默认值`path.resolve(opts.root, "babel.config.json")`，默认搜索项目根目录下的`babel.config.json`文件。设置为`false`时不会加载`babel.config.json`文件，不推荐设置为babelrc的路径，因为babelrc本来就会被加载一次。

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
3. 在`buildRootChain`中加载配置，如果指定了`configFile`就通过`loadConfig`加载，否则`opts.configFile !== false`时就自动搜索，依次调用`findRootConfig` --> `loadOneConfig`， `loadOneConfig`中会查找可能得扩展名文件(`.json` `.js`, `.cjs`, `.mjs`, `.cts`)

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
loadOneConfig源码如下，`babel.config.*`文件只能存在一个，否则提示报错。
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
项目级配置文件加载完成后就加载`.babelrc`文件。

1. `babelrc`为true或者不设置，并且`filename`为字符串时，向上查找第一个遇到的`package.json`，得到`pkgData`;
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

获取到相对文件配置后会与项目配置进行合并，这样`filename`文件编译过程的配置信息就全部加载完成了，在后续的过程中会对配置信息进行校验和合并等一系列操作后才会开始源代码的解析。

## 总结
babel的配置文件在通常情况下配置一种即可正常使用，在monorepos项目中根据子包情况对配置文件进行分割。

## 参考文档
[babel](https://babeljs.io/docs/config-files)