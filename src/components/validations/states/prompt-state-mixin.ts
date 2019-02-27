import { Constructor, GenericIntent, Transitionable } from "assistant-source";
import { CommonFunctionsMixin } from "../mixins/common-functions";
import {
  CommonFunctionsInstanceRequirements,
  CommonFunctionsMixinInstance,
  PromptStateMixinInstance,
  PromptStateMixinRequirements,
  sessionKeys,
  ValidationStrategy,
} from "../public-interfaces";

// Defines the public members requirements to an instance of a prompt state
type PromptStateInstanceRequirements = CommonFunctionsInstanceRequirements & PromptStateMixinRequirements;

export function PromptStateMixin<T extends Constructor<PromptStateInstanceRequirements>>(
  superState: T
): Constructor<PromptStateMixinInstance & PromptStateInstanceRequirements & CommonFunctionsMixinInstance> {
  return class extends CommonFunctionsMixin(superState) {
    public async invokeGenericIntent(machine: Transitionable, tellInvokeMessage = true, ...additionalArgs: any[]) {
      const promises = await Promise.all([this.unserializeHookContext<ValidationStrategy.Prompt>(), this.storeCurrentEntitiesToSession()]);
      const context = promises[0];

      // Check if entity is contained; if so, redirect to answerPromptIntent directly
      if (this.entityIsContained(this.getEntityType(context.validation.neededEntity))) {
        return machine.handleIntent("answerPrompt");
      }

      if (tellInvokeMessage) {
        await this.handleInvokeMessage(
          "Sending initial prompt message",
          await this.getSuggestionChipsTranslationConvention(),
          await this.getPromptTranslationConvention()
        );
      }
    }

    /**
     * Intent to be called if there is an answer. Uses entityIsContained and switchEntityStorage to check if
     * an entity is given and to store the new entity into entity store
     */
    public answerPromptIntent(machine: Transitionable, ...additionalArgs: any[]) {
      return this.unserializeHookContext<ValidationStrategy.Prompt>().then(context => {
        const promptedEntity = this.getEntityType(context.validation.neededEntity);

        if (this.entityIsContained(promptedEntity)) {
          this.logger.debug(this.getLoggerOptions(), "Current request contained entity");
          return this.sessionFactory()
            .delete(sessionKeys.context)
            .then(() => {
              return this.applyStoredEntities();
            })
            .then(() => {
              this.switchEntityStorage(promptedEntity, context.validation.neededEntity);
              this.logger.debug(this.getLoggerOptions(), `Redirecting to initially called ${context.state}#${context.intent}`);
              return machine.redirectTo(context.state, context.intent.replace("Intent", ""), ...context.redirectArguments);
            });
        }
        this.logger.debug(this.getLoggerOptions(), "Current request did not contain entity, reprompting via unhandledIntent");
        return machine.handleIntent("unhandledIntent");
      });
    }

    /**
     * Checks if a named entity is contained in the current request
     * @param entityType Type of entity which is stored in the hook context, derived from your config/components.ts
     */
    public entityIsContained(entityType: string) {
      return this.entities.contains(entityType);
    }

    /**
     * Changes the key of stored entity item: From this.entities.get("entityType") to this.entities.get("entityName")
     * @param entityType Type of entity, which is the current key in this.entities
     * @param entityName Name of entity, which is the new key in this.entities
     */
    public switchEntityStorage(entityType: string, entityName: string) {
      const entityValue = this.entities.get(entityType);
      this.entities.set(entityType, undefined);
      this.entities.set(entityName, entityValue);
    }

    public helpGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      return this.unserializeAndPrompt();
    }

    public cancelGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      this.endSessionWith(this.t());
      return Promise.resolve();
    }

    /* 
    * Checks if entity is contained in this request, although it is unhandledIntent. 
    * If so, redirects to answerPromptIntent instead of reprompting 
    */
    public async unhandledGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      const context = await this.unserializeHookContext<ValidationStrategy.Prompt>();

      const promptedEntity = this.getEntityType(context.validation.neededEntity);
      if (this.entityIsContained(promptedEntity)) {
        return machine.handleIntent("answerPrompt");
      }
      return this.unserializeAndPrompt();
    }

    public stopGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      return machine.handleIntent(GenericIntent.Cancel);
    }

    /**
     * Unserializes hook context and prompts for the entity
     */
    public async unserializeAndPrompt() {
      try {
        const context = await this.unserializeHookContext<ValidationStrategy.Prompt>();
        this.responseHandler.prompt(this.t(await this.getPromptTranslationConvention()));
        await this.setSuggestionChips(await this.getSuggestionChipsTranslationConvention());
      } catch (reason) {
        this.responseHandler.prompt(this.t());
        await this.setSuggestionChips();
      }
    }

    /**
     * Returns entity type by its name
     * @param name name of entity
     */
    public getEntityType(name: string): string {
      const searchedEntity: string | undefined = this.mappings[name];

      if (searchedEntity === undefined) {
        throw new Error(`Could not find entity configuration for "${name}". Did you register it's entity type in your config/components.ts?`);
      }
      return searchedEntity;
    }

    /** Stores all entities currently present in entity dictionary into session. */
    public async storeCurrentEntitiesToSession() {
      await this.entities.storeToSession(this.sessionFactory(), sessionKeys.prompt.previousEntities);
    }

    /** Opposite of storeCurrentEntitiesToSession() */
    public async applyStoredEntities() {
      await this.entities.readFromSession(this.sessionFactory(), true, sessionKeys.prompt.previousEntities);
      return this.sessionFactory().delete(sessionKeys.prompt.previousEntities);
    }

    /** Get the translation convention which represents the lookup string under which the translations for the confirmation state are found. */
    public async getPromptTranslationConvention() {
      const context = await this.unserializeHookContext<ValidationStrategy.Prompt>();
      return `.${context.validation.neededEntity}`;
    }

    /** Get the translation convention which represents the lookup string under which the translations for the suggestion chips are found. */
    public async getSuggestionChipsTranslationConvention() {
      const context = await this.unserializeHookContext<ValidationStrategy.Prompt>();

      return `.suggestionChips.${context.validation.neededEntity}`;
    }
  };
}
