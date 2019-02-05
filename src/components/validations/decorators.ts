import { DecoratorContent } from "./public-interfaces";

export const decoratorSymbols = {
  needsEntities: Symbol("decorator: @needsEntities"),
  needsConfirmation: Symbol("decorator: @needsConfirmation"),
};

/** Only execute the decorated intent (or any intent in the decorated state) if all given entites are present. Asks for unpresent entities. */
export function needsConfirmation(opts?: DecoratorContent.Confirmation) {
  return function(targetClass: any, methodName: string) {
    const decoratorInput: DecoratorContent.Confirmation = opts ? opts : {};
    Reflect.defineMetadata(decoratorSymbols.needsConfirmation, decoratorInput, targetClass[methodName]);
  };
}

/** Only execute the decorated intent (or any intent in the decorated state) if all given entites are present. Asks for unpresent entities. */
export function needsEntities(opts: string[] | { promptStateName: string; entities: string[] }) {
  const entities = Array.isArray(opts) ? opts : opts.entities;
  const promptStateName = Array.isArray(opts) ? undefined : opts.promptStateName;

  return function(targetClass: any, methodName: string) {
    const decoratorInput: DecoratorContent.NeedsEntity = { entities, promptStateName };
    Reflect.defineMetadata(decoratorSymbols.needsEntities, decoratorInput, targetClass[methodName]);
  };
}

/** @deprecated Please use {@link needsEntities} instead. */
export function needs(...entities: string[]) {
  // tslint:disable-next-line:no-console
  console.warn("@needs is deprecated. Use @needsEntities instead.");
  return needsEntities(entities);
}
