本文介绍React更新的baseState，阐述baseState在updateQueue中的作用，以及工作原理。

首先React中任务有着不同的优先级，优先级高的任务先执行，低的后执行。所以会出现先创建的任务后执行的情况。比如下面的例子：
```
A1 -> B2 -> C1 -> D2
```
其中数字越小优先级越高，所以`A1`和`C1` 会优先执行，执行完后的更新队列就如下：
```
B2 -> D2
```

假如每个任务对state的操作为如下：
```
const [count, setCount] = useState(1)
A1: setCount(count => count + 1)
B2: setCount(count => count * 2)
C1: setCount(count => count + 1)
D2: setCount(count => count + 2)
```
首先如果不按照优先级，直接按照更新列表中任务的顺序执行，执行的过程就是
```
A: count = 1 + 1; //2
B: count = 2 * 2; // 4
C: count = 4 + 1; // 5
D: count = 5 + 2; // 7
```
上面的执行结果为`count=7`

如果按照优先级高的先执行，优先级低的后执行那么执行的顺序如下:
```
// 高优先级
A1: count = 1 + 1; // 2
C1: count = 2 + 1; // 3
// 低优先级
B2: count = 3 * 2; // 6
D2: count = 6 + 2; // 8
```
执行结果为`count=8`，两种方式的执行结果竟然不一致。

那么React时是怎么解决这个问题的呢?

往下看。

## baseState和baseUpdate
react在 updateQueue上用`baseState`、`firstBaseUpdate`、`lastBaseUpdate`来解决。

这三个属性的作用：
1. baseState：第一个被跳过的Update前一个Update的执行结果。
2. firstBaseUpdate：第一个被跳过的Update
3. lastBaseUpdate：最后一个Update，只要有Update被跳过，那么该元素就指向updateQueue的最后一个节点。
   
下面看一下processUpdateQueue源码的执行逻辑。

### 将新的update追加到现有的baseUpdate后面

```
  const queue: UpdateQueue<State> = (workInProgress.updateQueue: any);

  hasForceUpdate = false;

  if (__DEV__) {
    currentlyProcessingQueue = queue.shared;
  }

  let firstBaseUpdate = queue.firstBaseUpdate; // 上次执行后的第一个baseUpdate
  let lastBaseUpdate = queue.lastBaseUpdate; // 上次执行后的最后一个

  // Check if there are pending updates. If so, transfer them to the base queue.
  let pendingQueue = queue.shared.pending; // 本次待处理的update
  if (pendingQueue !== null) {
    
    queue.shared.pending = null;

    // The pending queue is circular. Disconnect the pointer between first
    // and last so that it's non-circular.
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next;
    lastPendingUpdate.next = null;
    /**
     * 将pending update 追加到 base update上 
     * */ 
    if (lastBaseUpdate === null) {
      /**
       * 如果baseUpdate没有数据，就是说上一次没有出现跳过某个update的情况，那么就将 firstBaseUpdate就为pendingUpdate的第一个节点 
       */
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate;
    }
    /**
     * lastBaseUpdate 设置为pendingUpdate的最后一个update
     */
    lastBaseUpdate = lastPendingUpdate;

    /**
     * current 也做上面同样的处理
     */
    const current = workInProgress.alternate;
    if (current !== null) {
      // This is always non-null on a ClassComponent or HostRoot
      const currentQueue: UpdateQueue<State> = (current.updateQueue: any);
      const currentLastBaseUpdate = currentQueue.lastBaseUpdate;
      if (currentLastBaseUpdate !== lastBaseUpdate) {
        if (currentLastBaseUpdate === null) {
          currentQueue.firstBaseUpdate = firstPendingUpdate;
        } else {
          currentLastBaseUpdate.next = firstPendingUpdate;
        }
        currentQueue.lastBaseUpdate = lastPendingUpdate;
      }
    }
  }
```
每次处理update时都要从上一次第一个跳过的位置开始计算，比如计算`B2`时要用`A1`的结果`2`作为初始值，而不是`C1`的结果`3`；同时将新的update追加在后面，这样最终的执行顺序才是正确的。


### 执行baseUpdate
```js
   // 如果存在上次跳过的Update，就执行该逻辑
  // 如果baseUpdate存在相同或者更高的优先级的任务，就执行优先级对应的任务
  if (firstBaseUpdate !== null) {
    let newState = queue.baseState;
    let newLanes = NoLanes;

    let newBaseState = null;
    let newFirstBaseUpdate = null;
    let newLastBaseUpdate = null;

    let update = firstBaseUpdate;
    // 开始处理update
    do {
      const updateLane = update.lane;
      const updateEventTime = update.eventTime;
      // 
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        /**
         * 将优先级不够的任务添加到新的firstBaseUpdate上，执行结束后添加到fiber的updateQueue的firstBaseUpdate上
         */
        const clone: Update<State> = {
          eventTime: updateEventTime,
          lane: updateLane,

          tag: update.tag,
          payload: update.payload,
          callback: update.callback,

          next: null,
        };
        if (newLastBaseUpdate === null) {
          /**
           * 第一个跳过的update作为新的firstBaseUpdate，后面会放在udpateQueue上
           */
          newFirstBaseUpdate = newLastBaseUpdate = clone;
          /**
           * 第一个跳过的任务的前一个任务的执行后的state
           */
          newBaseState = newState;
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        /**
         * 如果优先级足够，就执行update
         */
        if (newLastBaseUpdate !== null) {
          /**
           * 如果newLastBaseUpdate存在，说明前面又跳过的Update，后续的所有Update又要重新形成baseUpdate
           */
          const clone: Update<State> = {
            eventTime: updateEventTime,
            lane: NoLane,

            tag: update.tag,
            payload: update.payload,
            callback: update.callback,

            next: null,
          };
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }

        /**
         * 处理update后得到新的state
         */
        newState = getStateFromUpdate(
          workInProgress,
          queue,
          update,
          newState,
          props,
          instance,
        );
        const callback = update.callback;
        if (
          callback !== null &&
          // If the update was already committed, we should not queue its
          // callback again.
          update.lane !== NoLane
        ) {
          workInProgress.flags |= Callback; // 标记这个fiber需要执行state更新后的回调
          const effects = queue.effects; // 收集副作用，放到update上
          if (effects === null) {
            queue.effects = [update];
          } else {
            effects.push(update);
          }
        }
      }
      update = update.next; 
      if (update === null) { 
        /**
         * 如果baseUpdate执行完了，判断是否又产生了新的update
         */
        pendingQueue = queue.shared.pending;
        if (pendingQueue === null) {
          break;
        } else {
          // An update was scheduled from inside a reducer. Add the new
          // pending updates to the end of the list and keep processing.
          const lastPendingUpdate = pendingQueue;
          // Intentionally unsound. Pending updates form a circular list, but we
          // unravel them when transferring them to the base queue.
          const firstPendingUpdate = ((lastPendingUpdate.next: any): Update<State>);
          lastPendingUpdate.next = null;
          update = firstPendingUpdate;
          queue.lastBaseUpdate = lastPendingUpdate;
          queue.shared.pending = null;
        }
      }
    } while (true);

    if (newLastBaseUpdate === null) {
      newBaseState = newState;
    }
    
    /**
     * 执行完毕后将 baseState、firstBaseUpdate和lastBaseUpdate设置到updateQueue上
     */
    queue.baseState = ((newBaseState: any): State); 
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;

    const lastInterleaved = queue.shared.interleaved;
    if (lastInterleaved !== null) {
      let interleaved = lastInterleaved;
      do {
        newLanes = mergeLanes(newLanes, interleaved.lane);
        interleaved = ((interleaved: any).next: Update<State>);
      } while (interleaved !== lastInterleaved);
    } else if (firstBaseUpdate === null) {

      queue.shared.lanes = NoLanes;
    }

    markSkippedUpdateLanes(newLanes);
    workInProgress.lanes = newLanes; // 将优先级不够的lanes放到节点的lanes上
    /**
     * 更新state
    */
    workInProgress.memoizedState = newState; // 设置新的state
  }
```
每次处理update时都会先判断优先级：
1. 如果优先级不够，就跳过。同时设置新的baseState，firstBaseUpdate，lastBaseUpdate.
2. 如果优先级够：
  1. 如果存在跳过的update，则该节点也要在baseUpdate上
  2. 执行udpate，得到新的state
  3. 将新的baseState、firstBaseUpdate、lastBaseUpdate添加到updateQueue上。


## 总结
react使用baseUpdate和baseState来保证class组件中更新的正确性，因为react每次更新都会产生一个update，每个update的优先级不同；同时每个更新任务只会处理最高优先级的update，所以优先级低的就会跳过，下一次再处理。











