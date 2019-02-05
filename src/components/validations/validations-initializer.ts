import { inject, injectable } from "inversify";
import { Component, getMetaInjectionName } from "inversify-components";
import { COMPONENT_NAME, Configuration } from "./private-interfaces";
import { InitializerOptions } from "./public-interfaces";
import { ConfirmationTransition } from "./transitions/confirmation-transition";
import { PromptTransition } from "./transitions/prompt-transition";

@injectable()
export class ValidationsInitializer {
  constructor(
    @inject(getMetaInjectionName(COMPONENT_NAME))
    private component: Component<Configuration.Runtime>,
    @inject(PromptTransition) private promptTransition: PromptTransition,
    @inject(ConfirmationTransition) private confirmationTransition: ConfirmationTransition
  ) {}

  /**
   * Initializes a prompt by switchting state to prompt state. Is called automatically when using decorators.
   * @param {string} redirectStateName Name of state to redirect to if prompt is finished, mostly it's the current state
   * @param {string} redirectIntentName Name of intent to redirect to if prompt is finished, mostly it's the current intent
   * @param {string} entityName Entity to prompt for
   * @param {Partial<InitializerOptions.Prompt>} options See description of each option for more info
   * @return {Promise<void>} Promise telling you when redirection to prompt state was successful
   */
  public async initializePrompt(
    redirectStateName: string,
    redirectIntentName: string,
    entityName: string,
    options?: Partial<InitializerOptions.Prompt>
  ): Promise<void> {
    const mergedOptions = this.mergeTransitionOptions(options, "promptStateName", "defaultPromptState");

    return this.promptTransition.transition(
      entityName,
      redirectStateName,
      redirectIntentName,
      mergedOptions.redirectArguments,
      mergedOptions.promptStateName,
      mergedOptions.tellInvokeMessage
    );
  }

  /**
   * Initializes a confirmation by switching state to confirmation state. Is called automatically when using decorators.
   * @param {string} redirectStateName Name of state to redirect to after confirmation was finished
   * @param {string} redirectIntentName Name of intent to redirect to after confirmation was finished
   * @param {Partial<InitializerOptions.Confirmation>} options See description of each option for more info
   * @return {Promise<void>} Promise telling you when redirection to prompt state was successful
   */
  public async initializeConfirmation(
    redirectStateName: string,
    redirectIntentName: string,
    options?: Partial<InitializerOptions.Confirmation>
  ): Promise<void> {
    const mergedOptions = this.mergeTransitionOptions(options, "confirmationStateName", "defaultConfirmationState");

    return this.confirmationTransition.transition(
      redirectStateName,
      redirectIntentName,
      mergedOptions.redirectArguments,
      mergedOptions.confirmationStateName,
      mergedOptions.tellInvokeMessage
    );
  }

  /** Since InitializerOptions.Prompt and InitializerOptions.Confirmation are so similar, the strategy for merging them is identical */
  private mergeTransitionOptions<OptionType>(
    options: Partial<OptionType> | undefined,
    defaultStateInitializerOption: keyof OptionType,
    defaultStateConfigurationOptions: keyof Configuration.Defaults
  ): OptionType {
    // Remove "defaultPromptState" if undefined, otherwise, we would override the default option for this
    if (options && typeof options[defaultStateInitializerOption] === "undefined") {
      delete options[defaultStateInitializerOption];
    }

    // Get real option values by merging given options with default ones
    const defaultOptions: OptionType = {
      tellInvokeMessage: true,
      [defaultStateInitializerOption]: this.component.configuration[defaultStateConfigurationOptions],
      redirectArguments: [],
    } as any; // typing to OptionType does not work here

    return { ...defaultOptions, ...options };
  }
}
