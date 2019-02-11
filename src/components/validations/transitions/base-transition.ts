import { CurrentSessionFactory, GenericIntent, Transitionable } from "assistant-source";
import { injectable, unmanaged } from "inversify";
import { Component } from "inversify-components";
import { Configuration } from "../private-interfaces";
import { HookContext, sessionKeys, ValidationStrategy } from "../public-interfaces";

/** Base class for all transitions to bundle common behaviour */

@injectable()
export abstract class BaseTransition {
  protected defaultConfiguration: Configuration.Runtime;

  constructor(
    @unmanaged() protected currentSessionFactory: CurrentSessionFactory,
    @unmanaged() protected machine: Transitionable,
    @unmanaged() private component: Component<Configuration.Runtime>
  ) {
    this.defaultConfiguration = this.component.configuration;
  }

  /** Switches state to your given validation state, e. g. to retrieve a new entity. */
  protected switchState(validationStateName: string, defaultConfigurationKey: keyof Configuration.Defaults, tellInvokeMessage = true) {
    if (
      validationStateName === this.defaultConfiguration[defaultConfigurationKey] &&
      !this.machine.stateExists(this.defaultConfiguration[defaultConfigurationKey])
    ) {
      throw new Error(
        `Tried to transition to your default "${
          this.defaultConfiguration[defaultConfigurationKey]
        }", but was not registered. Please register a state with this name or change the ${defaultConfigurationKey} in your config/components.ts.`
      );
    }

    return this.machine.redirectTo(validationStateName, GenericIntent.Invoke, tellInvokeMessage);
  }

  /**
   * Saves information about new validation / transition into context object
   * Stores current state, current intent and validation-specific-options
   * @param {string} redirectState state to redirect to
   * @param {string} redirectIntent state to redirect to
   * @param {any[]} redirectArguments arguments we are passing to the redirected state
   * @param {ValidationStrategy} validationSpecificContext context arguments for this validation type
   * @return promise with full hook context, after storing everything to session
   */
  protected async saveToContext<UsedValidationStrategy extends ValidationStrategy.Prompt | ValidationStrategy.Confirmation>(
    redirectState: string,
    redirectIntent: string,
    redirectArguments: any[],
    validationSpecificContext: UsedValidationStrategy
  ): Promise<HookContext<UsedValidationStrategy>> {
    const context: HookContext<UsedValidationStrategy> = {
      redirectArguments,
      intent: redirectIntent,
      state: redirectState,
      validation: validationSpecificContext,
    };

    await this.currentSessionFactory().set(sessionKeys.context, JSON.stringify(context));

    return context;
  }
}
