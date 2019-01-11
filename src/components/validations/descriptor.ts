import { injectionNames, PlatformGenerator, Transitionable } from "assistant-source";
import { Component, ComponentDescriptor, Hooks } from "inversify-components";

import { BeforeIntentHook } from "./hook";
import { validationsInjectionNames } from "./injection-names";
import { COMPONENT_NAME, Configuration } from "./private-interfaces";
import { Prompt } from "./prompt";
import { PromptFactory } from "./public-interfaces";
import { UtteranceTemplateService } from "./utterance-template-service";

export const defaultConfiguration: Configuration.Defaults = {
  defaultPromptState: "PromptState",
};

export const descriptor: ComponentDescriptor<Configuration.Defaults> = {
  defaultConfiguration,
  name: COMPONENT_NAME,
  bindings: {
    root: (bindService, lookupService) => {
      // Bind own utterance service to corresponding conversation extension
      bindService
        .bindExtension<PlatformGenerator.UtteranceTemplateService>(lookupService.lookup("core:unifier").getInterface("utteranceTemplateService"))
        .to(UtteranceTemplateService);
    },

    request: (bindService, lookupService) => {
      // Make prompt service accessible via factory
      bindService.bindGlobalService<PromptFactory>("current-prompt-factory").toFactory(context => {
        return (intent: string, stateName: string, machine: Transitionable, promptStateName?: string, additionalArguments: any[] = []) => {
          // Grab default promptState by Configuration
          const currentpromptStateName =
            typeof promptStateName === "undefined"
              ? context.container.get<Component<Configuration.Runtime>>(validationsInjectionNames.component).configuration.defaultPromptState
              : promptStateName;

          return new Prompt(
            machine,
            context.container.get<any>(injectionNames.current.sessionFactory)(),
            intent,
            stateName,
            currentpromptStateName,
            additionalArguments
          );
        };
      });

      // Register hook function as method of a class
      bindService.bindLocalServiceToSelf(BeforeIntentHook);
      bindService.bindExtension<Hooks.Hook>(lookupService.lookup("core:state-machine").getInterface("beforeIntent")).toDynamicValue(context => {
        return context.container.get<BeforeIntentHook>(BeforeIntentHook).execute as Hooks.Hook;
      });
    },
  },
};
