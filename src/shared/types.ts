export interface Url {
  id: number;
  original_url: string;
  short_code: string;
  created_at: Date;
  expired_at: Date | null;
}
