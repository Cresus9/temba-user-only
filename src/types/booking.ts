export interface BookingLineItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
}

