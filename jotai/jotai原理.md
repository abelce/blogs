
## 介绍
[Jotai](https://jotai.org/docs/introduction)是一种原子化的状态管理方案。采用的 `Atom` + `hook` + `Context`的方式来解决React的数据管理。

当`Atom`更新的时候不会触发Context的更新，只会更新订阅了`Atom`的组件。

Jotai 有一个非常小的 API，并且是面向 TypeScript 的。 它与 React 的集成 useState hook 一样简单易用，但所有状态都是全局可访问的，派生状态易于实现，并且自动消除了额外的重新渲染

同时还提供了`jotai/utils`，这些函数增加了对在 localStorage（或 URL 哈希）中保留原子状态、在服务器端渲染期间混合原子状态、创建具有 set 函数（包括类似 Redux 的 reducers 和 action 类型）的原子等等的支持！

特征:
  + 核心API只有2KB
  + 很多的实用工具和集成
  + 对TypeScript友好
  + 适用于 Next.js、Gatsby、Remix 和 React Native
  + 使用 SWC 和 Babel 插件响应快速刷新

本文基于jotai v2.2.1版本。

## 使用

[例子](https://github.com/pmndrs/jotai/tree/main/examples)

#### 创建atom

```ts
import { atom } from 'jotai'

const countAtom = atom(0)
```

在组件中使用
```tsx
import { useAtom } from 'jotai'

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  return (
    <h1>
      {count}
      <button onClick={() => setCount((c) => c + 1)}>add</button>
    </h1>
    )
}
```

#### 衍生atom

```tsx
const doubledCountAtom = atom((get) => get(countAtom) * 2)

function DoubleCounter() {
  const [doubledCount] = useAtom(doubledCountAtom)
  return <h2>{doubledCount}</h2>
}
```
从多个atom衍生

```ts
const count1 = atom(1)
const count2 = atom(2)
const count3 = atom(3)

const sum = atom((get) => get(count1) + get(count2) + get(count3))
```

#### 可读可写atom
默认atom就是可读可写的

```ts
const decrementCountAtom = atom(
  (get) => get(countAtom),
  (get, set, _arg) => set(countAtom, get(countAtom) - 1)
)
```

#### 只读atom

```ts
const readOnlyAtom = atom((get) => get(countAtom) * 2)
```

#### 只写atom

```ts
const multiplyCountAtom = atom(null, (get, set, by) =>
  set(countAtom, get(countAtom) * by)
)
```

#### useAtomValue
获取atom的值
```ts
const count = useAtomValue(countAtom)
```

#### useSetAtom
设置atom的值
```ts
const setCount = useSetAtom(countAtom)
```

## 工具函数
Jotai提供了一些使用的工具函数，方便业务使用。
### 本地存储 [atomWithStorage](https://jotai.org/docs/utilities/storage)
支持将数据持久化到本地

[在线例子](https://codesandbox.io/s/jotai-persistence-vuwi7?from-embed=&file=/src/app.js:181-196)

### 缓存 [atomFamily](https://jotai.org/docs/utilities/family)
使用atomFamily复用已存在的atom 

### 数组 [splitAtom](https://jotai.org/docs/utilities/split)
对数据项自动进行atom包装，同时提供了`remove`、`insert`和`move`操作

## atom
atom函数用于创建atom配置，紧紧只是一个配置对象，不保存atom的值(原始atom会将默认值保存在init中)，atom对象是不可变的，值保存在store中，通过`store.get`获取

```ts
const countAtom = atom(10);
```

atom源码:

```ts
export function atom<Value, Args extends unknown[], Result>(
  read: Value | Read<Value, SetAtom<Args, Result>>,
  write?: Write<Args, Result>
) {
  // atom的key，可以在React中作为组件的key使用
  const key = `atom${++keyCount}`
  const config = {
    toString: () => key,
  }
  if (typeof read === 'function') {
    // read是函数表示是一个衍生的atom
    config.read = read
  } else {
    // read为非函数类型
    config.init = read
    config.read = (get) => get(config)
    // 设置默认的write，设置当前atom的值
    config.write = ((get: Getter, set: Setter, arg: SetStateAction<Value>) =>
      set(config, typeof arg === 'function' ? arg(get(config)) : arg))
  }
  if (write) {
    // 覆盖默认的write
    config.write = write
  }
  return config
}

```
上面的代码可以看出atom的一些特征：
1. 每个atom都有一个唯一的`key`，并重写了config的toString方法（可以直接在React组件中将atom作为key使用）。
2. read参数不为函数时，设置默认的read=(get) => get(config)读取atom自身的值。
3. atom默认的`write`函数是修改自身的值，所以原始atom是可读可写的，衍生的atom没有没有默认write方法。
4. 原始atom的初始值保存在`init`中，并且不能修改。


## useAtom

useAtom使用atom与store结合起来的桥梁,使用 `useAtomValue`读取值、`useSetAtom`设置atom的值
![upload_tilhjximg25aw5dm3pdm4zzl6o9302ye.webp](https://raw.githubusercontent.com/abelce/blogs/master/jotai/upload_tilhjximg25aw5dm3pdm4zzl6o9302ye.webp)


useAtomValue代码如下：

```ts
export function useAtomValue<Value>(atom: Atom<Value>, options?: Options) {
  const store = useStore(options)
  
  const [[valueFromReducer, storeFromReducer, atomFromReducer], rerender] = useReducer(
      (prev) => {
        const nextValue = store.get(atom)
        if (
          Object.is(prev[0], nextValue) &&
          prev[1] === store &&
          prev[2] === atom
        ) {
          // 如果前后两次value、store、atom都一样，返回上一次修改的值
          return prev
        }
        return [nextValue, store, atom]
      },
      undefined,
      () => [store.get(atom), store, atom]
    )

  let value = valueFromReducer
  if (storeFromReducer !== store || atomFromReducer !== atom) {
    // store或者atom不一致时重新计算值
    rerender()
    value = store.get(atom)
  }

  const delay = options?.delay
  useEffect(() => {
    // 订阅后每次修改都会触发该函数，从而调用useReducer的dispatch来更新react组件
    const unsub = store.sub(atom, () => {
      // xxxx
      rerender()
    })
    rerender()
    return unsub
  }, [store, atom, delay])

  // xxxx
  return isPromiseLike(value) ? use(value) : (value as Awaited<Value>)
}

```

useReducer返回的结果就是 `[[value, store, atom], rerender]`，其中value为atom的值，store为atom所属的store，rerender是useReducer的dispatch函数(每次value发生改变就会执行rerender来更新组件的值)。

useEffect通过`store.sub`订阅了atom，当atom的状态更改时触发，然后执行rerender来更新组件的值。`store.sub`返回取消订阅函数，组件卸载时取消订阅。

可以看出  `useAtomValue` 主要干了两件事：

1. 比较reducer和sore中的值，一致就返回reducer的值，否则返回store中的值
2. 订阅store中atom的状态，来触发reducer的执行。


useSetAtom的源码:
```ts
export function useSetAtom<Value, Args extends any[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  options?: Options
) {
  const store = useStore(options)
  const setAtom = useCallback(
    (...args: Args) => {
      // xxx 
      return store.set(atom, ...args)
    },
    [store, atom]
  )
  return setAtom
}

```
通过`store.set`设置atom的值。


## store
store用于保存atom的value，以及atom之间的依赖关系，在Jotai中store是可以通过存在多个，如果没有设置store，会创建一个默认的store。
store有三个常用的方法：

+ get: 获取atom的值，上面 `useAtomValue` 中使用过
+ set：设置值，useSetAtom使用来更新atom
+ sub：订阅atom，atom状态更新时调用
![upload_fjkayvw2bab4ud43pxtj6z710plmljg9.png](https://raw.githubusercontent.com/abelce/blogs/master/jotai/upload_fjkayvw2bab4ud43pxtj6z710plmljg9.webp)


store中atom的依赖关系，atomB可以通过atomA衍生而来，当atomA发生变化时，atomB会自动更新，如下:

```ts
const atomA = atom(10);
const atomB = atom((get) => get(atomA)); // atomA更新时atomB会自动更新
// xxxx
store.get(atomA)
store.get(atomB);
store.set(atomA, 20); // 更新数据
```

store中维护了 atomA与atomB之间的依赖关系：

+ dependency: atomB依赖atomA，atomA是atomB的dependency，维护在atomB的state上(atomState.d中)，原始atom的dependency中有存在atom自身
+ dependent: atomB依赖atomA，atomB是atomA的dependent中，位置在mounted中（mounted.t中）

通过上面的关系，atomA更新时能找到atomB，从而更新atomB的状态。

atom state结构:

```ts
type AtomState<Value = AnyValue> = {
  d: Dependencies
} & ({ e: AnyError } | { v: Value })
```

+ d是维护atom的dependency，`type Dependencies = Map<AnyAtom, AtomState>`
+ e: 错误信息
+ v: atom的值

Mounted结构，只有在设置atom的值后，才会将
```ts
type Mounted = {
  /** The list of subscriber functions. */
  l: Listeners
  /** Atoms that depend on *this* atom. Used to fan out invalidation. */
  t: Dependents
  /** Function to run when the atom is unmounted. */
  u?: OnUnmount
}

```

+ l: atom的监听函数，useAtomValue中通过store.sub订阅的函数存放在这里
+ t: 维护上面提到的dependent



### store.get


```ts
  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(atom))
```

查找atom的state，并从state中读取value，returnAtomValue:

```ts
const returnAtomValue = <Value>(atomState: AtomState<Value>): Value => {
  // xxxx
  return atomState.v
}
```

readAtomState源码:

```ts
const readAtomState = <Value>(atom: Atom<Value>): AtomState<Value> => {
    // 从atomStateMap获取atom的state
    const atomState = getAtomState(atom)
    if (atomState) {
      atomState.d.forEach((_, a) => {
        if (a !== atom && !mountedMap.has(a)) {
          // 计算依赖的atomState
          readAtomState(a)
        }
      })
      // 如果所依赖的所有atom和对应的state没有变化，就直接返回map中的state
      if (Array.from(atomState.d).every(
          ([a, s]) => a === atom || getAtomState(a) === s
        )) {
        return atomState
      }
    }
    // Compute a new state for this atom.
    const nextDependencies: NextDependencies = new Map()
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      if ((a as AnyAtom) === atom) {
        // 如果依赖的是atom本身，
        const aState = getAtomState(a)
        // 先在atomStateMap上查找state
        if (aState) {
          nextDependencies.set(a, aState)
          return returnAtomValue(aState)
        }
        // 如果stateMap上没有数据，就返回init
        if (hasInitialValue(a)) {
          nextDependencies.set(a, undefined)
          return a.init
        }
        // NOTE invalid derived atoms can reach here
        throw new Error('no atom init')
      }
      // a !== atom
      const aState = readAtomState(a)
      // 设置依赖
      nextDependencies.set(a, aState)
      // 返回a的value
      return returnAtomValue(aState)
    }
    // xxxxxxxx
    try {
      // 调用read函数，收集依赖和获取value
      const valueOrPromise = atom.read(getter, options as any)
      return setAtomValueOrPromise(atom, valueOrPromise, nextDependencies, () =>
        controller?.abort()
      )
    } catch (error) {
      return setAtomError(atom, error, nextDependencies)
    } finally {
      isSync = false
    }
  }

```

1. 如果atomState存在，就遍历atomState.d并获取没有mount的依赖，最后判断每个依赖的state和其最新的state是否相等，相等就表示当前的atom的依赖都没发生变化，所以atomState也没变，返回atomState即可。

2. atomState不存在，执行 atom.read 获取value，同时通过nextDependencies收集依赖

  1. 如果getter的参数 a=== atom，表示依赖atom本身， 创建atom的时候read不是function，使用默认的read函数![77280644fdf69943e13f1dac211f69a9.png](https://raw.githubusercontent.com/abelce/blogs/master/jotai/77280644fdf69943e13f1dac211f69a9.png)

  2. a !== atom时，获取依赖a的state并起value

3. 调用 `setAtomValueOrPromise(atom, valueOrPromise, nextDependencies, () =>controller?.abort())`，设置atom的value和dependencies。

setAtomValueOrPromise中调用setAtomValue

```ts
  const setAtomValueOrPromise = <Value>(
    atom: Atom<Value>,
    valueOrPromise: Value,
    nextDependencies?: NextDependencies,
    abortPromise?: () => void
  ): AtomState<Value> => {
    // .........
    // 设置atom的value
    return setAtomValue(atom, valueOrPromise, nextDependencies)
  }
```

继续看setAtomValue

```ts
  const setAtomValue = <Value>(
    atom: Atom<Value>,
    value: Value,
    nextDependencies?: NextDependencies
  ): AtomState<Value> => {
    const prevAtomState = getAtomState(atom)
    const nextAtomState: AtomState<Value> = {
      d: prevAtomState?.d || new Map(),
      v: value,
    }
    if (nextDependencies) {
      updateDependencies(atom, nextAtomState, nextDependencies)
    }
    if (
      prevAtomState &&
      isEqualAtomValue(prevAtomState, nextAtomState) &&
      prevAtomState.d === nextAtomState.d
    ) {
      // 如果v和d都相等，直接返回以前的state
      // bail out
      return prevAtomState
    }
    if (
      prevAtomState &&
      hasPromiseAtomValue(prevAtomState) &&
      hasPromiseAtomValue(nextAtomState) &&
      isEqualPromiseAtomValue(prevAtomState, nextAtomState)
    ) {
      if (prevAtomState.d === nextAtomState.d) {
        // bail out
        return prevAtomState
      } else {
        // restore the wrapped promise
        nextAtomState.v = prevAtomState.v
      }
    }
    // 设置新的state
    setAtomState(atom, nextAtomState)
    return nextAtomState
  }

```

没有就会创建新的state对象nextAtomState，依赖`d`默认使用旧的`prevAtomState?.d || new Map()`，使用nextDependencies更新依赖

```ts
 const nextAtomState: AtomState<Value> = {
      d: prevAtomState?.d || new Map(),
      v: value,
    }
    if (nextDependencies) {
      updateDependencies(atom, nextAtomState, nextDependencies)
    }
```

下一步比较 prevAtomState 和 nextAtomState，如果`v`和`d`都相等，返回 prevAtomState ，否则调用setAtomState更新atomState

setAtomState会将atom的prevAtomState放在pendingMap中，



### store.set

set过程分为两部分：

1. 修改atomState
2. 通过pendingMap刷新依赖中的`t`(dependent)数据，通过触发通过`store.sub`的订阅函数


writeAtomState函数：

```ts
  const writeAtomState = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => returnAtomValue(readAtomState(a))
    const setter: Setter = <V, As extends unknown[], R>( a: WritableAtom<V, As, R>, ...args: As ) => {
      let r: R | undefined
      // 如果修改atom自身的值
      if ((a as AnyWritableAtom) === atom) {
        // ......
        const prevAtomState = getAtomState(a)
        // 设置新的value
        const nextAtomState = setAtomValueOrPromise(a, args[0] as V)// 跟store.get过程中一样
        if (!prevAtomState || !isEqualAtomValue(prevAtomState, nextAtomState)) {
           // value不相等，重新计算dependents
          recomputeDependents(a)
        }
      } else {
        // 修改依赖的atom，一直递归到最顶层的原始atom
        r = writeAtomState(a as AnyWritableAtom, ...args) as R
      }
      // 如果atom.write是异步函数
      if (!isSync) {
        // 刷新pendingMap，重新设置mountedMap中的mounted的t数据
        const flushed = flushPending()
        // ......
      }
      return r as R
    }
    const result = atom.write(getter, setter, ...args)
    isSync = false
    return result
  }
```

如果更新atom自身，直接通过setAtomValueOrPromise设置新值，然后等信atom的dependent；否则递归调用writeAtomState直到依赖项是原始atom，原始atom更新时就会更新dependent。

flushPending函数：
```typescript

  const flushPending = (): void | Set<AnyAtom> => {
    let flushed: Set<AnyAtom>
    if (import.meta.env?.MODE !== 'production') {
      flushed = new Set()
    }
    while (pendingMap.size) {
      const pending = Array.from(pendingMap)
      pendingMap.clear()
      pending.forEach(([atom, prevAtomState]) => {
        const atomState = getAtomState(atom)
        if (atomState) {
          if (atomState.d !== prevAtomState?.d) {
            // 如果依赖不一致，更新依赖
            mountDependencies(atom, atomState, prevAtomState?.d)
          }
          const mounted = mountedMap.get(atom)
          if (
            mounted &&
            !(
              // TODO This seems pretty hacky. Hope to fix it.
              // Maybe we could `mountDependencies` in `setAtomState`?
              (
                prevAtomState &&
                !hasPromiseAtomValue(prevAtomState) &&
                (isEqualAtomValue(prevAtomState, atomState) ||
                  isEqualAtomError(prevAtomState, atomState))
              )
            )
          ) {
            // 前后两次state不一致时，触发监听函数（store.sub订阅的回调），调用set方法，组件更新就是这里触发的
            mounted.l.forEach((listener) => listener())
            // xxxx
          }
        } else if (import.meta.env?.MODE !== 'production') {
          // xxx
        }
      })
    }
    // xxx
  }
```

从中可以看到，依赖发生变化时调用`mountDependencies`函数更新mounted中的`t`，先从dependents中删除atom，然后将新的atom添加到对应的dependents中。
`mountDependencies`执行后，通过`isEqualAtomValue`比较atom的值，如果发生变化就触发监听函数`mounted.l.forEach((listener) => listener())`，listener是通过`store.sub`添加，在`useAtomValue`就是通过`store.sub `来触发组件更新。

```typescript
  const mountDependencies = <Value>(
    atom: Atom<Value>,
    atomState: AtomState<Value>,
    prevDependencies?: Dependencies
  ): void => {
    const depSet = new Set(atomState.d.keys())
    prevDependencies?.forEach((_, a) => {
      if (depSet.has(a)) {
        // not changed
        depSet.delete(a)
        return
      }
      const mounted = mountedMap.get(a)
      if (mounted) {
        // 从被依赖项中的dependent中删除atom，表示不依赖了
        mounted.t.delete(atom) // delete from dependents
        if (canUnmountAtom(a, mounted)) {
          unmountAtom(a)
        }
      }
    })
    // 在新的依赖项中添加dependent
    depSet.forEach((a) => {
      const mounted = mountedMap.get(a)
      if (mounted) {
        mounted.t.add(atom) // add to dependents
      } else if (mountedMap.has(atom)) {
         // xxx
        // 如果a是第一次被依赖，添加新的mounted对象
        mountAtom(a, atom)
      }
    })
  }
```
