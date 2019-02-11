import { BasicAnswerTypes, Constructor, featureIsAvailable, OptionalHandlerFeatures, SuggestionChipsMixin } from "assistant-source";
import { COMPONENT_NAME } from "../private-interfaces";
import { CommonFunctionsInstanceRequirements, CommonFunctionsMixinInstance, HookContext, sessionKeys, ValidationStrategy } from "../public-interfaces";
/**
 * Add common functions that are used in the different validation states through this mixin
 */
export function CommonFunctionsMixin<T extends CommonFunctionsInstanceRequirements>(
  superState: Constructor<T>
): Constructor<CommonFunctionsMixinInstance & CommonFunctionsInstanceRequirements & T> {
  // prettier-ignore
  return class extends (superState as any) {

     /**
      * Unserializes hook context
      */
    public async unserializeHook<Strategy extends ValidationStrategy.Confirmation | ValidationStrategy.Prompt>() {
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
     * Create message when invoking the state together with a log message
     * @param loggerMessage message to write to the debug logger
     * @param suggestionChipsLookupString lookupString containing the information where to find the suggestionChips translation
     * @param translationArgs additional arguments for the translation helper
     */
    public async handleInvokeMessage(loggerMessage, suggestionChipsLookupString?: string, ...translationArgs: any[]) {
      this.logger.debug(this.getLoggerOptions(), loggerMessage);
      this.responseHandler.prompt(this.translateHelper.t(...translationArgs));
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

    // Without this the usage of this mixin for other mixins fail as return isn't properly typed with T - possible typescript error
  } as Constructor<CommonFunctionsMixinInstance & CommonFunctionsInstanceRequirements & T>
  // Warning: Typing of this function is therefore no more correct, e.g. removing unserializeHook doesn't give an error
}
