import { BasicAnswerTypes, BasicHandable } from "assistant-source";
import { PromptStateMixin } from "../../../../src/components/validations/prompt-state-mixin";
import { PromptState } from "./prompt";

export class MyPromptState extends PromptStateMixin(PromptState) {
  /** Always return false */
  public entityIsContained(entityType: string) {
    return false;
  }
}
