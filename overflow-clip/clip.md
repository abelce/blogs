# overflow:clip和overflow-clip-margin的介绍


`clip`类似于`hidden`，内容将以元素的边距盒进行裁剪。clip 和 hidden 之间的区别是 clip 关键字禁止所有滚动，包括以编程方式的滚动。该盒子不是一个滚动的容器，并且不会启动新的格式化上下文。而`hidden`是一个滚动的容器，可以通过js来操控元素的滚动。

下面是一个在线例子：

<iframe src="https://codesandbox.io/embed/overflow-clip-qyggs2?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="overflow:clip"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

可以看出`clip`和`hidden`的表现基本相似，都对元素进行了裁剪。

下面分别设置`x`和`y`方向上的`clip`

<iframe src="https://codesandbox.io/embed/overflow-clip-x-y-ccnrvz?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="overflow:clip-x/y"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

从例子中可以看到，设置
```css
.clip-x {
  overflow-x: clip;
  overflow-y: visible;
}

```
只裁剪了`x`方向，`y`方向正常显示。


由于`clip`是禁止所有滚动，下面对比一下和`hidden`的区别。
<iframe src="https://codesandbox.io/embed/overflow-clip-scroll-j6vd93?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="overflow:clip-scroll"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>
通过设置`scrollTop`的值：

```javascript
const hidden = document.querySelector(".hidden");
const clip = document.querySelector(".clip");

hidden.scrollTop = 300;
clip.scrollTop = 300;

```

可以看到`hidden`还是发生了滚动，`clip`没有任何变化。


兼容性问题：
![](https://file.vwood.xyz/2023/08/24/WX20230824-114050.png)
主流浏览器都支持该属性，可以放心使用

## overflow-clip-margin
该属性规定了`overflow:clip`在裁剪时之前可以在其边缘绘制多远。该属性定义的边界称为框的溢出边缘。

下面`overflow-clip-margin:20px`，文本在溢出`box`20px处才被裁剪。
<iframe src="https://codesandbox.io/embed/overflow-clip-margin-lnr8k9?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="overflow:clip-margin"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

兼容性：
![](https://file.vwood.xyz/2023/08/24/WX20230824-113801.png)
目前Safari还不支持