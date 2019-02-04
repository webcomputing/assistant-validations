import { CurrentSessionFactory, GenericIntent, injectionNames, Session, Transitionable } from "assistant-source";
import { inject, injectable } from "inversify";
import { defaultConfiguration } from "../descriptor";
import { HookContext, sessionKeys, ValidationStrategy } from "../public-interfaces";

/** Transitions to prompt state to prompt for a specific entity. Prepares everything that transition works out of the box. */

@injectable()
export class PromptTransition {
  constructor(
    @inject(injectionNames.current.sessionFactory) private currentSessionFactory: CurrentSessionFactory,
    @inject(injectionNames.current.stateMachine) private machine: Transitionable
  ) {}

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
    await this.saveToContext(entity, redirectState, redirectIntent, redirectArguments);
    return this.switchStateForRetrieval(promptStateName, tellInvokeMessage);
  }

  /** Switches state to prompt state, to retrieve new parameter. */
  private switchStateForRetrieval(promptStateName: string, tellInvokeMessage = true) {
    if (promptStateName === defaultConfiguration.defaultPromptState && !this.machine.stateExists(defaultConfiguration.defaultPromptState)) {
      throw new Error(
        `Tried to transition to generic "${
          defaultConfiguration.defaultPromptState
        }", but was not registered. Please register a prompt state with this name or change the defaultPromptState.`
      );
    }

    return this.machine.redirectTo(promptStateName, GenericIntent.Invoke, tellInvokeMessage);
  }

  /**
   * Saves information about new retrieval request into context object
   * Stores current state, current intent and the given entity name
   * @param entity The needed entity to retrieve
   * @param {string} redirectState state to redirect to
   * @param {string} redirectIntent state to redirect to
   * @param {any[]} redirectArguments arguments we are passing to the redirected state
   * @return promise, after storing all to session
   */
  private saveToContext(entity: string, redirectState: string, redirectIntent: string, redirectArguments: any[]): Promise<void> {
    const context: HookContext<ValidationStrategy.Prompt> = {
      redirectArguments,
      intent: redirectIntent,
      state: redirectState,
      validation: {
        type: "prompt",
        neededEntity: entity,
      },
    };

    return this.currentSessionFactory().set(sessionKeys.prompt.context, JSON.stringify(context));
  }
}
