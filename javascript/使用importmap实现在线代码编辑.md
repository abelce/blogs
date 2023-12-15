

## importmap




## importmap 作用

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