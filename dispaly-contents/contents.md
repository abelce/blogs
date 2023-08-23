

## 介绍

[MDN](https://developer.mozilla.org/zh-CN/docs/Web/CSS/display)上`display:contents`的介绍如下：
> 这些元素自身不会产生特定的盒子。它们被伪盒子（pseudo-box）和子盒子取代。

就是不会产生任何盒子，会由子元素（包括伪元素）来代替。但是可继承的属性依旧会对子元素产生影响。

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
            color: red;
            padding: 24px;
        }
```
<iframe src="https://codesandbox.io/embed/eager-violet-sprlwk?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="eager-violet-sprlwk"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>


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
            color: red;
            padding: 24px;
        }
```
<iframe src="https://codesandbox.io/embed/frosty-waterfall-8rsv77?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="frosty-waterfall-8rsv77"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

看出第一个例子中子元素上下排列；第二个例子中子元素在同一行，也就是说`flex`布局作用到到子元素。同时第一个元素的边框也没有显示出来。所以设置`display:contents`的元素不会参与布局，但是可继承属性会被子元素继承，比如上面的`color`属性，但是`padding`属性就无效了。


## 作用
通过上面的例子可以看出`display:contents`主要用于不需要参与布局的场景，比如`color`不能直接设置在子组件上，就可以通过再添加一层元素，这样既不用影响布局，也不用修改子组件。
```html
<div style="display:contents;">
  <item>你好</item>
</div>
```

## 兼容性

https://caniuse.com/?search=display%3Acontents