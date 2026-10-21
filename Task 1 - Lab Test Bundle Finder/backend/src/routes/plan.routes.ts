import { Router } from "express";
import {
  calculatePlan,
  getAvailablePackages,
  getSelectableTests,
} from "../services/plan.service";


const router = Router();

router.get("/tests", (_req, res) => {
  res.json(getSelectableTests());
});

router.get("/packages", (_req, res) => {
  res.json(getAvailablePackages());
});

router.post("/plan", (req, res) => {
  const { testIds } = req.body ?? {};

  if (!Array.isArray(testIds) || testIds.length === 0) {
    return res.status(400).json({
      error: "EMPTY_SELECTION",
      testIds: [],
    });
  }

  if (!testIds.every((id: unknown) => typeof id === "string")) {
    return res.status(400).json({
      error: "INVALID_TESTS",
      testIds: [],
    });
  }

  try {
    return res.status(200).json(calculatePlan(testIds));
  } catch (error) {
    const apiError = error as Error & {
      status?: number;
      testIds?: string[];
    };

    if (apiError.status === 400 || apiError.status === 422) {
      return res.status(apiError.status).json({
        error: apiError.message,
        testIds: apiError.testIds ?? [],
      });
    }

    return res.status(500).json({
      error: "INTERNAL_ERROR",
      testIds: [],
    });
  }
});

export default router;
