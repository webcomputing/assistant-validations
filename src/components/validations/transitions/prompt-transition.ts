import { CurrentSessionFactory, GenericIntent, injectionNames, Transitionable } from "assistant-source";
import { inject, injectable } from "inversify";
import { Component, getMetaInjectionName } from "inversify-components";
import { COMPONENT_NAME, Configuration } from "../private-interfaces";
import { BaseTransition } from "./base-transition";

/** Transitions to prompt state to prompt for a specific entity. Prepares everything that transition works out of the box. */

@injectable()
export class PromptTransition extends BaseTransition {
  constructor(
    @inject(injectionNames.current.sessionFactory) currentSessionFactory: CurrentSessionFactory,
    @inject(injectionNames.current.stateMachine) machine: Transitionable,
    @inject(getMetaInjectionName(COMPONENT_NAME))
    component: Component<Configuration.Runtime>
  ) {
    super(currentSessionFactory, machine, component);
  }

  /**
   * Transitions to prompt state to prompt for an entity
   * @param {string} entity entity to prompt for
   * @param {string} redirectState state to redirect to
   * @param {string} redirectIntent state to redirect to
   * @param {any[]} redirectArguments arguments we are passing to the redirected state
   * @param {string} promptStateName prompt state name to use for prompting
   * @param {boolean} tellInvokeMessage If set to false, no invoke message will be emitted
   */
  public async transition(
    entity: string,
    redirectState: string,
    redirectIntent: string,
    redirectArguments: any[],
    promptStateName: string,
    tellInvokeMessage: boolean
  ) {
    await this.saveToContext(redirectState, redirectIntent, redirectArguments, { type: "prompt", neededEntity: entity });
    return this.switchState(promptStateName, "defaultPromptState", tellInvokeMessage);
  }
}
