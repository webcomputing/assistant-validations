import { CurrentSessionFactory, GenericIntent, injectionNames, Transitionable } from "assistant-source";
import { inject, injectable } from "inversify";
import { Component, getMetaInjectionName } from "inversify-components";
import { COMPONENT_NAME, Configuration } from "../private-interfaces";
import { BaseTransition } from "./base-transition";

/** Transitions to confirmation state to confirm an intent call. */

@injectable()
export class ConfirmationTransition extends BaseTransition {
  constructor(
    @inject(injectionNames.current.sessionFactory) currentSessionFactory: CurrentSessionFactory,
    @inject(injectionNames.current.stateMachine) machine: Transitionable,
    @inject(getMetaInjectionName(COMPONENT_NAME))
    component: Component<Configuration.Runtime>
  ) {
    super(currentSessionFactory, machine, component);
  }

  /**
   * Transitions to confirmation state to confirm an intent call
   * @param {string} redirectState state to redirect to
   * @param {string} redirectIntent state to redirect to
   * @param {any[]} redirectArguments arguments we are passing to the redirected state
   * @param {string} confirmationStateName confirmation state name to use for prompting
   * @param {boolean} tellInvokeMessage If set to false, no invoke message will be emitted
   */
  public async transition(redirectState: string, redirectIntent: string, redirectArguments: any[], confirmationStateName: string, tellInvokeMessage: boolean) {
    await this.saveToContext(redirectState, redirectIntent, redirectArguments, { type: "confirmation" });
    return this.switchState(confirmationStateName, "defaultConfirmationState", tellInvokeMessage);
  }
}
