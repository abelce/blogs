
typescript已经成为前端日常开发中常用的工具之一，本文结合自己的使用做一下笔记，方便以后查阅。


## Partial
Partial可以将某个类型中定义的属性变成可选的.
下面的定义了`Book`类型，创建实力时如果不设置`id`属性就会提示错误。

```typescript
type Book = {
  id: string;
  name: string;
};

const book1: Book = {
    id: "1",
    name: "book1"
}

// 提示错误: Property 'id' is missing in type '{ name: string; }' but required in type 'Book'.ts(2741)
const book2: Book = {
    name: "book2"
}
```
可以通过`Partial`设置成部分属性

```ts
const book2: Partial<Book> = {
    name: "book2"
}
```

## is
`is`用来指定数据的类型。

下面`isNumber`函数用来判断输入为数字，如果是就用调用`setValue`，但是提示`value`的值可能为`undefined`不能赋值给`number`类型。

```ts
const isNumber = (taregt: unknown): boolean => typeof taregt === "number" && !Number.isNaN(taregt)

  const setValue = (newValue: number) => {
    // ....
  };

const reset = (value?: number) => {
    if (isNumber(value)) {
    // 错误提示: Argument of type 'number | undefined' is not assignable to parameter of type 'number'. Type 'undefined' is not assignable to type 'number'.ts(2345)
      setValue(value);
    }
};
```
`isNumber`函数已经判断value位数字了，但是编译器还是报错，那怎样才能让编译器认为value就是`nmber`，没错`is`可能达到目的。将`isNumber`的返回类型使用`is`指定为`number`.
```ts
const isNumber = (taregt: unknown): taregt is number => typeof taregt === "number" && !Number.isNaN(taregt)
```



## infer
`infer`用来推断数据的类型，typescript可以根据条件来确定类型比如官网的例子:

```ts
interface Animal {
  live(): void;
}
interface Dog extends Animal {
  woof(): void;
}

type Example1 = Dog extends Animal ? number : string;
// type Example1 = number

type Example2 = RegExp extends Animal ? number : string;
// type Example2 = string
```
所以可以根据条件动态确定输入的类型

### 推断函数返回类型
表示如果`T`是一个无参数的函数，则返回`T`函数的返回值，返回返回`T`本身，
```ts
type func = () => number;
type GetReturnType<T> = T extends () => infer R ? R : T;
type FuncReturnType = GetReturnType<func>; // number

type Foo = string;
type StringReturnType = GetReturnType<Foo>; // string
```
可以将上面的`type func = () => number`改成有参数的`type func = (a: string) => number`，可以看返回了`func`函数本身。

### 推断联合类型


```ts
type InferType<T> = T extends {name: infer V, age: infer V} ? V : never;
type Foo1 = InferType<{name: string; age: string}>;// type Foo1 = string
type Foo2 = InferType<{name: string; age: number}>;// type Foo = string | number
```
同理可以推断数组的类型

```ts
type InferType<T> = T extends (infer R)[] ? R : never;
type Foo3 = InferType<[string, number, boolean]>; // type Foo3 = string | number | boolean
```

## Omit

忽略类型的某些属性。


下面的代码提示缺少id、time属性。
```ts
type Book = {
    id: string;
    name: string;
    time: number;
}

const book1: Book = { // Type '{ name: string; }' is missing the following properties from type 'Book': id, timets(2739)
    name: "book1",
}
```

通过`Omit`可以忽略id、time属性，只要name属性
```ts
const book1: Omit<Book, "id" | "time"> = {
    name: "book1",
}
```