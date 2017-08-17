import { stateMachineInterfaces } from "assistant-source";

export interface HookContext {
  intent: string;
  state: string;
  neededEntity: string;
}

export interface PromptFactory {
  /** Creates a prompt. Needed to prompt for a parameter.
   * @param intent Name of the current intent
   * @param stateName Name of the current state
   * @param machine Reference to Transitionable object
   */
  (intent: string, stateName: string, machine: stateMachineInterfaces.Transitionable): Prompt;
}

export interface Prompt {
  /** Starts prompting for a parameter
   * @param parameter string The parameter to prompt for
   * @param invokeIntent boolean If set to true (default), uses a 'redirectTo' instead of a 'transitionTo'. 
   *        This will cause the PromptState.invokeGenericIntent to be called immediately, which will ask for the user with a customizable text for the parameter.
   */
  prompt(parameter: string, invokeIntent?: boolean): Promise<void>;
}