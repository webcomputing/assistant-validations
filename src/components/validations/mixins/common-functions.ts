import { BasicAnswerTypes, Constructor, featureIsAvailable, OptionalHandlerFeatures, SuggestionChipsMixin } from "assistant-source";
import { COMPONENT_NAME } from "../private-interfaces";
import { CommonFunctionsMixinInstance, CommonFunctionsMixinRequirements, HookContext, sessionKeys, ValidationStrategy } from "../public-interfaces";
/**
 * Add common functions that are used in the different validation states through this mixin.
 *
 * Note: I'd like to just infer the return type to get all the super classes' properties and modifiers. However, there's a private member
 * in `BaseState` and TypeScript does not allow to mixin with other than public. Moreover, I cannot just extend `BaseState` due to an
 * issue with type definition for `logger`.
 */
export function CommonFunctionsMixin<T extends Constructor<CommonFunctionsMixinRequirements>>(superState: T): T & Constructor<CommonFunctionsMixinInstance> {
  return class extends superState implements CommonFunctionsMixinInstance {
    /**
     * Unserializes hook context
     */
    public async unserializeHookContext<Strategy extends ValidationStrategy.Confirmation | ValidationStrategy.Prompt>() {
      const serializedHook = await this.sessionFactory().get(sessionKeys.context);

      if (serializedHook) {
        return JSON.parse(serializedHook) as HookContext<Strategy>;
      }

      throw new Error("HookContext must not be undefined!");
    }

    /**
     * Gives options for the logger
     */
    public getLoggerOptions() {
      return { component: COMPONENT_NAME };
    }

    /**
     * Create message when invoking the state together with a log message and possible suggestionchips
     * @param loggerMessage message to write to the debug logger
     * @param suggestionChipsLookupString lookupString containing the information where to find the suggestionChips translation
     * @param translationArgs additional arguments for the translation helper
     */
    public async handleInvokeMessage(loggerMessage, suggestionChipsLookupString?: string, ...translationArgs: any[]) {
      this.logger.debug(this.getLoggerOptions(), loggerMessage);
      this.responseHandler.prompt(this.t(...translationArgs));
      await this.setSuggestionChips(suggestionChipsLookupString);
    }

    /**
     * Sets suggestionChips if the feature is available and they can be found
     * @param lookupString lookupString containing the information where to find the suggestionChips translation
     */
    public async setSuggestionChips(lookupString: string = ".suggestionChips") {
      try {
        if (featureIsAvailable(this.responseHandler, OptionalHandlerFeatures.FeatureChecker.SuggestionChips)) {
          (this.responseHandler as unknown as SuggestionChipsMixin<BasicAnswerTypes>).setSuggestionChips(await this.translateHelper.getAllAlternatives(lookupString));
        } else {
          this.logger.debug(`Current response handler doesn't support suggestion chips, so not setting any. Lookupstring = ${lookupString}`);
        }
      } catch {
        this.logger.debug(`Didn't find any suggestion chips for Lookupstring = ${lookupString}, so not setting any`);
      }
    }
  };
}
