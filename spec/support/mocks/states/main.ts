import { stateMachineInterfaces } from "assistant-source";
import { needs } from "../../../../src/components/validations/annotations";
import { injectable } from "inversify";

@injectable()
export class MainState {

  @needs("city")
  testIntent() {
  }

  @needs("city", "amount")
  testManyIntent() {
  }

  noEntitiesIntent() {
    
  }
}