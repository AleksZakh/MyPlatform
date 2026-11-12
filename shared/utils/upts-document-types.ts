/** Stable colours, readable short labels and portable archive folder codes. */
const styles:Record<string,{label:string;code:string;background:string;color:string}>={
 'Чертёж':{label:'Чертёж',code:'DRAW',background:'#a7e3cc',color:'#123f32'},
 'Межевой план':{label:'МП',code:'MP',background:'#bdd9ff',color:'#163d70'},
 'Схема':{label:'Схема',code:'SCHEME',background:'#ffe2a8',color:'#65420c'},
 'Выписка из ЕГРН':{label:'ЕГРН',code:'EGRN',background:'#e0e7ef',color:'#334155'},
 'Технический план':{label:'ТП',code:'TP',background:'#d6ccf6',color:'#493477'},
 'Отчёт':{label:'Отчёт',code:'REPORT',background:'#bde8ee',color:'#164a55'},
 'Приостановка/отказ Росреестра':{label:'Отказ',code:'REFUSAL',background:'#f4c4c4',color:'#752c2c'},
 'КУВД':{label:'КУВД',code:'KUVD',background:'#f5d3a6',color:'#663c12'},
 'Результаты измерений':{label:'Измер.',code:'MEASURE',background:'#c9e5b5',color:'#354d20'},
 'Акт обследования':{label:'Акт обсл.',code:'INSPECT',background:'#cce7db',color:'#315343'},
 'Акт выполненных работ':{label:'Акт работ',code:'ACT',background:'#d8dfb8',color:'#424d22'},
 'Подписанный комплект':{label:'Комплект',code:'PACK',background:'#edcfe3',color:'#633350'},
 'XML-схема':{label:'XML',code:'XML',background:'#d2e0f7',color:'#304c77'},
 'Итоговый документ':{label:'Итог',code:'RESULT',background:'#d7d9ed',color:'#3b3f61'},
 'Иное':{label:'Иное',code:'OTHER',background:'#e3e5e8',color:'#3e4651'},
};
export function documentTypeStyle(type:string){return styles[type]||{label:type.length>12?type.slice(0,11)+'…':type,code:'OTHER',background:'#e3e5e8',color:'#3e4651'};}
