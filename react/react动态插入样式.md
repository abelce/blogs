在开发组件过程中，偶尔需要动态的插入css，比如在在iframe中渲染组件后，iframe中是没有样式的，所以需要手动插入样式。

## 插入样式

通常是在useLayoutEffect中动态创建`style`标签

```ts
  useLayoutEffect(() => {
    if (!ref.current) {
      const style = document.createElement('style');
      document.head.append(style);
      ref.current = style;
    }
    ref.current.innerText = css;

    return () => {
      if (ref.current) {
        document.head.removeChild(ref.current);
        ref.current = undefined;
      }
    };
  }, [css]);
```

## useStyle

[useStyle](https://let-hooks.vwood.xyz/hooks/use-style)使用一个动态插入style的hook，将上面的代码进行了封装，方便使用。
