import { Hooks, Component } from "inversify-components";
import { injectable, inject } from "inversify";
import { unifierInterfaces, stateMachineInterfaces } from "assistant-source";

import { needsMetadataKey } from "./annotations";
import { PromptFactory } from "./interfaces";
import { log } from "../../global";

@injectable()
export class BeforeIntentHook {
  private entities: unifierInterfaces.EntityDictionary;
  private promptFactory: PromptFactory;
  private target: stateMachineInterfaces.State;
  private stateName: string;
  private method: string;
  private neededParams: string[] = [];

  constructor(
    @inject("core:unifier:current-entity-dictionary") entities: unifierInterfaces.EntityDictionary,
    @inject("validations:current-prompt-factory") promptFactory: PromptFactory
  ) {
    this.entities = entities;
    this.promptFactory = promptFactory;
  }

  execute: Hooks.Hook = (success, failure, mode, state, stateName, intent, machine) => {
    this.target = state;
    this.stateName = stateName;
    this.method = intent;

    this.retrieveNeededParamsFromMetadata();

    if (this.neededParams.length > 0) {
      let unknownParam = this.neededParams.filter(p => !this.currentRequestHasParam(p))[0];

      if (typeof(unknownParam) !== "undefined") {
        this.promptFactory(this.method, this.stateName, machine)
          .prompt(unknownParam)
          .catch(reason => { failure(unknownParam); throw new Error(reason); })
          .then(() => failure(unknownParam));
        return ; // Dont execute the success() below, but wait for saveToContext to finish and respond with catch() or then() then.
      }
    }

    // In all alternative cases, continue processing
    success();
  }

  /** Checks if current request already has the given parameter
   * @param parameter The parameter to check existance of
   */
  private currentRequestHasParam(entities: string): boolean {
    return this.entities.contains(entities);
  }

  /** Sets this.neededParams based on Reflect.getMetadata result = based from what is stored into @needs(..) */
  private retrieveNeededParamsFromMetadata() {
    if (typeof(this.target[this.method]) === "undefined") return;
    let neededParams = Reflect.getMetadata(needsMetadataKey, this.target[this.method]);

    log("Retrieving @needs annotations for " + this.target.constructor.name + " and " + this.method + ":", neededParams);

    if (typeof(neededParams) !== "undefined" && neededParams.constructor === Array) {

      if ((neededParams as any[]).filter(param => typeof(param) !== "string").length > 0)
        throw new TypeError("Only strings are allowed as parameter identifiers!");

      this.neededParams = neededParams;
    }
  }
}