import { ILisenter } from "./interface";

export interface BaseModuleOptions {
  data: any;
}

export class BaseModule {
  protected listeners: Array<ILisenter> = [];

  constructor(protected options: BaseModuleOptions) {}

  // 模块初始化完成后立即执行函数,
  public apply() {}

  public destructor() {
    // 销毁当前模块添加的监听器
    this.listeners.forEach((listener) => listener && listener());
  }
}
