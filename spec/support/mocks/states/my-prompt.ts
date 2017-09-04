import { PromptState } from "../../../../src/components/validations/states/prompt";

export class MyPromptState extends PromptState {
  /** Always return true */
  entityIsContained(entityType: string) {
    return false;
  }
}