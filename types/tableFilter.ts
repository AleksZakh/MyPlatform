export interface ITableFilter {
    /** Exact catalog choices; absent in old substring-based templates. */
    exactFields?: string[];
    plp: string | null;
    objName:string | null;
    samplActNumber: string | null;
    sDateStart: string | null;
    sDateEnd: string | null;
    sPlace: string | null;
    sProvaider: string | null;
    //----------------------------
    receiveDateStart: string | null;
    receiveDateEnd: string | null;
    materialName: string | string[] | null;
    qualiDateStart: string | null;
    qualiDateEnd: string | null;
    qualiDocNumber: string | null;
    manufacturer: string | null;
    //----------------------------
    testReportDataStart: string | null;
    testReportDataEnd: string | null;
    testResult: string | null;
    testProtocolNumber: string | null;
}