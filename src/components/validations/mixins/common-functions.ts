import { BaseState, BasicAnswerTypes, BasicHandable, Constructor } from "assistant-source";
import { COMPONENT_NAME } from "../private-interfaces";
import { CommonFunctionsMixinInstance, ConfirmationStateMixinRequirements as A, HookContext, ValidationStrategy } from "../public-interfaces";

export type CommonFunctionsInstanceRequirements = BaseState<BasicAnswerTypes, BasicHandable<BasicAnswerTypes>> & A;
/**
 * Add common functions that are used in the different validation states through this mixin
 */
export function CommonFunctionsMixin<T extends CommonFunctionsInstanceRequirements>(
  superState: Constructor<T>
): Constructor<CommonFunctionsMixinInstance & CommonFunctionsInstanceRequirements & T> {
  // prettier-ignore
  return class extends (superState as any) {
    public async unserializeHook<Strategy extends ValidationStrategy.Confirmation | ValidationStrategy.Prompt>(sessionKey: string) {
      const serializedHook = await this.sessionFactory().get(sessionKey);

      if (serializedHook) {
        return JSON.parse(serializedHook) as HookContext<Strategy>;
      }

      throw new Error("HookContext cannot be undefined.");
    }

    public getLoggerOptions() {
      return { component: COMPONENT_NAME };
    }

    public handleInvokeMessage(loggerMessage, ...translationArgs: any[]) {
      this.logger.debug(this.getLoggerOptions(), loggerMessage);
      this.responseHandler.prompt(this.translateHelper.t(...translationArgs));
    }

    // Without this the usage of this mixin for other mixins fail as return isn't properly typed with T - possible typescript error
  } as Constructor<CommonFunctionsMixinInstance & CommonFunctionsInstanceRequirements & T>
  // Warning: Typing of this function is therefore no more correct, e.g. removing unserializeHook doesn't give an error
}
