export interface Tag {
  id: number;
  name: string;
  category: string;
}

export interface Motorcycle {
  id: number;
  name: string;
  maker: string;
  displacement: number | null;
  year: number | null;
  description: string | null;
  image_url: string | null;
  tags: Tag[];
}
