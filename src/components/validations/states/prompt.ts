import { State, BaseState, TranslateHelper, ResponseFactory, EntityDictionary, Session, PlatformGenerator, injectionNames, Transitionable, GenericIntent } from "assistant-source";
import { injectable, inject } from "inversify";
import { Component } from "inversify-components";

import { HookContext } from "../interfaces";
import { log } from "../../../global";

@injectable()
export class PromptState extends BaseState implements State.Required {
  entities: EntityDictionary;
  sessionFactory: () => Session;
  mappings: PlatformGenerator.EntityMapping;

  constructor(
    @inject(injectionNames.current.stateSetupSet) stateSetupSet: State.SetupSet,
    @inject("core:unifier:current-entity-dictionary") entityDictionary: EntityDictionary,
    @inject("core:unifier:current-session-factory") sessionFactory: () => Session,
    @inject("core:unifier:user-entity-mappings") mappings: PlatformGenerator.EntityMapping
  ) {
    super(stateSetupSet);
    this.entities = entityDictionary;
    this.mappings = mappings;
    this.sessionFactory = sessionFactory;
  }

  /**
   * Called as an state entrance from promptFactory.
   * @param machine Transitionable interface 
   * @param tellInvokeMessage If set to true, the invoke prompt message will be returned to user
   */
  async invokeGenericIntent(machine: Transitionable, tellInvokeMessage = true, ...additionalArgs: any[]) {
    let promises = await Promise.all([this.unserializeHook(), this.storeCurrentEntitiesToSession()]);
    let context = promises[0];

    if (typeof context === "undefined" || context === null ) throw new Error("HookContext must not be undefined!");

    // Check if entity is contained; if so, redirect to answerPromptIntent directly
    if (this.entityIsContained(this.getEntityType(context.neededEntity))) {
      return machine.handleIntent("answerPrompt");
    }

    if (tellInvokeMessage) {
      log("Sending initial prompt message");
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
        log("Current request contained entity");
        return this.sessionFactory().delete("entities:currentPrompt").then(() => {
          return this.applyStoredEntities();
        }).then(() => {
          this.switchEntityStorage(promptedEntity, context.neededEntity);          
          log("Redirecting to initial state/intent context: %o", context);
          return machine.redirectTo(context.state, context.intent.replace("Intent", ""), ...context.redirectArguments);
        });
      } else {
        log("Current request did not contain entity, reprompting via unhandledIntent");
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
  storeCurrentEntitiesToSession() {
    this.entities.storeToSession(this.sessionFactory(), "entities:currentPrompt:previousEntities");
  }

  /** Opposite of storeCurrentEntitiesToSession() */
  async applyStoredEntities() {
    await this.entities.readFromSession(this.sessionFactory(), true, "entities:currentPrompt:previousEntities");
    return this.sessionFactory().delete("entities:currentPrompt:previousEntities");
  }
}
