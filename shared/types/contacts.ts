export interface ContactDTO {
  id: string;
  fullName: string;
  telephoneNumber: string;
  email: string;
  department: string;
  position: string;
  city: string;
  address: string;
  room: string;
  mobilePhone: string;
  avatarUrl: string | null;
  canEdit: boolean;
}

export interface ContactsResponse {
  contacts: ContactDTO[];
  lastUpdated: string;
}
