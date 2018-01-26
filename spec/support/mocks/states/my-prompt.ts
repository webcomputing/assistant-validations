import { PromptStateMixin } from "../../../../src/components/validations/prompt-state-mixin";
import { PromptState } from "./prompt";

export class MyPromptState extends PromptStateMixin(PromptState) {
  /** Always return true */
  entityIsContained(entityType: string) {
    return false;
  }
}