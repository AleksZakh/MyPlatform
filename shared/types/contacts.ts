export interface ContactDTO {
  id: string;
  fullName: string;
  telephoneNumber: string;
  email: string;
  department: string;
  position: string;
}

export interface ContactsResponse {
  contacts: ContactDTO[];
  lastUpdated: string;
}
