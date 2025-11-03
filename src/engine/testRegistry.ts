import type { TestConfig } from './testTypes';
import { getalwaTest } from '../tests/getalwa';

const registry: Record<string, TestConfig> = {
	[getalwaTest.id]: getalwaTest,
};

export function getTest(id: string): TestConfig | null {
	return registry[id] ?? null;
}
