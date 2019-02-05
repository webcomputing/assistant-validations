import { BasicAnswerTypes, BasicHandable } from "assistant-source";
import { ConfirmationState } from "./confirmation-state";

export class MyConfirmationState<MergedAnswerTypes extends BasicAnswerTypes, MergedHandler extends BasicHandable<MergedAnswerTypes>> extends ConfirmationState<
  MergedAnswerTypes,
  MergedHandler
> {}
