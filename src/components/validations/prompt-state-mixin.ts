import { 
  State, BaseState, TranslateHelper, ResponseFactory, EntityDictionary, Session, PlatformGenerator, injectionNames, 
  Transitionable, GenericIntent, CurrentSessionFactory, Logger, Constructor, Mixin
} from "assistant-source";
import { injectable, inject } from "inversify";
import { Component } from "inversify-components";

import { HookContext, PromptStateMixinRequirements, PromptStateMixinInstance } from "./public-interfaces";
import { COMPONENT_NAME } from "./private-interfaces";

export function PromptStateMixin<T extends Constructor<BaseState & PromptStateMixinRequirements>>(superState: T): Constructor<PromptStateMixinInstance> & T {
  return class extends superState {
    async invokeGenericIntent(machine: Transitionable, tellInvokeMessage = true, ...additionalArgs: any[]) {
      let promises = await Promise.all([this.unserializeHook(), this.storeCurrentEntitiesToSession()]);
      let context = promises[0];

      if (typeof context === "undefined" || context === null ) throw new Error("HookContext must not be undefined!");

      // Check if entity is contained; if so, redirect to answerPromptIntent directly
      if (this.entityIsContained(this.getEntityType(context.neededEntity))) {
        return machine.handleIntent("answerPrompt");
      }

      if (tellInvokeMessage) {
        this.logger.debug(this.getLoggerOptions(), "Sending initial prompt message");
        this.responseFactory.createVoiceResponse().prompt(this.translateHelper.t("." + context.neededEntity));
      }
    }

    /**
     * Intent to be called if there is an answer. Uses entityIsContained and switchEntityStorage to check if
     * an entity is given and to store the new entity into entity store
     */
    answerPromptIntent(machine: Transitionable, ...additionalArgs: any[]) {
      return this.unserializeHook().then(context => {
        if (typeof context === "undefined" || context === null ) throw new Error("HookContext must not be undefined!");

        let promptedEntity = this.getEntityType(context.neededEntity);

        if (this.entityIsContained(promptedEntity)) {
          this.logger.debug(this.getLoggerOptions(), "Current request contained entity");
          return this.sessionFactory().delete("entities:currentPrompt").then(() => {
            return this.applyStoredEntities();
          }).then(() => {
            this.switchEntityStorage(promptedEntity, context.neededEntity);          
            this.logger.debug(this.getLoggerOptions(), `Redirecting to initially called ${context.state}#${context.intent}`);
            return machine.redirectTo(context.state, context.intent.replace("Intent", ""), ...context.redirectArguments);
          });
        } else {
          this.logger.debug(this.getLoggerOptions(), "Current request did not contain entity, reprompting via unhandledIntent");
          return machine.handleIntent("unhandledIntent");
        }
      });
    }

    /** 
     * Checks if a named entity is contained in the current request 
     * @param entityType Type of entity which is stored in the hook context, derived from your config/components.ts
    */
    entityIsContained(entityType: string) {
      return this.entities.contains(entityType);
    }

    /**
     * Changes the key of stored entity item: From this.entities.get("entityType") to this.entities.get("entityName")
     * @param entityType Type of entity, which is the current key in this.entities
     * @param entityName Name of entity, which is the new key in this.entities
    */
    switchEntityStorage(entityType: string, entityName: string) {
      let entityValue = this.entities.get(entityType);
      this.entities.set(entityType, undefined);
      this.entities.set(entityName, entityValue);
    }

    helpGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      return this.unserializeAndPrompt();
    }

    cancelGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      this.responseFactory.createVoiceResponse().endSessionWith(this.translateHelper.t());
      return Promise.resolve();
    }

    /* 
    * Checks if entity is contained in this request, although it is unhandledIntent. 
    * If so, redirects to answerPromptIntent instead of reprompting 
    */
    async unhandledGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      let context = await this.unserializeHook();
      if (typeof context === "undefined" || context === null ) throw new Error("HookContext must not be undefined!");
      let promptedEntity = this.getEntityType(context.neededEntity);
      if (this.entityIsContained(promptedEntity)) {
        return machine.handleIntent("answerPrompt");
      } else {
        return this.unserializeAndPrompt();
      }
    }

    stopGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      return machine.handleIntent(GenericIntent.Cancel);
    }

    /**
     * Unserializes hook context and prompts for the entity
     */
    unserializeAndPrompt() {
      return this.unserializeHook().then(context => {
        if (typeof(context) === "undefined" || typeof(context.intent) === "undefined") {
          this.responseFactory.createVoiceResponse().prompt(this.translateHelper.t());
        } else {
          this.responseFactory.createVoiceResponse().prompt(this.translateHelper.t("." + context.neededEntity));
        }
      }).catch(reason => {
        this.responseFactory.createVoiceResponse().prompt(this.translateHelper.t());
      });
    }

    /**
     * Returns entity type by its name
     * @param name name of entity
     */
    getEntityType(name: string): string {
      let searchedEntity: string | undefined = this.mappings[name];

      if (searchedEntity === undefined)
        throw new Error("Could not find entity configuration for " + name + ". Did you register it's entity type in your config/components.ts?");
      return searchedEntity;
    }

    /**
     * Unserializes hook context
     */
    unserializeHook(): Promise<HookContext> {
      return this.sessionFactory().get("entities:currentPrompt").then(serializedHook => {
        return JSON.parse(serializedHook) as HookContext;
      });
    }

    /** Stores all entities currently present in entity dictionary into session. */
    async storeCurrentEntitiesToSession() {
      await this.entities.storeToSession(this.sessionFactory(), "entities:currentPrompt:previousEntities");
    }

    /** Opposite of storeCurrentEntitiesToSession() */
    async applyStoredEntities() {
      await this.entities.readFromSession(this.sessionFactory(), true, "entities:currentPrompt:previousEntities");
      return this.sessionFactory().delete("entities:currentPrompt:previousEntities");
    }

    private getLoggerOptions() {
      return { component: COMPONENT_NAME };
    }
  }
}
