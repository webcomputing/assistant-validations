import { stateMachineInterfaces, unifierInterfaces, servicesInterfaces, i18nInterfaces } from "assistant-source";
import { injectable, inject } from "inversify";
import { Component } from "inversify-components";

import { HookContext } from "../interfaces";

@injectable()
export class PromptState implements stateMachineInterfaces.State {
  private i18n: i18nInterfaces.TranslateHelper;
  private responseFactory: unifierInterfaces.ResponseFactory;
  private entities: unifierInterfaces.EntityDictionary;
  private machine: stateMachineInterfaces.StateMachine;
  private sessionFactory: () => servicesInterfaces.Session;
  private mappings: unifierInterfaces.GeneratorEntityMapping;

  constructor(
    @inject("core:i18n:current-translate-helper") i18n: i18nInterfaces.TranslateHelper,
    @inject("core:unifier:current-response-factory") responseFactory: unifierInterfaces.ResponseFactory,
    @inject("core:unifier:current-entity-dictionary") entityDictionary: unifierInterfaces.EntityDictionary,
    @inject("core:state-machine:current-state-machine") machine: stateMachineInterfaces.StateMachine,
    @inject("core:unifier:current-session-factory") sessionFactory: () => servicesInterfaces.Session,
    @inject("core:unifier:user-entity-mappings") mappings: unifierInterfaces.GeneratorEntityMapping
  ) {
    this.i18n = i18n;
    this.responseFactory = responseFactory;
    this.entities = entityDictionary;
    this.machine = machine;
    this.mappings = mappings;
    this.sessionFactory = sessionFactory;
  }

  async invokeGenericIntent() {
    let promises = await Promise.all([this.unserializeHook(), this.storeCurrentEntitiesToSession()]);
    let context = promises[0];

    if (typeof context === "undefined" || context === null ) throw new Error("HookContext must not be undefined!");
    this.responseFactory.createVoiceResponse().prompt(this.i18n.t("." + context.neededEntity));
    return null;
  }

  answerPromptIntent() {
    return this.unserializeHook().then(context => {
      let promptedEntity = this.getEntityConfiguration(context.neededEntity);

      if (this.entities.contains(promptedEntity)) {
        return this.sessionFactory().delete("entities:currentPrompt").then(() => {
          return this.applyStoredEntities();
        }).then(() => {
          this.entities.set(context.neededEntity, this.entities.get(promptedEntity));
          this.entities.set(promptedEntity, undefined);
          return this.machine.redirectTo(context.state, context.intent.replace("GenericIntent", "").replace("Intent", ""));
        });
      } else {
        return this.machine.handleIntent("unhandledIntent");
      }
    });
  }

  helpGenericIntent() {
    return this.unserializeAndPrompt();
  }

  cancelGenericIntent() {
    this.responseFactory.createVoiceResponse().endSessionWith(this.i18n.t());
  }

  unhandledIntent() {
    return this.unserializeAndPrompt();
  }

  private unserializeAndPrompt() {
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

  private getEntityConfiguration(name: string): string {
    let searchedEntity: string | undefined = this.mappings[name];

    if (searchedEntity === undefined)
      throw new Error("Could not find entity configuration for " + name);
    return searchedEntity;
  }

  private unserializeHook(): Promise<HookContext> {
    return this.sessionFactory().get("entities:currentPrompt").then(serializedHook => {
      return JSON.parse(serializedHook) as HookContext;
    });
  }

  /** Stores all entities currently present in entity dictionary into session. */
  private storeCurrentEntitiesToSession() {
    this.entities.storeToSession(this.sessionFactory(), "entities:currentPrompt:previousEntities");
  }

  /** Opposite of storeCurrentEntitiesToSession() */
  private async applyStoredEntities() {
    await this.entities.readFromSession(this.sessionFactory(), true, "entities:currentPrompt:previousEntities");
    return this.sessionFactory().delete("entities:currentPrompt:previousEntities");
  }
}
