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
   


```js
export function processUpdateQueue<State>(
  workInProgress: Fiber,
  props: any,
  instance: any,
  renderLanes: Lanes,
): void {
  // This is always non-null on a ClassComponent or HostRoot
  const queue: UpdateQueue<State> = (workInProgress.updateQueue: any);

   // xxxxxxxxxx
  let firstBaseUpdate = queue.firstBaseUpdate;
  let lastBaseUpdate = queue.lastBaseUpdate;

  // 将新的update追加到lastBaseUpdate后面
  let pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    queue.shared.pending = null;

    // The pending queue is circular. Disconnect the pointer between first
    // and last so that it's non-circular.
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next;
    lastPendingUpdate.next = null;
    // Append pending updates to base queue
    if (lastBaseUpdate === null) {
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate;
    }
    lastBaseUpdate = lastPendingUpdate;
  }


  // These values may change as we process the queue.
  if (firstBaseUpdate !== null) {
    // Iterate through the list of updates to compute the result.
    let newState = queue.baseState;
    // TODO: Don't need to accumulate this. Instead, we can remove renderLanes
    // from the original lanes.
    let newLanes = NoLanes;

    let newBaseState = null;
    let newFirstBaseUpdate = null;
    let newLastBaseUpdate = null;

    let update = firstBaseUpdate;
    do {
      const updateLane = update.lane;
      const updateEventTime = update.eventTime;
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // 如果优先级不够，跳过该update。如果是第一个跳过的update，就把前一个update的state作为baseState
        const clone: Update<State> = {
          eventTime: updateEventTime,
          lane: updateLane,

          tag: update.tag,
          payload: update.payload,
          callback: update.callback,

          next: null,
        };
        if (newLastBaseUpdate === null) {
          // newFirstBaseUpdate 指向第一个被跳过的update
          newFirstBaseUpdate = newLastBaseUpdate = clone;
          // 同时设置baseState为前一个update的执行结果 
          newBaseState = newState;
        } else {
          // 设置 lastBaseUpdate，指向最后一个update
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        // Update the remaining priority in the queue.
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        // 如果优先级足够，则执行该update
        // This update does have sufficient priority.

        if (newLastBaseUpdate !== null) {
           // 如果存在跳过的update，后面的update优先级即使够，也需要加入到baseUpdate中
          const clone: Update<State> = {
            eventTime: updateEventTime,
            tag: update.tag,
            payload: update.payload,
            callback: update.callback,

            next: null,
          };
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }

        // Process this update.
        newState = getStateFromUpdate(
          workInProgress,
          queue,
          update,
          newState,
          props,
          instance,
        );
        // xxxx
      }
      update = update.next;
      if (update === null) {
        pendingQueue = queue.shared.pending;
        if (pendingQueue === null) {
          break;
        } else {
          // xxx
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
    // 设置新的baseState、firstBaseUpdate和lastBaseUpdate
    queue.baseState = ((newBaseState: any): State);
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;

    // 省略。。。。。

    workInProgress.memoizedState = newState;
  }
}
```












