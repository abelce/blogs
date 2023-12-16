

在ES module中可以通过`import`来引入模块，通过相对或者绝对路径加载.
```js
import lodash from "https://esm.sh/lodash";
```

可当使用webpack等打包工具时明知需要使用 `import lodash from "lodash"`的方式就能加载对应的文件，这些工具通过nodejs在构建时映射到特定的文件，就能解决模块自动加问题。

所以在浏览器中要只要解决了映射问题，就可以使用相同的方式引入模块。


## importmap

在`<script>`中指定type为`importmap`，再通过JSON对象指定所有模块的映射，
```html
<script type="importmap">
{
  "imports": {
    "lodash": "https://esm.sh/lodash",
  }
}
</script>
<script type="module">
  import lodash from 'lodash';

 console.log(lodash.sortBy([3, 2, 1]))
</script>
```
映射的值必须是`./`、`../`、 `/`或者绝对URL。同时`imports`中的包并不一定会加载，只有在其他文件中使用了的包才会加载，未被其他脚本使用的包不会加载。


#### scopes
`imports`指定的映射是全局的，当某些文件需要老版本的`lodash`时， 通过`scopes`来指定。这里指定`/v1/`路径下的文件使用`3.0.0`版本。

```html
<script type="importmap">
{
  "imports": {
    "lodash": "https://esm.sh/lodash",
  },
  "scopes": {
    "/v1/": {
         "lodash": "https://esm.sh/lodash@3.0.0",
    }
  }
}
</script>
```

## importmap兼容性

目前主流的浏览器除了IE都支持，所以可以放心使用。

![](http://file.vwood.xyz/2023/12/15/upload_t6qde87qqpmu7m4onbckhhhb08oc4gir.png)

## 如何用importmap实现代码加载
通过上面的介绍，要实现一个简易的在线代码编辑，同时能引入各种资源包就比较容易了。

如下react代码，通过import引入`react`、`react-dom`，由于没有提前加载，代码会直接报错
```jsx
import React from "react";
import ReactDOM from "react-dom";


const App = () => {
    return <div>hello</div>
}

ReactDOM.render(<App />, document.getElementById("app"));
```

所以使用`importmap`提前导入即可。

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react",
    "react-dom": "https://esm.sh/react-dom"
  }
}
</script>
```

但是如果要使用其他的模块，比如`lodash`，那就需要提前手动导入，所以局限性很大。

在线编辑`react`，由于使用`jsx`语法，所以使用了`@babel/standalone`，在线转换`jsx`。由于`babel`会先将代码生成`ast`，所以可以编写一个`plugin`来收集代码中的`import`数据。
将自定义`collectImportPlugin`注册到babel上，编译时收集依赖。
```js
import * as Babel from "@babel/standalone";
let scriptImports = [];

export const collectImportPlugin = () => {
  return {
    visitor: {
      ImportDeclaration(path) {
        scriptImports.push(path.node.source.value);
      },
    },
  };
};

Babel.registerPlugin("collectImportPlugin", collectImportPlugin);
```
上面的插件收集的结果为`["react", "react-dom"]`，如果同时依赖`lodash`,结果就是`["react", "react-dom", "lodash"]`

因为`https://esm.sh`上我们日常使用的包都能获取到，所以这里直接从`https://esm.sh`加载数据。拼接后就是上面的`importmap`代码:
```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react",
    "react-dom": "https://esm.sh/react-dom",
    "lodash": "https://esm.sh/lodash"
  }
}
</script>
```


预览效果：

<iframe height="300" width="100%" style="width:100%;border:none;" scrolling="no" 
src="https://vwood.xyz/tiny-code/embed/2095903a-a970-4084-b4cd-642afc042b3c" 
frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true">
</iframe>