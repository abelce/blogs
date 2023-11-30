iconfont 可以让我们轻松使用字体图标，比如使用 iconfont 提供的 js，就可以愉快的码代码了。

```html
//at.alicdn.com/t/c/font_xxxxx.js
```

通常公司会有提供一套图标供所有系统使用，比如图标库里有 1000 个图标，但某个项目只需要使用 10 个，但 js 文件包含了所有的图标，就有点浪费网络资源了。比如下面只用了第一行的图标，其他的都不需要。

![](https://file.vwood.xyz/2023/11/30/upload_fxl1cr4dovd9o061u4kesn0huu3eh95v.png)

另一种场景是组件库，组件库引入了 iconfont 的 js 文件，加在了全部图标，这对于组件库来说是不能接受的；
当然可以手动将需要的图标一个一个放到组件库中，这样不止费劲后，还容易出错。

所以可不可以将图标自动提取出来，然后按需引入。

## 图标提取实现

先来看看 js 文件里图标是怎样存在的，可以看到所有的图标都放在一个`svg`里面，每个图标由`symbol`包裹起来，并且都有`id`属性，咱们就可以根据这些信息将图标从字符串里弄出来。

![](https://file.vwood.xyz/2023/11/30/upload_j06zx65jmsv8xiet50bfxefv5eop03m5.png)

所以，正则表达式可以这么写:

```js
const svgReg = /<symbol[^>]*>(<path[^<]*><\/path>)+<\/symbol>/gi;
```

然后遍历提取出来的`symbol`，转成`svg`即可，`id`可以作为图标的名称。

将 iconfont 的 js 文件字符串传递进`createSVGFromSymbol`，替换掉`symbol`、`id`、`fill`等属性。

```js
const createSVGFromSymbol = (str) => {
  // 提取图标
  const symbolList = str.match(svgReg);

  const svgList: Array<string[]> = [];
  symbolList.forEach((sym: string) => {
    const svg = sym
      // 替换开始标签
      .replace(/^<symbol/, `<svg xmlns="http://www.w3.org/2000/svg" `)
      // 结束标签
      .replace(/<\/symbol>$/, "</svg>")
      // 删除 id
      .replace(/ id="(.*?)" /, "")
      // 删除 fill属性
      .replace(/ fill="(.*?)"/g, "");
  });
  return svgList;
};
```

比如这个图标代码:

```html
<symbol id="icon-close" viewBox="0 0 1024 1024">
  <path
    d="M557.312 513.248l265.28-263.904c12.544-12.48 12.608-32.704 0.128-45.248-12.512-12.576-32.704-12.608-45.248-0.128l-265.344 263.936-263.04-263.84C236.64 191.584 216.384 191.52 203.84 204 191.328 216.48 191.296 236.736 203.776 249.28l262.976 263.776L201.6 776.8c-12.544 12.48-12.608 32.704-0.128 45.248 6.24 6.272 14.464 9.44 22.688 9.44 8.16 0 16.32-3.104 22.56-9.312l265.216-263.808 265.44 266.24c6.24 6.272 14.432 9.408 22.656 9.408 8.192 0 16.352-3.136 22.592-9.344 12.512-12.48 12.544-32.704 0.064-45.248L557.312 513.248z"
  >
  </path>
</symbol>
```

转换之后就是这样子了

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <path
    d="M557.312 513.248l265.28-263.904c12.544-12.48 12.608-32.704 0.128-45.248-12.512-12.576-32.704-12.608-45.248-0.128l-265.344 263.936-263.04-263.84C236.64 191.584 216.384 191.52 203.84 204 191.328 216.48 191.296 236.736 203.776 249.28l262.976 263.776L201.6 776.8c-12.544 12.48-12.608 32.704-0.128 45.248 6.24 6.272 14.464 9.44 22.688 9.44 8.16 0 16.32-3.104 22.56-9.312l265.216-263.808 265.44 266.24c6.24 6.272 14.432 9.408 22.656 9.408 8.192 0 16.352-3.136 22.592-9.344 12.512-12.48 12.544-32.704 0.064-45.248L557.312 513.248z"
  ></path>
</svg>
```

同时可以将`id`提取出来，作为保存 svg 文件时的文件名，所以代码就变成下面的样子了。

```js

// 将空格/- 去掉，转换成驼峰
const processSvgName = (name = ''): string[] => {
  return name
    // 替换-_
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .filter((str) => !!str)
    .map((item) => item.toLowerCase())
    // 转换成驼峰
    .map((str: string) => {
      if (str.length > 1) {
        return str[0].toUpperCase() + str.slice(1);
      }
      return str[0].toUpperCase();
    })
    .join('')
};

const createSVGFromSymbol = (prefix: string, str: string): Array<string[]> => {
  const symbolList = str.match(svgReg);
  if (symbolList) {
    const svgList: Array<string[]> = [];
    symbolList.forEach((sym: string) => {
      const idMatchResult = sym.match(/ id="(.*?)" /);
      if (idMatchResult && idMatchResult.length >= 2) {
        const svgNameArr = processSvgName(
          idMatchResult[1].replace('icon-', ''),
        );
        svgList.push([
          svgNameArr,
          sym
            .replace(/^<symbol/, `<svg xmlns="http://www.w3.org/2000/svg" `)
            .replace(/<\/symbol>$/, '</svg>')
            // remove id
            .replace(/ id="(.*?)" /, ''),
             // remove fill attribute
            .replace(/ fill="(.*?)"/g, '')
        ]);
      }
    });
    return svgList;
  }
  return [];
};
```

这样所有的图标都提取出来了。

当然可以根据业务的需要再转换成对应的组件，比如我平时主要使用`React`开发，就可以同时生成对应的`React`组件，一个图标库就搞定了。
每次图标需要更新时运行脚本就即可，剩下的时间才能摸鱼。

当然我做了一个 npm 包[iconfont-extract](https://www.npmjs.com/package/iconfont-extract)，方便在其他项目中使用。
