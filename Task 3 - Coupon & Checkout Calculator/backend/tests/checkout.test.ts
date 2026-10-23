import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { calculateQuote } from "../src/checkout";

const dataPath = path.resolve(process.cwd(), "data/checkout.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

describe("MedEx checkout examples", () => {
    it.each(data.examples.map((example: any, index: number) => [
        `Example ${index + 1}`,
        example,
    ]))("%s matches its expected response", (_name, example: any) => {
        const actual = calculateQuote(data, example.request);

        expect(actual).toEqual(example.expected);
    });
});