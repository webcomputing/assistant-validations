import {
  BaseState,
  BasicAnswerTypes,
  BasicHandable,
  Constructor,
  featureIsAvailable,
  GenericIntent,
  OptionalHandlerFeatures,
  SuggestionChipsMixin,
  Transitionable,
} from "assistant-source";

import { COMPONENT_NAME } from "./private-interfaces";
import { HookContext, PromptStateMixinInstance, PromptStateMixinRequirements } from "./public-interfaces";


/**
 * The mixin's return type has a flaw in the return type. According to some findings, e.g. https://github.com/Microsoft/TypeScript/issues/10261, 
 * the intersection of two Constructor types is not considered to be Constructor type itself. Hence, `Constructor<PromptStateMixinInstance> & T` 
 * is not instantiable (by type, actually it is). The solution is not to intersect two Constructor types, but to intersect the return type of the
 * constructor. There're two possible ways.
 * 
 * The first one uses the `InstanceType` mapped type and does not require an adaption of the generic:
 * 
 * export declare function PromptStateMixin<T extends Constructor<BaseState<BasicAnswerTypes, BasicHandable<BasicAnswerTypes>> & PromptStateMixinRequirements>>(superState: T): Constructor<PromptStateMixinInstance & InstanceType<T>>;
 * 
 * However, this results in an non-static return type as `InstanceType` uses conditionals. Consequently, TypeScript does not allow to extend from
 * this immediately; it must've been explicitely casted to a static type:
 * 
 * 
 * const mixedState = PromptStateMixin(superState) as Constructor<PromptStateMixinInstance & BaseState<BasicAnswerTypes, BasicHandable<BasicAnswerTypes>> & PromptStateMixinRequirements>;
 *
 * @injectable()
 * class LeanPromptState extends mixedState {}
 * 
 * 
 * The alternative is to alter return type and the generic, which works like a charm, but may have some implications in existing projects (though I can't imagine any):
 * 
 * export declare function PromptStateMixin<T extends Constructor<I>, I extends BaseState<BasicAnswerTypes, BasicHandable<BasicAnswerTypes>> & PromptStateMixinRequirements>(superState: T): Constructor<PromptStateMixinInstance & I>;
 * 
 */



export function PromptStateMixin<T extends Constructor<BaseState<BasicAnswerTypes, BasicHandable<BasicAnswerTypes>> & PromptStateMixinRequirements>>(
  superState: T
): Constructor<PromptStateMixinInstance> & T {
  return class extends superState {
    public async invokeGenericIntent(machine: Transitionable, tellInvokeMessage = true, ...additionalArgs: any[]) {
      const promises = await Promise.all([this.unserializeHook(), this.storeCurrentEntitiesToSession()]);
      const context = promises[0];

      if (typeof context === "undefined" || context === null) throw new Error("HookContext must not be undefined!");

      // Check if entity is contained; if so, redirect to answerPromptIntent directly
      if (this.entityIsContained(this.getEntityType(context.neededEntity))) {
        return machine.handleIntent("answerPrompt");
      }

      if (tellInvokeMessage) {
        this.logger.debug(this.getLoggerOptions(), "Sending initial prompt message");
        await this.setSuggestionChipsIfPresent(context.neededEntity);
        this.responseHandler.prompt(this.translateHelper.t("." + context.neededEntity));
      }
    }

    /**
     * Intent to be called if there is an answer. Uses entityIsContained and switchEntityStorage to check if
     * an entity is given and to store the new entity into entity store
     */
    public answerPromptIntent(machine: Transitionable, ...additionalArgs: any[]) {
      return this.unserializeHook().then(context => {
        if (typeof context === "undefined" || context === null) throw new Error("HookContext must not be undefined!");

        const promptedEntity = this.getEntityType(context.neededEntity);

        if (this.entityIsContained(promptedEntity)) {
          this.logger.debug(this.getLoggerOptions(), "Current request contained entity");
          return this.sessionFactory()
            .delete("entities:currentPrompt")
            .then(() => {
              return this.applyStoredEntities();
            })
            .then(() => {
              this.switchEntityStorage(promptedEntity, context.neededEntity);
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
      this.endSessionWith(this.translateHelper.t());
      return Promise.resolve();
    }

    /* 
    * Checks if entity is contained in this request, although it is unhandledIntent. 
    * If so, redirects to answerPromptIntent instead of reprompting 
    */
    public async unhandledGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      const context = await this.unserializeHook();
      if (typeof context === "undefined" || context === null) throw new Error("HookContext must not be undefined!");
      const promptedEntity = this.getEntityType(context.neededEntity);
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
        const context = await this.unserializeHook();
        if (typeof context === "undefined" || typeof context.intent === "undefined") {
          this.responseHandler.prompt(this.translateHelper.t());
          await this.setSuggestionChipsIfPresent();
        } else {
          this.responseHandler.prompt(this.translateHelper.t("." + context.neededEntity));
          await this.setSuggestionChipsIfPresent(context.neededEntity);
        }
      } catch (reason) {
        this.responseHandler.prompt(this.translateHelper.t());
        await this.setSuggestionChipsIfPresent();
      }
    }

    /** Sets suggestion chips if we got a translation for it */
    public async setSuggestionChipsIfPresent(neededEntitiy?: string): Promise<void> {
      const lookupString = typeof neededEntitiy === "string" ? `.suggestionChips.${neededEntitiy}` : ".suggestionChips";

      // Allow having no suggestion chips at all -> catch error
      try {
        if (featureIsAvailable(this.responseHandler, OptionalHandlerFeatures.FeatureChecker.SuggestionChips)) {
          (this.responseHandler as SuggestionChipsMixin<BasicAnswerTypes>).setSuggestionChips(await this.translateHelper.getAllAlternatives(lookupString));
        } else {
          this.logger.debug(`Current response handler doesn't support suggestion chips, so not setting any for entity = ${neededEntitiy}`);
        }
      } catch {
        this.logger.debug(`Didn't find any suggestion chips for entity = ${neededEntitiy}, so not setting any`);
      }
    }

    /**
     * Returns entity type by its name
     * @param name name of entity
     */
    public getEntityType(name: string): string {
      const searchedEntity: string | undefined = this.mappings[name];

      if (searchedEntity === undefined) {
        throw new Error("Could not find entity configuration for " + name + ". Did you register it's entity type in your config/components.ts?");
      }
      return searchedEntity;
    }

    /**
     * Unserializes hook context
     */
    public unserializeHook(): Promise<HookContext> {
      return this.sessionFactory()
        .get("entities:currentPrompt")
        .then(serializedHook => {
          if (serializedHook) {
            return JSON.parse(serializedHook) as HookContext;
          }

          throw new Error("HookContext cannot be undefined.");
        });
    }

    /** Stores all entities currently present in entity dictionary into session. */
    public async storeCurrentEntitiesToSession() {
      await this.entities.storeToSession(this.sessionFactory(), "entities:currentPrompt:previousEntities");
    }

    /** Opposite of storeCurrentEntitiesToSession() */
    public async applyStoredEntities() {
      await this.entities.readFromSession(this.sessionFactory(), true, "entities:currentPrompt:previousEntities");
      return this.sessionFactory().delete("entities:currentPrompt:previousEntities");
    }

    private getLoggerOptions() {
      return { component: COMPONENT_NAME };
    }
  };
}
