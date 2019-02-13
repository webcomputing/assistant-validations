// tslint:disable:max-classes-per-file

import { BaseState, BasicAnswerTypes, BasicHandable, CurrentSessionFactory, injectionNames, State } from "assistant-source";
import { inject, injectable, unmanaged } from "inversify";
import { ConfirmationStateMixin, ConfirmationStateMixinRequirements } from "../../../../src/assistant-validations";

class ConfirmationStateRequirements<MergedAnswerTypes extends BasicAnswerTypes, MergedHandler extends BasicHandable<MergedAnswerTypes>> extends BaseState<
  MergedAnswerTypes,
  MergedHandler
> implements ConfirmationStateMixinRequirements {
  constructor(@unmanaged() stateSetupSet: State.SetupSet<MergedAnswerTypes, MergedHandler>, @unmanaged() public sessionFactory: CurrentSessionFactory) {
    super(stateSetupSet);
  }
}

@injectable()
export class ConfirmationState<
  MergedAnswerTypes extends BasicAnswerTypes,
  MergedHandler extends BasicHandable<MergedAnswerTypes>
> extends ConfirmationStateMixin(ConfirmationStateRequirements) {
  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: State.SetupSet<MergedAnswerTypes, MergedHandler>,
    @inject(injectionNames.current.sessionFactory) sessionFactory: CurrentSessionFactory
  ) {
    super(setupSet, sessionFactory);
  }
}
