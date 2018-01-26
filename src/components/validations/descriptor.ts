import { ComponentDescriptor, Hooks, Component } from "inversify-components";
import { Transitionable, PlatformGenerator } from "assistant-source";

import { UtteranceTemplateService } from "./utterance-template-service";
import { BeforeIntentHook } from "./hook";
import { Prompt } from "./prompt";
import { PromptFactory } from "./public-interfaces";
import { Configuration } from "./private-interfaces";

export const defaultConfiguration: Configuration.Defaults = {
  defaultPromptState: "PromptState"
}

export const descriptor: ComponentDescriptor<Configuration.Defaults> = {
  name: "validations",
  defaultConfiguration: defaultConfiguration,
  bindings: {
    root: (bindService, lookupService) => {
      // Bind own utterance service to corresponding conversation extension
      bindService.bindExtension<PlatformGenerator.UtteranceTemplateService>(
        lookupService.lookup("core:unifier").getInterface("utteranceTemplateService")
      ).to(UtteranceTemplateService);
    },

    request: (bindService, lookupService) => {
      // Make prompt service accessible via factory
      bindService.bindGlobalService<PromptFactory>("current-prompt-factory").toFactory(context => {
        return (intent: string, stateName: string, machine: Transitionable, promptStateName?: string, additionalArguments: any[] = []) => {
          if (typeof promptStateName === "undefined") {
            // Grab default promptState by Configuration
            promptStateName = context.container.get<Component<Configuration.Runtime>>("meta:component//validations").configuration.defaultPromptState;
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
