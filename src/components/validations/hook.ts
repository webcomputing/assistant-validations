import { Component } from "inversify-components";
import { injectable, inject } from "inversify";
import { EntityDictionary, State, Hooks, injectionNames, Logger, ComponentSpecificLoggerFactory } from "assistant-source";

import { needsMetadataKey } from "./annotations";
import { COMPONENT_NAME } from "./name";
import { PromptFactory, injectionNames as ownInjectionNames } from "./public-interfaces";

@injectable()
export class BeforeIntentHook {
  private target: State.Required;
  private stateName: string;
  private method: string;
  private neededParams: string[] = [];
  private logger: Logger;

  constructor(
    @inject(injectionNames.current.entityDictionary) private entities: EntityDictionary,
    @inject(ownInjectionNames.current.promptFactory) private promptFactory: PromptFactory,
    @inject(injectionNames.componentSpecificLoggerFactory) loggerFactory: ComponentSpecificLoggerFactory
  ) { 
    this.logger = loggerFactory(COMPONENT_NAME);
  }

  execute: Hooks.BeforeIntentHook = async (mode, state, stateName, intent, machine, ...args: any[]) => {
    this.target = state;
    this.stateName = stateName;
    this.method = intent;

    this.retrieveNeededParamsFromMetadata();

    if (this.neededParams.length > 0) {
      let unknownParam = this.neededParams.filter(p => !this.currentRequestHasParam(p))[0];

      if (typeof(unknownParam) !== "undefined") {
        this.logger.info("Missing required entity "+ unknownParam +" in current entity store");
        await this.promptFactory(this.method, this.stateName, machine, undefined, args).prompt(unknownParam);
        return false;
      }
    }

    return true;
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

    if (typeof neededParams !== "undefined" && neededParams.constructor === Array) {

      this.logger.debug("Retrieving @needs annotations for " + this.target.constructor.name + " and " + this.method + ":");

      if ((neededParams as any[]).filter(param => typeof(param) !== "string").length > 0)
        throw new TypeError("Only strings are allowed as parameter identifiers!");

      this.neededParams = neededParams;
    }
  }
}