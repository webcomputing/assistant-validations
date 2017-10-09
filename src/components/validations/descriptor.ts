import { ComponentDescriptor, Hooks, Component } from "inversify-components";
import { stateMachineInterfaces, unifierInterfaces } from "assistant-source";

import { UtteranceTemplateService } from "./utterance-template-service";
import { BeforeIntentHook } from "./hook";
import { Prompt } from "./prompt";
import { PromptFactory, Configuration } from "./interfaces";

export const defaultConfiguration: Configuration = {
  defaultPromptState: "PromptState"
}

export const descriptor: ComponentDescriptor = {
  name: "validations",
  defaultConfiguration: defaultConfiguration,
  bindings: {
    root: (bindService, lookupService) => {
      // Bind own utterance service to corresponding conversation extension
      bindService.bindExtension<unifierInterfaces.GeneratorUtteranceTemplateService>(
        lookupService.lookup("core:unifier").getInterface("utteranceTemplateService")
      ).to(UtteranceTemplateService);
    },

    request: (bindService, lookupService) => {
      // Make prompt service accessible via factory
      bindService.bindGlobalService<PromptFactory>("current-prompt-factory").toFactory(context => {
        return (intent: string, stateName: string, machine: stateMachineInterfaces.Transitionable, promptStateName?: string, additionalArguments: any[] = []) => {
          if (typeof promptStateName === "undefined") {
            // Grab default promptState by Configuration
            promptStateName = (context.container.get<Component>("meta:component//validations").configuration as Configuration).defaultPromptState as string;
          }

          return new Prompt(machine, context.container.get<any>("core:unifier:current-session-factory")(), intent, stateName, promptStateName, additionalArguments);
        };
      });

      // Register hook function as method of a class
      bindService.bindLocalServiceToSelf(BeforeIntentHook);
      bindService.bindExtension<Hooks.Hook>(lookupService.lookup("core:state-machine").getInterface("beforeIntent")).toDynamicValue(context => {
        return context.container.get<BeforeIntentHook>(BeforeIntentHook).execute;
      });
    }
  }
};
