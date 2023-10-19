1. react diff的原因
2. diff的步骤
3. 总结，怎么提高性能


react中维护了两个fiber链表，当前UI显示的为current，react每次渲染时都会尽可能的复用以前的fiber，只更新有差异的地方，从而达到提高渲染性能的目的。

本文只介绍数组的diff过程。

## 数组diff

数组存在的几种情况： 添加元素、移动元素、删除元素；
react主要通过key、type来
1. key相同
   1. type相同， 复用fiber
   2. type不同，创建fiber，删除老的fiber
2. key不用，创建fiber，删除老fiber 

数组的diff在函数`reconcileChildrenArray`中，过程如下：
1. 比较数组相同索引的元素，从第一个元素开始比较新老节点，
  1. 如果key相同，
      1. type相同，复用fiber
      2. type不同，创建fiber
  2. key不同，结束比较。   
3. 如果新的节点已处理完，表示还有老节点存在，则删除剩余的老节点
4. 如果是老的fiber处理完了，表示新的节点还有剩余，创建新的fiber
5. 如果新老节点都有剩余，则将剩余的老fiber通过key/index来创建一个map，遍历剩余的新fiber，能找到就复用，否则创建新的fiber，最后删除未复用的节点。

### 通过索引比较

```js
// 结果的第一个fiber
let resultingFirstChild: Fiber | null = null;
// 上一个fiber
let previousNewFiber: Fiber | null = null;

let oldFiber = currentFirstChild;
// 复用到的index的位置 lastPlacedIndex = max(newIdex, lastPlacedIndex)
let lastPlacedIndex = 0;
let newIdx = 0;
let nextOldFiber = null;
for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
  if (oldFiber.index > newIdx) { 
    // 老fiber的index比新的大， 说明该位置老的元素无法转化为fiber，导致链表上跳过了该index，比如[ele1, null, ele2]，null不能转为fiber，
    // 所以老fiber的index为 0 -> 2，中间的1被跳过，
    // 要等到 oldFiber.index === newIdx时nextOldFiber才能被赋值为oldFiber.sibling
    nextOldFiber = oldFiber; // 将nextOldFiber指向当前节点，直到新老fiber的index一致
    oldFiber = null;
  } else {
    nextOldFiber = oldFiber.sibling; // 本次循环后的下一次循环的fiber
  }
  // 构造新的fiber
  const newFiber = updateSlot(
    returnFiber,
    oldFiber,
    newChildren[newIdx],
    lanes,
  );
  // 不能复用：key不同，或者newChildren[newIdx]为null
  if (newFiber === null) {
    if (oldFiber === null) {
      oldFiber = nextOldFiber;
    }
    break;
  }
  if (shouldTrackSideEffects) {
    if (oldFiber && newFiber.alternate === null) {
      // 如果新fiber没有复用老fiber，则删除老fiber
      deleteChild(returnFiber, oldFiber);
    }
  }
  // lastPlacedIndex表示访问过的节点在旧集合中最右的位置，
  lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
  if (previousNewFiber === null) {
    resultingFirstChild = newFiber;
  } else {
    // 形成新的链表
    previousNewFiber.sibling = newFiber;
  }
  previousNewFiber = newFiber;
  oldFiber = nextOldFiber;
}
```
在比较时可能出现 `oldFiber.index > newIdx`的情况，是因为有些元素不能转化为fiber，比如null，那么此时`nextOldFiber`就一直等于`oldFiber`直到 oldFiber.index 等于 newIdx时nextOldFiber。
`newFiber === null`时，相同索引处的key不同或者newChildren[newIdx]为null，此时跳出循环。

### 新节点遍历完
```js
if (newIdx === newChildren.length) {
  // 新的节点全部遍历完成，删除剩余的老节点
  deleteRemainingChildren(returnFiber, oldFiber);
  if (getIsHydrating()) {
    const numberOfForks = newIdx;
    pushTreeFork(returnFiber, numberOfForks);
  }
  return resultingFirstChild;
}
```
如果在上一个步骤中，新节点全部处理完，删除剩余的老节点。

### 老节点遍历完

```js
if (oldFiber === null) {
  // 老节点遍历完成，将剩余的新节点直接插入
  for (; newIdx < newChildren.length; newIdx++) {
    // 创建新节点
    const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
    if (newFiber === null) {
      continue;
    }
    // 插入
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
  }
  if (getIsHydrating()) {
    const numberOfForks = newIdx;
    pushTreeFork(returnFiber, numberOfForks);
  }
  return resultingFirstChild;
}
```
老节点处理完，将剩余的根据剩下的元素创建新fiber

### 新老节点都有剩余
```js
  // 老节点、新节点都有剩余，通过key/index生成一个Map
  const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

  // 去map上找旧的节点，进行复用，同时从existingChildren上删除可服用的节点
  for (; newIdx < newChildren.length; newIdx++) {
    // 允许
    const newFiber = updateFromMap(
      existingChildren,
      returnFiber,
      newIdx,
      newChildren[newIdx],
      lanes,
    );
    if (newFiber !== null) {
      if (shouldTrackSideEffects) {
        // 如果
        if (newFiber.alternate !== null) {
          existingChildren.delete(
            newFiber.key === null ? newIdx : newFiber.key,
          );
        }
      }
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
  }

  // 删除老节点上剩余的节点
  if (shouldTrackSideEffects) {
    existingChildren.forEach(child => deleteChild(returnFiber, child));
  }
```
