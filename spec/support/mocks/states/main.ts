// tslint:disable:no-empty
import { injectable } from "inversify";
import { needs } from "../../../../src/components/validations/annotations";

@injectable()
export class MainState {
  @needs("city")
  public testIntent() {}

  @needs("city", "amount")
  public testManyIntent() {}

  public noEntitiesIntent() {}
}
