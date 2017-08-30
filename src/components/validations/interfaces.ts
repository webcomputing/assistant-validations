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
   * @param promptStateName (optional) Name of prompt state to transition to, defaults to "PromptState"
   */
  (intent: string, stateName: string, machine: stateMachineInterfaces.Transitionable, promptStateName?: string): Prompt;
}

export interface Prompt {
  /** Starts prompting for a parameter
   * @param parameter string The parameter to prompt for
   * @param tellInvokeMessage boolean If set to true (default), sends response to ask the user for the parameter
   */
  prompt(parameter: string, tellInvokeMessage?: boolean): Promise<void>;
}