import { BasicAnswerTypes, BasicHandable, BasicHandler } from "assistant-source";
import { ValidationStrategy } from "../../../../src/assistant-validations";
import { PromptState } from "./prompt-state";

export class MyPromptState<MergedAnswerTypes extends BasicAnswerTypes, MergedHandler extends BasicHandable<MergedAnswerTypes>> extends PromptState<
  MergedAnswerTypes,
  MergedHandler
> {
  /** Always return false */
  public entityIsContained(entityType: string) {
    return false;
  }

  /** Override the translation convention */
  public async getTranslationConvention() {
    const context = await this.unserializeHookContext<ValidationStrategy.Prompt>();
    return `.${context.validation.neededEntity}`;
  }
}
