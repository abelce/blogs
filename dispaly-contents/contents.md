display在css布局中经常使用到，但是`display:contents`却很少见.

## 介绍

[MDN](https://developer.mozilla.org/zh-CN/docs/Web/CSS/display)上`display:contents`的介绍如下：
> 这些元素自身不会产生特定的盒子。它们被伪盒子（pseudo-box）和子盒子取代。请注意，CSS Display Level 3 规范中定义了 contents 值如何影响“异常元素”——这些元素不是纯粹由 CSS 盒模型概念呈现的（例如替换元素）。

意思就是不会产生任何盒子，子元素会正常的展示。但是可继承的属性依旧会对子元素产生影响。

下面有一段html，分别用不包含`display:contents`和包含`display:contents`来比较其中的差异：
```html
    <div class="container">
        <div class="main">
            <div class="left">left</div>
            <div class="right">right</div>
        </div>
    </div>
```

不使用`display:contents`:
```css
        .container {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
        }

        .main {
            border: 2px solid red;
        }
```


使用`display:contents`:
```css

        .container {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
        }

        .main {
            display: contents;
            border: 2px solid red;
        }
```

看出第一个例子中子元素上下排列；第二个例子中子元素在同一行，也就是说`flex`布局作用到到子元素。同时第一个元素的边框也没有显示出来。
所以设置`display:contents`的元素不会被渲染出来


可继承属性：
在main类上添加color属性：

```css
    .main {
        display: contents;
        border: 2px solid red;
        color: red;
    }
```
可以看到子元素的颜色变成了红色，所以`display:contents`元素的可继承属性会被子元素继承。
在线例子。



## 作用


## 与fragment的区别
属性是否可以继承


元素是否显示在dom中


## 兼容性

https://caniuse.com/?search=display%3Acontents