import { stateMachineInterfaces } from "assistant-source";

export interface HookContext {
  intent: string;
  state: string;
  neededEntity: string;
}

export interface PromptFactory {
  (intent: string, stateName: string, machine: stateMachineInterfaces.Transitionable): Prompt;
}

export interface Prompt {
  prompt(parameter: string): Promise<void>;
}