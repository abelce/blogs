import { ModuleManager } from "./core/moduleManager";
import { EventModule } from "./modules/eventModule";
import { FormModule } from "./modules/formModule";

function main() {
  const modules = new ModuleManager({
    seeds: {},
    // 初始化EventModule FormModule 
    modules: [EventModule, FormModule],
    data: {},
  });
}
