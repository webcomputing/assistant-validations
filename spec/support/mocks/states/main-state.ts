// tslint:disable:no-empty
import { State } from "assistant-source";
import { injectable } from "inversify";
import { needs, needsConfirmation, needsEntities } from "../../../../src/components/validations/decorators";

@injectable()
export class MainState implements State.Required {
  @needsEntities(["city"])
  public testIntent() {}

  @needsEntities(["city", "amount"])
  public testManyIntent() {}

  @needsEntities({ entities: ["city", "amount"], promptStateName: "MyPromptState" })
  public testCustomPromptStateIntent() {}

  public noDecoratorsIntent() {}

  @needsConfirmation()
  public needsConfirmationIntent() {}

  @needsConfirmation({ confirmationStateName: "MyConfirmationState" })
  public needsConfirmationCustomStateIntent() {}

  public unhandledGenericIntent() {}
  public unansweredGenericIntent() {}
}
