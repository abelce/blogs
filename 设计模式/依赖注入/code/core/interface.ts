export type ILisenter = (...params: any) => void | Promise<any>;

export interface ModuleInterface {
  listeners: Array<ILisenter>;

  destructor(): void; // 析构函数
}

export enum FormAction {
  Save = "Save",
  Submit = "Submit",
}

export interface FormSaveParams {
  mode: string;
  action: FormAction;
  data: any;
  entityName: string;
}
