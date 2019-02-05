import { BasicAnswerTypes, BasicHandable, BasicHandler } from "assistant-source";
import { PromptState } from "./prompt-state";

export class MyPromptState<MergedAnswerTypes extends BasicAnswerTypes, MergedHandler extends BasicHandable<MergedAnswerTypes>> extends PromptState<
  MergedAnswerTypes,
  MergedHandler
> {
  /** Always return false */
  public entityIsContained(entityType: string) {
    return false;
  }
}
