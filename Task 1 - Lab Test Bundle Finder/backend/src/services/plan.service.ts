import catalogData from "../data/lab-catalog.json";
import type {
  LabCatalog,
  LabTest,
  LabPackage,
  PlanItem,
  PlanResult,
} from "../types/catalog.types";


const catalog = catalogData as LabCatalog;

type Candidate = {
  item: PlanItem;
  mask: number;
  extraCount: number;
};

type State = {
  total: number;
  candidates: Candidate[];
  extraCount: number;
};

function compareIds(a: string[], b: string[]): number {
  const left = [...a].sort().join("	");
  return left.localeCompare(right);
}

function better(a: State, b: State): boolean {
  if (a.total !== b.total) return a.total < b.total;
  if (a.candidates.length !== b.candidates.length) {
    return a.candidates.length < b.candidates.length;
  }
  if (a.extraCount !== b.extraCount) {
    return a.extraCount < b.extraCount;
  }

  return compareIds(
    a.candidates.map((c) => c.item.id),
    b.candidates.map((c) => c.item.id),
  ) < 0;
}

export function getSelectableTests(): LabTest[] {
  return catalog.tests.filter((test) => test.status);
}

export function getAvailablePackages(): LabPackage[] {
  return catalog.packages.filter((pkg) => pkg.status);
}

export function calculatePlan(testIds: string[]): PlanResult {
  const selectedIds = [...new Set(testIds)];
  const selectedSet = new Set(selectedIds);

  const testsById = new Map(catalog.tests.map((test) => [test.id, test]));

  const unknownOrInactive = selectedIds.filter((id) => {
    const test = testsById.get(id);
    return !test || !test.status;
  });

  if (unknownOrInactive.length > 0) {
    throw Object.assign(new Error("INVALID_TESTS"), {
      status: 400,
      testIds: unknownOrInactive.sort(),
    });
  }

  const orderedSelected = selectedIds;
  const fullMask = (1 << orderedSelected.length) - 1;

  const candidates: Candidate[] = [];

  for (const pkg of getAvailablePackages()) {
    // Deduplicate package test IDs and ignore IDs missing from the catalog.
    const packageTestIds = new Set(pkg.testIds);
    const coveredIds = orderedSelected.filter((id) =>
      packageTestIds.has(id),
    );

    if (coveredIds.length === 0) continue;

    const extraCount = [...packageTestIds].filter((id) => {
      const test = testsById.get(id);
      return Boolean(test?.status && !selectedSet.has(id));
    }).length;

    candidates.push({
      item: {
        type: "package",
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        covers: coveredIds,
      },
      mask: coveredIds.reduce(
        (mask, id) => mask | (1 << orderedSelected.indexOf(id)),
        0,
      ),
      extraCount,
    });
  }

  for (const id of orderedSelected) {
    const test = testsById.get(id)!;
    if (test.price === null) continue;

    candidates.push({
      item: {
        type: "test",
        id: test.id,
        name: test.name,
        price: test.price,
        covers: [id],
      },
      mask: 1 << orderedSelected.indexOf(id),
      extraCount: 0,
    });
  }

  // DP retains the cheapest plan for each covered-test mask.
  const dp = new Map<number, State>();
  dp.set(0, { total: 0, candidates: [], extraCount: 0 });

  for (const candidate of candidates) {
    const previousStates = [...dp.entries()];

    for (const [mask, state] of previousStates) {
      const nextMask = mask | candidate.mask;

      // Never buy two items that cover exactly the same selected tests
      // without adding any new coverage.
      if (nextMask === mask) continue;

      const next: State = {
        total: state.total + candidate.item.price,
        candidates: [...state.candidates, candidate],
        extraCount: state.extraCount + candidate.extraCount,
      };

      const current = dp.get(nextMask);
      if (!current || better(next, current)) {
        dp.set(nextMask, next);
      }
    }
  }

  const best = dp.get(fullMask);

  if (!best) {
    const unavailable = orderedSelected.filter((id) => {
      const test = testsById.get(id)!;

      const canBuyIndividually = test.price !== null;
      const canGetFromPackage = getAvailablePackages().some((pkg) =>
        pkg.testIds.includes(id),
      );

      return !canBuyIndividually && !canGetFromPackage;
    });

    throw Object.assign(new Error("NOT_AVAILABLE"), {
      status: 422,
      testIds: unavailable.sort(),
    });
  }

  const selectedOrder = new Map(
    orderedSelected.map((id, index) => [id, index]),
  );

  const items = best.candidates
    .map((candidate) => candidate.item)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => ({
      ...item,
      covers: [...item.covers].sort(
        (a, b) => selectedOrder.get(a)! - selectedOrder.get(b)!,
      ),
    }));

  const individualTotal = orderedSelected.reduce<number | null>(
    (total, id) => {
      const price = testsById.get(id)!.price;
      return total === null || price === null ? null : total + price;
    },
    0,
  );

  const coveredIds = new Set(
    items.flatMap((item) => {
      if (item.type === "test") return item.covers;
      const pkg = catalog.packages.find((p) => p.id === item.id);
      return pkg?.testIds ?? [];
    }),
  );

  const extraTests = [...coveredIds]
    .filter((id) => !selectedSet.has(id))
    .filter((id) => testsById.get(id)?.status)
    .sort();

  return {
    items,
    total: best.total,
    extraTests,
    individualTotal,
    savings:
      individualTotal === null ? null : individualTotal - best.total,
  };
}
