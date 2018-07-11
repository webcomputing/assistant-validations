export const needsMetadataKey = Symbol("metadata-key: needs");

export function needs(...entities: string[]) {
  return function(targetClass: any, methodName: string, decorator: any) {
    Reflect.defineMetadata(needsMetadataKey, entities, targetClass[methodName]);
  };
}
