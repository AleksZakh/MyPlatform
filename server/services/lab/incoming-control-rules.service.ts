// server/services/lab/incoming-control-rules.service.ts

import {
  createError,
} from 'h3'

import {
  z,
} from 'zod'


const nullableText =
  z.string()
    .trim()
    .nullable()
    .optional()
    .transform(
      value =>
        value || null,
    )


const protocolSchema =
  z.object({
    protocolNumber:
      z.string()
        .trim()
        .default(''),

    protocolDate:
      nullableText,

    testResult:
      z.string()
        .trim()
        .default(''),

    note:
      z.string()
        .default(''),
  })


const incomingControlPayloadSchema =
  z.object({
    samplingTest:
      z.object({
        samplingActNumber:
          z.string()
            .trim()
            .min(
              1,
              'Номер акта отбора проб обязателен',
            ),

        samplingDate:
          z.string()
            .trim()
            .min(
              1,
              'Дата отбора проб обязательна',
            ),

        note:
          z.string()
            .default(''),

        plpName:
          z.string()
            .trim()
            .min(
              1,
              'ПЛП обязателен',
            ),

        testObjectName:
          z.string()
            .trim()
            .min(
              1,
              'Объект обязателен',
            ),

        testLocationName:
          z.string()
            .trim()
            .min(
              1,
              'Место отбора проб обязательно',
            ),

        inspectorName:
          z.string()
            .trim()
            .min(
              1,
              'Лицо, предоставившее пробу, обязательно',
            ),
      }),

    receiptMaterial:
      z.object({
        materialName:
          z.string()
            .trim()
            .min(
              1,
              'Материал обязателен',
            ),

        manufacturerName:
          nullableText,

        receiptDate:
          z.string()
            .trim()
            .min(
              1,
              'Дата поступления материала обязательна',
            ),

        qualityDocumentDate:
          nullableText,

        qualityDocumentNumber:
          nullableText,

        note:
          z.string()
            .default(''),
      }),

    testProtocol:
      protocolSchema
        .nullable(),
  })


export type IncomingControlPayload =
  z.infer<
    typeof incomingControlPayloadSchema
  >


export type IncomingControlDates = {
  samplingDate: Date
  receiptDate: Date
  qualityDocumentDate: Date | null
  protocolDate?: Date | null
}


function badRequest(
  message: string,
): never {
  throw createError({
    statusCode: 400,
    statusMessage: message,
    message,
  })
}


export function parseIncomingControlPayload(
  rawPayload:
    | string
    | undefined,
): IncomingControlPayload {
  if (!rawPayload) {
    return badRequest(
      'В запросе отсутствует payload',
    )
  }


  let json: unknown

  try {
    json =
      JSON.parse(rawPayload)
  } catch {
    return badRequest(
      'Некорректный JSON в payload',
    )
  }


  const result =
    incomingControlPayloadSchema
      .safeParse(json)


  if (!result.success) {
    const message =
      result.error.issues
        .map(
          issue =>
            `${issue.path.join('.')}: ${issue.message}`,
        )
        .join('; ')

    return badRequest(
      `Некорректные данные формы: ${message}`,
    )
  }


  return result.data
}


/**
 * API формы отправляет YYYY-MM-DD.
 * Также терпим ISO-строку, но сохраняем именно календарную дату.
 */
export function parseBusinessDate(
  value:
    | string
    | null
    | undefined,
  fieldName: string,
  required = true,
): Date | null {
  if (!value) {
    if (required) {
      return badRequest(
        `Поле "${fieldName}" обязательно`,
      )
    }

    return null
  }


  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    )


  if (!match) {
    return badRequest(
      `Некорректная дата "${fieldName}": ${value}`,
    )
  }


  const year =
    Number(match[1])

  const month =
    Number(match[2])

  const day =
    Number(match[3])


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    )


  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !== day
  ) {
    return badRequest(
      `Некорректная дата "${fieldName}": ${value}`,
    )
  }


  return date
}


export function getPayloadDates(
  payload:
    IncomingControlPayload,
): IncomingControlDates {
  return {
    samplingDate:
      parseBusinessDate(
        payload.samplingTest
          .samplingDate,
        'Дата отбора проб',
        true,
      )!,

    receiptDate:
      parseBusinessDate(
        payload.receiptMaterial
          .receiptDate,
        'Дата поступления материала',
        true,
      )!,

    qualityDocumentDate:
      parseBusinessDate(
        payload.receiptMaterial
          .qualityDocumentDate,
        'Дата документа о качестве',
        false,
      ),

    protocolDate:
      payload.testProtocol
        ? parseBusinessDate(
            payload.testProtocol
              .protocolDate,
            'Дата протокола',
            false,
          )
        : null,
  }
}


/**
 * Новая запись без протокола:
 *
 * qualityDocumentDate <= samplingDate <= receiptDate
 *
 * Если документа о качестве нет:
 *
 * samplingDate <= receiptDate
 */
export function assertBaseChronology(
  dates:
    Pick<
      IncomingControlDates,
      | 'samplingDate'
      | 'receiptDate'
      | 'qualityDocumentDate'
    >,
): void {
  const {
    samplingDate,
    receiptDate,
    qualityDocumentDate,
  } = dates


  if (
    qualityDocumentDate &&
    qualityDocumentDate >
      samplingDate
  ) {
    badRequest(
      'Дата документа о качестве не может быть позже даты отбора проб',
    )
  }


  if (
    samplingDate >
    receiptDate
  ) {
    badRequest(
      'Дата отбора проб не может быть позже даты поступления материала',
    )
  }
}


/**
 * Полная цепочка:
 *
 * qualityDocumentDate <= samplingDate <= receiptDate <= protocolDate
 */
export function assertFullChronology(
  dates:
    IncomingControlDates,
): void {
  assertBaseChronology(
    dates,
  )


  if (!dates.protocolDate) {
    badRequest(
      'Для проверки хронологии требуется дата протокола',
    )
  }


  if (
    dates.receiptDate >
    dates.protocolDate
  ) {
    badRequest(
      'Дата протокола не может быть раньше даты поступления материала',
    )
  }
}


export function assertNewProtocolComplete(
  payload:
    IncomingControlPayload,
  hasProtocolDocumentFile:
    boolean,
): void {
  const protocol =
    payload.testProtocol


  if (!protocol) {
    badRequest(
      'Данные протокола отсутствуют',
    )
  }


  if (
    !protocol.protocolNumber
      .trim()
  ) {
    badRequest(
      'Номер протокола обязателен',
    )
  }


  if (!protocol.protocolDate) {
    badRequest(
      'Дата протокола обязательна',
    )
  }


  if (
    !protocol.testResult
      .trim()
  ) {
    badRequest(
      'Результат испытаний обязателен',
    )
  }


  if (
    !hasProtocolDocumentFile
  ) {
    badRequest(
      'Для нового протокола обязателен файл документа',
    )
  }
}


export function sameBusinessDate(
  left:
    | Date
    | null
    | undefined,
  right:
    | Date
    | null
    | undefined,
): boolean {
  if (!left && !right) {
    return true
  }


  if (!left || !right) {
    return false
  }


  const leftKey =
    left.toISOString()
      .slice(
        0,
        10,
      )

  const rightKey =
    right.toISOString()
      .slice(
        0,
        10,
      )


  return leftKey === rightKey
}
