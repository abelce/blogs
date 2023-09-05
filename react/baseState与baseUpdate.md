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

如果引入一种机制导致行为的结果不一致，那么就要修正。

所以react在 updateQueue上用`baseState`、`firstBaseUpdate`、`lastBaseUpdate`来解决。


这三个属性的作用：
1. baseState：第一个被跳过的Update前一个Update的执行结果。
2. firstBaseUpdate：第一个被跳过的Update
3. lastBaseUpdate：最后一个Update，只要有Update被跳过，那么该元素就指向updateQueue的最后一个节点。


