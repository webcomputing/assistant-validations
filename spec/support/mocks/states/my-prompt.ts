import { BasicAnswerTypes, BasicHandable } from "assistant-source";
import { PromptStateMixin } from "../../../../src/components/validations/states/prompt-state-mixin";
import { PromptState } from "./prompt";

export class MyPromptState extends PromptStateMixin(PromptState)<BasicAnswerTypes, BasicHandable<BasicAnswerTypes>> {
  /** Always return false */
  public entityIsContained(entityType: string) {
    return false;
  }
}
