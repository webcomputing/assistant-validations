import { ComponentDescriptor, Hooks, Component } from "inversify-components";
import { stateMachineInterfaces, unifierInterfaces } from "assistant-source";

import { UtteranceTemplateService } from "./utterance-template-service";
import { BeforeIntentHook } from "./hook";
import { Prompt } from "./prompt";
import { PromptFactory } from "./interfaces";

export const descriptor: ComponentDescriptor = {
  name: "validations",
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
        return (intent: string, stateName: string, machine: stateMachineInterfaces.Transitionable) => {
          return new Prompt(machine, context.container.get<any>("core:unifier:current-session-factory")(), intent, stateName);
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
