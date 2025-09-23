export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
  isActive: boolean;
  departements: {
    id: string;
    codeDepartement: string;
    libelleDepartement: string;
  }[];
  cellules: {
    id: string;
    codeCellule: string;
    libelleCellule: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export class UserListResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
