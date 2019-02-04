import { inject, injectable } from "inversify";
import { Component, getMetaInjectionName } from "inversify-components";
import { COMPONENT_NAME, Configuration } from "./private-interfaces";
import { InitializerOptions } from "./public-interfaces";
import { PromptTransition } from "./transitions/prompt-transition";

@injectable()
export class ValidationsInitializer {
  constructor(
    @inject(getMetaInjectionName(COMPONENT_NAME))
    private component: Component<Configuration.Runtime>,
    @inject(PromptTransition) private promptTransition: PromptTransition
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
    // Remove "defaultPromptState" if undefined, otherwise, we would override the default option for this
    if (options && typeof options.promptStateName === "undefined") {
      delete options.promptStateName;
    }

    // Get real option values by merging given options with default ones
    const defaultOptions: InitializerOptions.Prompt = {
      tellInvokeMessage: true,
      promptStateName: this.component.configuration.defaultPromptState,
      redirectArguments: [],
    };
    const mergedOptions = { ...defaultOptions, ...options };

    return this.promptTransition.transition(
      entityName,
      redirectStateName,
      redirectIntentName,
      mergedOptions.redirectArguments,
      mergedOptions.promptStateName,
      mergedOptions.tellInvokeMessage
    );
  }
}
