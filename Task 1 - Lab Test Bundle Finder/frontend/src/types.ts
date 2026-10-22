export interface LabTest {
  id: string;
  code: string;
  name: string;
  price: number | null;
  status: boolean;
}

export interface LabPackage {
  id: string;
  name: string;
  price: number;
  testIds: string[];
  status: boolean;
}

export interface PlanItem {
  type: "package" | "test";
  id: string;
  name: string;
  price: number;
  covers: string[];
}

export interface PlanResult {
  items: PlanItem[];
  total: number;
  extraTests: string[];
  individualTotal: number | null;
  savings: number | null;
}

export interface ApiError {
  error: string;
  testIds: string[];
}
