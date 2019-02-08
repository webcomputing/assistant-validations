import { BaseState, BasicAnswerTypes, BasicHandable, Constructor, Mixin } from "assistant-source";
import { CommonFunctionsMixinInstance, CommonFunctionsMixinRequirements, HookContext, sessionKeys, ValidationStrategy } from "../public-interfaces";

/**
 * Add common functions that are used in the different validation states through this mixin
 */
export function CommonFunctionsMixin<T extends Constructor<CommonFunctionsMixinRequirements>>(superState: T): Mixin<CommonFunctionsMixinInstance> & T {
  return class extends superState {
    public async unserializeHook(strategy, sessionKey) {
      const serializedHook = await this.sessionFactory().get(sessionKey);

      if (serializedHook) {
        return JSON.parse(serializedHook) as HookContext<typeof strategy>;
      }

      throw new Error("HookContext cannot be undefined.");
    }
  };
}
