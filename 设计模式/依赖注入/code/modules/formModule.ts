import { autobind } from "core-decorators";
import { BaseModule } from "../core/baseModule";
import { ModulePropertyWrapper, ModuleWrapper } from "../core/moduleManager";
import { EventModule } from "./eventModule";
import { ModuleNames } from "./moduleNames";

@autobind
@ModuleWrapper(ModuleNames.FormModule)
export class FormModule extends BaseModule {
  @ModulePropertyWrapper(ModuleNames.EventModule)
  private eventModule: EventModule;

  public apply() {
    this.eventModule.on("onSave", this.save);
  }

  private async save() {}

}
