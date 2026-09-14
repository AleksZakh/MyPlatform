// server/plugins/bigint-serializer.ts
export default defineNitroPlugin(() => {
  // BigInt не сериализуется через JSON.stringify по умолчанию.
  // Добавляем toJSON, чтобы h3 мог возвращать BigInt в JSON-ответах.
  if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
  }
});