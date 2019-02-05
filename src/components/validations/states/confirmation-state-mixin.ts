import { Constructor } from "assistant-source";
import { ConfirmationStateMixinInstance, ConfirmationStateMixinRequirements } from "../public-interfaces";

export function ConfirmationStateMixin<T extends Constructor<ConfirmationStateMixinRequirements>>(
  superState: T
): Constructor<ConfirmationStateMixinInstance & ConfirmationStateMixinRequirements> {
  return class extends superState {};
}
