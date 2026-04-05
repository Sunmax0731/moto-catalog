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
  max_power: number | null;
  max_torque: number | null;
  seat_height: number | null;
  description: string | null;
  fuel_economy: number | null;
  image_url: string | null;
  tags: Tag[];
}

export interface RangeFilter {
  min: string;
  max: string;
}
