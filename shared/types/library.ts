export interface LibraryCategory {
  id: number;
  name: string;
  parentId: number | null;
  icon: string;
  iconAssetId: string | null;
  position: number;
  count: number;
}
export interface LibraryBook {
  id: number;
  title: string;
  author: string;
  publisher: string;
  year: string;
  city: string;
  keywords: string;
  note: string;
  series: string;
  issue: string;
  pdfId: string;
  coverId: string | null;
  version: number;
  deletedAt: string | null;
  categories: { categoryId: number }[];
}
export interface LibraryList {
  books: LibraryBook[];
  total: number;
  page: number;
}
