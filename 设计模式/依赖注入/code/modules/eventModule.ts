import { autobind } from "core-decorators";
import { BaseModule } from "../core/baseModule";
import { ModuleWrapper } from "../core/moduleManager";
import { ModuleNames } from "./moduleNames";
import { ILisenter } from "../core/interface";

@autobind
@ModuleWrapper(ModuleNames.EventModule)
export class EventModule extends BaseModule {
  private eventStock: Map<string, Array<ILisenter>> = new Map();

  /**
   *  添加 支持异步函数
   * @param eventName
   * @param listener
   * @returns
   */
  public on(eventName: string, listener: ILisenter) {
    const listeners = this.eventStock.get(eventName) || [];
    listeners.push(listener);
    this.eventStock.set(eventName, listeners);

    return () => {
      this.off(eventName, listener);
    };
  }

  // 卸载
  public off(eventName: string, listener: ILisenter) {
    const listeners = this.eventStock.get(eventName) || [];
    this.eventStock.set(
      eventName,
      listeners.filter((item) => item !== listener)
    );
  }

  /**
   * @param eventName
   * @param params
   */
  public async dispatch(eventName: string, ...params: any) {
    const listeners = this.eventStock.get(eventName) || [];
    for (let i = 0; i < listeners.length; i++) {
      await listeners[i](params);
    }
  }

  /**
   *
   * @param eventName : 提供事件名称时清空指定对应名称的事件，否则清空所有事件
   */
  public clear(eventName?: string) {
    if (eventName) {
      this.eventStock.delete(eventName);
    } else {
      this.eventStock.clear();
    }
  }
}
