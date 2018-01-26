import { GenericIntent, Transitionable, Session } from "assistant-source";
import { HookContext, Prompt as PromptInterface } from "./public-interfaces";
import { log } from "../../global";

export class Prompt implements PromptInterface {
  private machine: Transitionable;
  private session: Session;
  private intent: string;
  private stateName: string;

  private promptStateName: string;
  private redirectArguments: any[];

  constructor(machine: Transitionable, session: Session, intent: string, stateName: string, promptStateName: string, redirectArguments: any[] = []) {
    this.machine = machine;
    this.session = session;

    this.intent = intent;
    this.stateName = stateName;

    this.promptStateName = promptStateName;
    this.redirectArguments = redirectArguments;
  }

  prompt(entity: string, tellInvokeMessage = true) {
    log("Prompting for " + entity);
    return this.saveToContext(entity).then(() => {
      return this.switchStateForRetrieval(tellInvokeMessage);
    });
  }

  /** Switches state to prompt state, to retrieve new parameter. */
  switchStateForRetrieval(tellInvokeMessage = true) {
    if (this.promptStateName === "PromptState" && !this.machine.stateExists("PromptState")) throw new Error("Tried to transition to generic 'PromptState', but was not registered. "+
      "Did you register the PromptState out of assistant-validations in your index.ts?");
    
    return this.machine.redirectTo(this.promptStateName, GenericIntent.Invoke, tellInvokeMessage);
  }

  /** Saves information about new retrieval request into context object
   * Stores current state, current intent and the given entity name
   * @param entity The needed entity to retrieve
   * @return promise, after storing all to session
   */
  saveToContext(entity: string): Promise<void> {
    let context: HookContext =  {
      intent: this.intent,
      state: this.stateName,
      neededEntity: entity,
      redirectArguments: this.redirectArguments
    };

    return this.session.set("entities:currentPrompt", JSON.stringify(context));
  }
}