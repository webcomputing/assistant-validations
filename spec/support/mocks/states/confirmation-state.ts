// tslint:disable:max-classes-per-file

import { BaseState, BasicAnswerTypes, BasicHandable, injectionNames, State } from "assistant-source";
import { inject, injectable } from "inversify";
import { ConfirmationStateMixin, ConfirmationStateMixinRequirements } from "../../../../src/assistant-validations";

class ConfirmationStateRequirements<MergedAnswerTypes extends BasicAnswerTypes, MergedHandler extends BasicHandable<MergedAnswerTypes>> extends BaseState<
  MergedAnswerTypes,
  MergedHandler
> implements ConfirmationStateMixinRequirements {}

@injectable()
export class ConfirmationState<
  MergedAnswerTypes extends BasicAnswerTypes,
  MergedHandler extends BasicHandable<MergedAnswerTypes>
> extends ConfirmationStateMixin(ConfirmationStateRequirements) {
  constructor(@inject(injectionNames.current.stateSetupSet) setupSet: State.SetupSet<MergedAnswerTypes, MergedHandler>) {
    super(setupSet);
  }
}
