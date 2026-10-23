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

export interface LabCatalog {
    tests: LabTest[];
    packages: LabPackage[];
    examples?: Array<{
        request: { testIds: string[] };
        response: unknown;
    }>;
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
}