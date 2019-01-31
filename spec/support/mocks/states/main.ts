// tslint:disable:no-empty
import { State } from "assistant-source";
import { injectable } from "inversify";
import { needs } from "../../../../src/components/validations/decorators";

@injectable()
export class MainState implements State.Required {
  @needs("city")
  public testIntent() {}

  @needs("city", "amount")
  public testManyIntent() {}

  public noEntitiesIntent() {}

  public unhandledGenericIntent() {}
  public unansweredGenericIntent() {}
}
