export interface Categoria {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly parentId?: string;
  readonly order?: number;
}
