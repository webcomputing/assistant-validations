import { injectionNames, PlatformGenerator, Transitionable } from "assistant-source";
import { Component, ComponentDescriptor, getMetaInjectionName, Hooks } from "inversify-components";

import { BeforeIntentHook } from "./hook";
import { validationsInjectionNames } from "./injection-names";
import { COMPONENT_NAME, Configuration } from "./private-interfaces";
import { PromptTransition } from "./transitions/prompt-transition";
import { UtteranceTemplateService } from "./utterance-template-service";
import { ValidationsInitializer } from "./validations-initializer";

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
      // Make all validation services available out of states or other classes
      bindService.bindGlobalService("validations-initializer").to(ValidationsInitializer);

      // Bind local transition classes
      bindService.bindLocalServiceToSelf(PromptTransition);

      // Register hook function as method of a class
      bindService.bindLocalServiceToSelf(BeforeIntentHook);
      bindService.bindExtension<Hooks.Hook>(lookupService.lookup("core:state-machine").getInterface("beforeIntent")).toDynamicValue(context => {
        return context.container.get<BeforeIntentHook>(BeforeIntentHook).execute as Hooks.Hook;
      });
    },
  },
};
