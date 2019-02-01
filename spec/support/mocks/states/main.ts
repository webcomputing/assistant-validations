// tslint:disable:no-empty
import { State } from "assistant-source";
import { injectable } from "inversify";
import { needs, needsEntities } from "../../../../src/components/validations/decorators";

@injectable()
export class MainState implements State.Required {
  @needsEntities(["city"])
  public testIntent() {}

  @needsEntities(["city", "amount"])
  public testManyIntent() {}

  public noEntitiesIntent() {}

  public unhandledGenericIntent() {}
  public unansweredGenericIntent() {}
}
