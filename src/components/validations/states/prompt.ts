import { stateMachineInterfaces, unifierInterfaces, servicesInterfaces, i18nInterfaces, BaseState } from "assistant-source";
import { injectable, inject } from "inversify";
import { Component } from "inversify-components";

import { HookContext } from "../interfaces";
import { log } from "../../../global";

@injectable()
export class PromptState extends BaseState implements stateMachineInterfaces.State {
  i18n: i18nInterfaces.TranslateHelper;
  responseFactory: unifierInterfaces.ResponseFactory;
  entities: unifierInterfaces.EntityDictionary;
  machine: stateMachineInterfaces.StateMachine;
  sessionFactory: () => servicesInterfaces.Session;
  mappings: unifierInterfaces.GeneratorEntityMapping;

  constructor(
    @inject("core:i18n:current-translate-helper") i18n: i18nInterfaces.TranslateHelper,
    @inject("core:unifier:current-response-factory") responseFactory: unifierInterfaces.ResponseFactory,
    @inject("core:unifier:current-entity-dictionary") entityDictionary: unifierInterfaces.EntityDictionary,
    @inject("core:state-machine:current-state-machine") machine: stateMachineInterfaces.StateMachine,
    @inject("core:unifier:current-session-factory") sessionFactory: () => servicesInterfaces.Session,
    @inject("core:unifier:user-entity-mappings") mappings: unifierInterfaces.GeneratorEntityMapping
  ) {
    super(responseFactory, i18n);
    this.i18n = i18n;
    this.responseFactory = responseFactory;
    this.entities = entityDictionary;
    this.machine = machine;
    this.mappings = mappings;
    this.sessionFactory = sessionFactory;
  }

  /**
   * Called as an state entrance from promptFactory.
   * @param machine Transitionable interface 
   * @param tellInvokeMessage If set to true, the invoke prompt message will be returned to user
   */
  async invokeGenericIntent(machine: stateMachineInterfaces.Transitionable, tellInvokeMessage = true) {
    let promises = await Promise.all([this.unserializeHook(), this.storeCurrentEntitiesToSession()]);
    let context = promises[0];

    if (typeof context === "undefined" || context === null ) throw new Error("HookContext must not be undefined!");

    // Check if entity is contained; if so, redirect to answerPromptIntent directly
    if (this.entityIsContained(this.getEntityType(context.neededEntity))) {
      return machine.handleIntent("answerPrompt");
    }

    if (tellInvokeMessage) {
      log("Sending initial prompt message");
      this.responseFactory.createVoiceResponse().prompt(this.i18n.t("." + context.neededEntity));
    }
  }

  /**
   * Intent to be called if there is an answer. Uses entityIsContained and switchEntityStorage to check if
   * an entity is given and to store the new entity into entity store
   */
  answerPromptIntent() {
    return this.unserializeHook().then(context => {
      let promptedEntity = this.getEntityType(context.neededEntity);

      if (this.entityIsContained(promptedEntity)) {
        log("Current request contained entity");
        return this.sessionFactory().delete("entities:currentPrompt").then(() => {
          return this.applyStoredEntities();
        }).then(() => {
          this.switchEntityStorage(promptedEntity, context.neededEntity);          
          log("Redirecting to initial state/intent context: %o", context);
          return this.machine.redirectTo(context.state, context.intent.replace("Intent", ""), ...context.redirectArguments);
        });
      } else {
        log("Current request did not contain entity, reprompting via unhandledIntent");
        return this.machine.handleIntent("unhandledIntent");
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

  helpGenericIntent() {
    return this.unserializeAndPrompt();
  }

  cancelGenericIntent() {
    this.responseFactory.createVoiceResponse().endSessionWith(this.i18n.t());
  }

  /* 
   * Checks if entity is contained in this request, although it is unhandledIntent. 
   * If so, redirects to answerPromptIntent instead of reprompting 
  */
  async unhandledGenericIntent(machine: stateMachineInterfaces.Transitionable) {
    let context = await this.unserializeHook();
    let promptedEntity = this.getEntityType(context.neededEntity);
    if (this.entityIsContained(promptedEntity)) {
      return machine.handleIntent("answerPrompt");
    } else {
      return this.unserializeAndPrompt();
    }
  }

  stopGenericIntent(machine: stateMachineInterfaces.Transitionable) {
    return machine.handleIntent(unifierInterfaces.GenericIntent.Cancel);
  }

  /**
   * Unserializes hook context and prompts for the entity
   */
  unserializeAndPrompt() {
    return this.unserializeHook().then(context => {
      if (typeof(context) === "undefined" || typeof(context.intent) === "undefined") {
        this.responseFactory.createVoiceResponse().prompt(this.i18n.t());
      } else {
        this.responseFactory.createVoiceResponse().prompt(this.i18n.t("." + context.neededEntity));
      }
    }).catch(reason => {
      this.responseFactory.createVoiceResponse().prompt(this.i18n.t());
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
