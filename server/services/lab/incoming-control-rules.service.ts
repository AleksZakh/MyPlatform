interface IncomingControlDates {
  qualityDocumentDate?: Date | null;
  samplingDate: Date;
  receiptDate: Date;
  protocolDate?: Date | null;
}

export function validateIncomingControlDates(
  dates: IncomingControlDates,
): void {

  const {
    qualityDocumentDate,
    samplingDate,
    receiptDate,
    protocolDate,
  } = dates;


  if (
    qualityDocumentDate &&
    qualityDocumentDate > samplingDate
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid date sequence',
      message:
        'Дата отбора проб не может быть раньше даты документа о качестве.',
    });
  }


  if (
    samplingDate > receiptDate
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid date sequence',
      message:
        'Дата поступления материала не может быть раньше даты отбора проб.',
    });
  }


  if (
    protocolDate &&
    protocolDate < receiptDate
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid date sequence',
      message:
        'Дата протокола испытаний не может быть раньше даты поступления материала.',
    });
  }
}